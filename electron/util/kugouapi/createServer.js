import express from 'express';
import { WebSocketExpress } from 'websocket-express';
import { app } from 'electron';
import cache from 'kugoumusicapi/util/apicache.js'
import api from 'kugoumusicapi';
import { cookieToJson, createRequest } from 'kugoumusicapi/util/index.js';
import { getDevice } from './deviceUtil.js';
import logger from 'electron-log';

const convertModulesToDefs = () => {
    const skips = ['createRequest', 'createCloudRequest', 'startService', 'getModulesDefinitions'];
    const defs = [];
    Object.keys(api).forEach(k => {
        if(skips.includes(k)) return;
        if(api[k]) defs.push({
            identifier: k,
            route: `/${k.replace(/_/g, '/')}`,
            module: api[k]
        });
    });
    return defs;
}

export default () => {
    const expressApp = new WebSocketExpress();

    // 信任反向代理
    expressApp.set('trust proxy', true);

    // 设置标头
    expressApp.useHTTP((req, res, next) => {
        if (req.path !== '/' && !req.path.includes('.')) {
            res.set({
                'Access-Control-Allow-Credentials': true,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Authorization,X-Requested-With,Content-Type,Cache-Control',
                'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
                'Content-Type': 'application/json; charset=utf-8',
                'X-Powered-By': 'kugoumusicapi',
                Server: `${app.getName()}/${app.getVersion()}`
            });
        }
        // OPTIONS 预检请求无需继续处理，直接返回 204
        req.method === 'OPTIONS' ? res.status(204).end() : next();
    });

    // 请求体解析
    expressApp.useHTTP(express.json({ limit: '16mb' }));
    expressApp.useHTTP(express.urlencoded({ extended: false, limit: '5mb' }));
    expressApp.useHTTP(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

    // 缓存 2 分钟
    expressApp.useHTTP(cache.middleware('2 minutes', (_, res) => res.statusCode === 200));


    // 注册 API 路由
    const moduleDefinitions = convertModulesToDefs();
    for (const moduleDef of moduleDefinitions) {
        expressApp.useHTTP(moduleDef.route, async (req, res) => {
            [req.query, req.body].forEach((item) => {
                if (typeof item?.cookie === 'string') {
                    item.cookie = cookieToJson(decode(item.cookie));
                }
            });

            const { cookie, ...params } = req.query;

            const body = Buffer.isBuffer(req.body) ? { data: req.body } : req.body;
            const query = Object.assign({}, { cookie: Object.assign({}, getDevice(), req.cookies, cookie) }, params, body);

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

                const cookies = moduleResponse.cookie;
                if (!query.noCookie) {
                    if (Array.isArray(cookies) && cookies.length > 0) {
                        if (req.protocol === 'https') {
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

                logger.log('内置 API 输出 (来自外部的请求): [OK]', req.originalUrl);
                res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
            } catch (e) {
                const moduleResponse = e;

                if (!moduleResponse.body) {
                    res.status(404).send({ code: 404, data: null, msg: 'Not Found' });
                    return;
                }

                logger.error('内置 API 输出 (来自外部的请求): [ERR]', moduleDef.route, moduleResponse);
                res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
            }
        });
    }

    // 处理索引和 404 路由
    expressApp.useHTTP((req, res) => {
        if(req.path === '/') res.status(204).end();
        else res.status(404).send({ code: 404, data: null, msg: 'Not Found' });
        return;
    });

    return expressApp;
}