const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const express = require('express');
const axios = require('axios');
const decode = require('safe-decode-uri-component');
const { cookieToJson, randomString, getGuid, calculateMid } = require('./util/util');
const { cryptoMd5 } = require('./util/crypto');
const { createRequest } = require('./util/request');
const dotenv = require('dotenv');
const cache = require('./util/apicache').middleware;

/**
 * @typedef {{
 * identifier?: string,
 * route: string,
 * module: any,
 * }}ModuleDefinition
 */

/**
 * @typedef {{
 *  server?: import('http').Server,
 * }} ExpressExtension
 */

const guid = cryptoMd5(getGuid());
const serverDev = randomString(10).toUpperCase();

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}

const DEFAULT_AUDIO_PROXY_ALLOW_HOSTS = ['kugou.com'];
const AUDIO_PROXY_FORWARD_REQUEST_HEADERS = ['range', 'if-range'];
const AUDIO_PROXY_FORWARD_RESPONSE_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified', 'expires'];
const AUDIO_PROXY_ALLOWED_METHODS = ['GET', 'HEAD'];

/**
 * @param {string | undefined} rawHosts
 * @returns {string[]}
 */
function parseAudioProxyAllowHosts(rawHosts) {
  if (!rawHosts) return DEFAULT_AUDIO_PROXY_ALLOW_HOSTS;
  const items = rawHosts
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return items.length > 0 ? items : DEFAULT_AUDIO_PROXY_ALLOW_HOSTS;
}

const audioProxyAllowHosts = parseAudioProxyAllowHosts(process.env.AUDIO_PROXY_ALLOW_HOSTS);

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isAudioProxyHostAllowed(hostname) {
  const host = `${hostname || ''}`.trim().toLowerCase();
  if (!host) return false;
  return audioProxyAllowHosts.some((rule) => host === rule || host.endsWith(`.${rule}`));
}

/**
 * @param {Record<string, string | string[] | undefined>} headers
 * @returns {Record<string, string>}
 */
function pickAudioProxyRequestHeaders(headers) {
  const picked = {};
  for (const header of AUDIO_PROXY_FORWARD_REQUEST_HEADERS) {
    const value = headers[header];
    if (!value) continue;
    picked[header] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return picked;
}

/**
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function isLoggedInRequest(req) {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.trim()) return true;

  const token = typeof req.cookies?.token === 'string' ? req.cookies.token.trim() : '';
  if (token) return true;

  const userid = Number(req.cookies?.userid || 0);
  return Number.isFinite(userid) && userid > 0;
}

/**
 *  描述：动态获取模块定义
 * @param {string}  modulesPath  模块路径(TS)
 * @param {Record<string, string>} specificRoute  特定模块定义
 * @param {boolean} doRequire  如果为 true，则使用 require 加载模块, 否则打印模块路径， 默认为true
 * @return { Promise<ModuleDefinition[]> }
 * @example getModuleDefinitions("./module", {"album_new.js": "/album/create"})
 */
async function getModulesDefinitions(modulesPath, specificRoute, doRequire = true) {
  const files = await fs.promises.readdir(modulesPath);
  const parseRoute = (fileName) =>
    specificRoute && fileName in specificRoute ? specificRoute[fileName] : `/${fileName.replace(/\.(js)$/i, '').replace(/_/g, '/')}`;

  return files
    .reverse()
    .filter((fileName) => fileName.endsWith('.js') && !fileName.startsWith('_'))
    .map((fileName) => {
      const identifier = fileName.split('.').shift();
      const route = parseRoute(fileName);
      const modulePath = path.resolve(modulesPath, fileName);
      const module = doRequire ? require(modulePath) : modulePath;
      return { identifier, route, module };
    });
}

/**
 * 创建服务
 * @param {ModuleDefinition[]} moduleDefs
 * @return {Promise<import('express').Express>}
 */
async function consturctServer(moduleDefs) {
  const app = express();
  const corsAllowOrigin = typeof process.env.CORS_ALLOW_ORIGIN === 'string' ? process.env.CORS_ALLOW_ORIGIN.trim() : '';
  app.set('trust proxy', true);

  /**
   * CORS & Preflight request
   */
  app.use((req, res, next) => {
    const isApiPath = req.path !== '/' && !req.path.includes('.');
    const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
    const requestHost = req.get('host');
    const currentOrigin = requestHost ? `${req.protocol}://${requestHost}` : '';
    const isCrossOrigin = !!requestOrigin && requestOrigin !== currentOrigin;
    const shouldHandleCors = isApiPath && isCrossOrigin && !!corsAllowOrigin;

    if (!shouldHandleCors) {
      next();
      return;
    }

    const isWildcard = corsAllowOrigin === '*';
    const allowOrigin = isWildcard ? requestOrigin : corsAllowOrigin;
    const isOriginAllowed = isWildcard || requestOrigin === corsAllowOrigin;

    if (!isOriginAllowed) {
      if (req.method === 'OPTIONS') {
        res.status(403).end();
        return;
      }
      next();
      return;
    }

    res.set({
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Headers': 'Authorization,Range,If-Range,X-Requested-With,Content-Type,Cache-Control',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
    });

    if (isWildcard) {
      res.set('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  // Cookie Parser
  app.use((req, _, next) => {
    req.cookies = {};
    (req.headers.cookie || '').split(/;\s+|(?<!\s)\s+$/g).forEach((pair) => {
      const crack = pair.indexOf('=');
      if (crack < 1 || crack === pair.length - 1) {
        return;
      }
      req.cookies[decode(pair.slice(0, crack)).trim()] = decode(pair.slice(crack + 1)).trim();
    });
    next();
  });

  // 将当前平台写入Cookie 以方便查看
  app.use((req, res, next) => {
    const cookies = req.cookies || {};
    const isHttps = req.protocol === 'https';
    const cookieSuffix = isHttps ? '; PATH=/; SameSite=None; Secure' : '; PATH=/';

    const ensureCookie = (key, value) => {
      if (Object.prototype.hasOwnProperty.call(cookies, key)) return;
      cookies[key] = String(value);
      res.append('Set-Cookie', `${key}=${cookies[key]}${cookieSuffix}`);
    };

    const mid = calculateMid(process.env.KUGOU_API_GUID ?? guid);
    ensureCookie('KUGOU_API_PLATFORM', process.env.platform);
    ensureCookie('KUGOU_API_MID', mid);
    ensureCookie('KUGOU_API_GUID', process.env.KUGOU_API_GUID ?? guid);
    ensureCookie('KUGOU_API_DEV', (process.env.KUGOU_API_DEV ?? serverDev).toUpperCase());
    ensureCookie('KUGOU_API_MAC', (process.env.KUGOU_API_MAC ?? '02:00:00:00:00:00').toUpperCase());

    req.cookies = cookies;

    next();
  });

  // Body Parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  /**
   * Serving static files
   */
  app.use(express.static(path.join(__dirname, 'public')));

  /**
   * docs
   */

  app.use('/docs', express.static(path.join(__dirname, 'docs')));

  app.all('/audio/proxy', (req, res, next) => {
    if (AUDIO_PROXY_ALLOWED_METHODS.includes(req.method)) {
      next();
      return;
    }
    res.set('Allow', AUDIO_PROXY_ALLOWED_METHODS.join(', '));
    res.status(405).send({ code: 405, data: null, msg: 'Method Not Allowed' });
  });

  const handleAudioProxy = async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
      res.status(400).send({ code: 400, data: null, msg: 'Missing url query parameter' });
      return;
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch (_) {
      res.status(400).send({ code: 400, data: null, msg: 'Invalid audio url' });
      return;
    }

    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      res.status(400).send({ code: 400, data: null, msg: 'Unsupported url protocol' });
      return;
    }

    if (!isAudioProxyHostAllowed(targetUrl.hostname)) {
      res.status(403).send({ code: 403, data: null, msg: 'Audio host is not allowed' });
      return;
    }

    try {
      const requestMethod = req.method === 'HEAD' ? 'HEAD' : 'GET';
      const upstreamResponse = await axios({
        url: targetUrl.toString(),
        method: requestMethod,
        responseType: requestMethod === 'HEAD' ? 'arraybuffer' : 'stream',
        timeout: Number(process.env.AUDIO_PROXY_TIMEOUT || '20000'),
        maxRedirects: 5,
        headers: pickAudioProxyRequestHeaders(req.headers),
        validateStatus: (status) => status >= 200 && status < 400,
      });

      for (const header of AUDIO_PROXY_FORWARD_RESPONSE_HEADERS) {
        const value = upstreamResponse.headers?.[header];
        if (!value) continue;
        res.setHeader(header, value);
      }

      if (isLoggedInRequest(req)) {
        res.setHeader('Cache-Control', 'no-store');
      }

      res.status(upstreamResponse.status);
      if (requestMethod === 'HEAD') {
        res.end();
        return;
      }
      pipeline(upstreamResponse.data, res, (streamErr) => {
        if (streamErr && !res.headersSent) {
          res.status(502).send({ code: 502, data: null, msg: 'Audio stream interrupted' });
        }
      });
    } catch (error) {
      console.warn('[audio/proxy]', targetUrl.toString(), error?.message || error);
      res.status(502).send({ code: 502, data: null, msg: 'Audio proxy request failed' });
    }
  };

  app.get('/audio/proxy', handleAudioProxy);
  app.head('/audio/proxy', handleAudioProxy);

  // Cache
  app.use(cache('2 minutes', (_, res) => res.statusCode === 200));

  const moduleDefinitions = moduleDefs || (await getModulesDefinitions(path.join(__dirname, 'module'), {}));

  for (const moduleDef of moduleDefinitions) {
    app.use(moduleDef.route, async (req, res) => {
      [req.query, req.body].forEach((item) => {
        if (typeof item.cookie === 'string') {
          item.cookie = cookieToJson(decode(item.cookie));
        }
      });

      const { cookie, ...params } = req.query;

      const query = Object.assign({}, { cookie: Object.assign({}, req.cookies, cookie) }, params, { body: req.body });

      const authHeader = req.headers['authorization'];
      if (authHeader) {
        query.cookie = {
          ...query.cookie,
          ...cookieToJson(authHeader),
        };
      }
      try {
        const moduleResponse = await moduleDef.module(query, (config) => {
          let ip = req.ip;
          if (ip.substring(0, 7) === '::ffff:') {
            ip = ip.substring(7);
          }
          config.ip = ip;
          return createRequest(config);
        });

        console.log('[OK]', decode(req.originalUrl));

        const cookies = moduleResponse.cookie;
        if (!query.noCookie) {
          if (Array.isArray(cookies) && cookies.length > 0) {
            if (req.protocol === 'https') {
              // Try to fix CORS SameSite Problem
              res.append(
                'Set-Cookie',
                cookies.map((cookie) => {
                  return `${cookie}; PATH=/; SameSite=None; Secure`;
                })
              );
            } else {
              res.append(
                'Set-Cookie',
                cookies.map((cookie) => {
                  return `${cookie}; PATH=/`;
                })
              );
            }
          }
        }

        res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
      } catch (e) {
        const moduleResponse = e;
        console.log('[ERR]', decode(req.originalUrl), {
          status: moduleResponse.status,
          body: moduleResponse.body,
        });

        if (!moduleResponse.body) {
          res.status(404).send({
            code: 404,
            data: null,
            msg: 'Not Found',
          });
          return;
        }

        res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
      }
    });
  }

  return app;
}

/**
 * Serve the KG API
 * @returns {Promise<import('express').Express & ExpressExtension>}
 */
async function startService() {
  const port = Number(process.env.PORT || '3000');
  const host = process.env.HOST || '';

  const app = await consturctServer();

  /** @type {import('express').Express & ExpressExtension} */
  const appExt = app;

  appExt.service = app.listen(port, host, () => {
    console.log(`server running @ http://${host || 'localhost'}:${port}`);
  });

  return appExt;
}

module.exports = { startService, getModulesDefinitions };
