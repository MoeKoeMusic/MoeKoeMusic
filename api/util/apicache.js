/**
 * 该缓存中间件文件来源与 [Binaryify/NeteaseCloudMusicApi](ttps://github.com/Binaryify/NeteaseCloudMusicApi)
 */

const url = require('node:url');
const MemoryCache = require('./memory-cache');

const t = {
  ms: 1,
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 3600000 * 24,
  week: 3600000 * 24 * 7,
  month: 3600000 * 24 * 30,
};

const instances = [];

const matches = function (a) {
  return function (b) {
    return a === b;
  };
};

const doesntMatch = function (a) {
  return function (b) {
    return !matches(a)(b);
  };
};

const logDuration = function (d, prefix) {
  const str = d > 1000 ? `${(d / 1000).toFixed(2)}sec` : `${d}ms`;
  return `\x1B[33m- ${prefix ? `${prefix} ` : ''}${str}\x1B[0m`;
};

function getSafeHeaders(res) {
  return res.getHeaders ? res.getHeaders() : res._headers;
}

function ApiCache() {
  const memCache = new MemoryCache();

  const globalOptions = {
    debug: false,
    defaultDuration: 3600000,
    enabled: true,
    appendKey: [],
    jsonp: false,
    redisClient: false,
    headerBlacklist: [],
    statusCodes: {
      include: [],
      exclude: [],
    },
    events: {
      expire: undefined,
    },
    headers: {
      // 'cache-control':  'no-cache' // example of header overwrite
    },
    trackPerformance: false,
  };

  const middlewareOptions = [];
  const instance = this;
  let index = null;
  const timers = {};
  const performanceArray = []; // for tracking cache hit rate

  instances.push(this);
  this.id = instances.length;

  function debug(a, b, c, d) {
    const arr = ['\x1B[36m[apicache]\x1B[0m', a, b, c, d].filter((arg) => {
      return arg !== undefined;
    });
    const debugEnv = process.env.DEBUG && process.env.DEBUG.split(',').includes('apicache');

    return (globalOptions.debug || debugEnv) && console.log.apply(null, arr);
  }

  function shouldCacheResponse(request, response, toggle) {
    const opt = globalOptions;
    const codes = opt.statusCodes;

    if (!response) {
      return false;
    }

    if (toggle && !toggle(request, response)) {
      return false;
    }

    if (codes.exclude && codes.exclude.length && codes.exclude.includes(response.statusCode)) {
      return false;
    }
    if (codes.include && codes.include.length && !codes.include.includes(response.statusCode)) {
      return false;
    }

    return true;
  }

  function addIndexEntries(key, req) {
    const groupName = req.apicacheGroup;

    if (groupName) {
      debug(`group detected "${groupName}"`);
      const group = (index.groups[groupName] = index.groups[groupName] || []);
      group.unshift(key);
    }

    index.all.unshift(key);
  }

  function filterBlacklistedHeaders(headers) {
    return Object.keys(headers)
      .filter((key) => {
        return !globalOptions.headerBlacklist.includes(key);
      })
      .reduce((acc, header) => {
        acc[header] = headers[header];
        return acc;
      }, {});
  }

  function createCacheObject(status, headers, data, encoding) {
    return {
      status,
      headers: filterBlacklistedHeaders(headers),
      data,
      encoding,
      timestamp: new Date().getTime() / 1000, // seconds since epoch.  This is used to properly decrement max-age headers in cached responses.
    };
  }

  function cacheResponse(key, value, duration) {
    const redis = globalOptions.redisClient;
    const expireCallback = globalOptions.events.expire;

    if (redis && redis.connected) {
      try {
        redis.hset(key, 'response', JSON.stringify(value));
        redis.hset(key, 'duration', duration);
        redis.expire(key, duration / 1000, expireCallback || (() => {}));
      } catch (err) {
        debug('[apicache] error in redis.hset()');
      }
    } else {
      memCache.add(key, value, duration, expireCallback);
    }

    // add automatic cache clearing from duration, includes max limit on setTimeout
    timers[key] = setTimeout(() => {
      instance.clear(key, true);
    }, Math.min(duration, 2147483647));
  }

  function accumulateContent(res, content) {
    if (content) {
      if (typeof content == 'string') {
        res._apicache.content = (res._apicache.content || '') + content;
      } else if (Buffer.isBuffer(content)) {
        let oldContent = res._apicache.content;

        if (typeof oldContent === 'string') {
          oldContent = !Buffer.from ? new Buffer(oldContent) : Buffer.from(oldContent);
        }

        if (!oldContent) {
          oldContent = !Buffer.alloc ? Buffer.alloc(0) : Buffer.alloc(0);
        }

        res._apicache.content = Buffer.concat([oldContent, content], oldContent.length + content.length);
      } else {
        res._apicache.content = content;
      }
    }
  }

  function makeResponseCacheable(req, res, next, key, duration, strDuration, toggle) {
    // monkeypatch res.end to create cache object
    res._apicache = {
      write: res.write,
      writeHead: res.writeHead,
      end: res.end,
      cacheable: true,
      content: undefined,
    };

    // append header overwrites if applicable
    Object.keys(globalOptions.headers).forEach((name) => {
      res.setHeader(name, globalOptions.headers[name]);
    });

    res.writeHead = function () {
      // add cache control headers
      if (!globalOptions.headers['cache-control']) {
        if (shouldCacheResponse(req, res, toggle)) {
          res.setHeader('cache-control', `max-age=${(duration / 1000).toFixed(0)}`);
        } else {
          res.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
        }
      }

      res._apicache.headers = Object.assign({}, getSafeHeaders(res));
      return res._apicache.writeHead.apply(this, arguments);
    };

    // patch res.write
    res.write = function (content) {
      accumulateContent(res, content);
      return res._apicache.write.apply(this, arguments);
    };

    // patch res.end
    res.end = function (content, encoding) {
      if (shouldCacheResponse(req, res, toggle)) {
        accumulateContent(res, content);

        if (res._apicache.cacheable && res._apicache.content) {
          addIndexEntries(key, req);
          const headers = res._apicache.headers || getSafeHeaders(res);
          const cacheObject = createCacheObject(res.statusCode, headers, res._apicache.content, encoding);
          cacheResponse(key, cacheObject, duration);

          // display log entry
          const elapsed = new Date() - req.apicacheTimer;
          debug(`adding cache entry for "${key}" @ ${strDuration}`, logDuration(elapsed));
          debug('_apicache.headers: ', res._apicache.headers);
          debug('res.getHeaders(): ', getSafeHeaders(res));
          debug('cacheObject: ', cacheObject);
        }
      }

      return res._apicache.end.apply(this, arguments);
    };

    next();
  }

  function sendCachedResponse(request, response, cacheObject, toggle, next, duration) {
    if (toggle && !toggle(request, response)) {
      return next();
    }

    const headers = getSafeHeaders(response);

    Object.assign(headers, filterBlacklistedHeaders(cacheObject.headers || {}), {
      // set properly-decremented max-age header.  This ensures that max-age is in sync with the cache expiration.
      'cache-control': `max-age=${Math.max(0, (duration / 1000 - (new Date().getTime() / 1000 - cacheObject.timestamp)).toFixed(0))}`,
    });

    // only embed apicache headers when not in production environment

    // unstringify buffers
    let data = cacheObject.data;
    if (data && data.type === 'Buffer') {
      data = typeof data.data === 'number' ? new Buffer.alloc(data.data) : new Buffer.from(data.data);
    }

    // test Etag against If-None-Match for 304
    const cachedEtag = cacheObject.headers.etag;
    const requestEtag = request.headers['if-none-match'];

    if (requestEtag && cachedEtag === requestEtag) {
      response.writeHead(304, headers);
      return response.end();
    }

    response.writeHead(cacheObject.status || 200, headers);

    return response.end(data, cacheObject.encoding);
  }

  function syncOptions() {
    for (const i in middlewareOptions) {
      Object.assign(middlewareOptions[i].options, globalOptions, middlewareOptions[i].localOptions);
    }
  }

  this.clear = function (target, isAutomatic) {
    const group = index.groups[target];
    const redis = globalOptions.redisClient;

    if (group) {
      debug(`clearing group "${target}"`);

      group.forEach((key) => {
        debug(`clearing cached entry for "${key}"`);
        clearTimeout(timers[key]);
        delete timers[key];
        if (!globalOptions.redisClient) {
          memCache.delete(key);
        } else {
          try {
            redis.del(key);
          } catch (err) {
            console.log(`[apicache] error in redis.del("${key}")`);
          }
        }
        index.all = index.all.filter(doesntMatch(key));
      });

      delete index.groups[target];
    } else if (target) {
      debug(`clearing ${isAutomatic ? 'expired' : 'cached'} entry for "${target}"`);
      clearTimeout(timers[target]);
      delete timers[target];
      // clear actual cached entry
      if (!redis) {
        memCache.delete(target);
      } else {
        try {
          redis.del(target);
        } catch (err) {
          console.log(`[apicache] error in redis.del("${target}")`);
        }
      }

      // remove from global index
      index.all = index.all.filter(doesntMatch(target));

      // remove target from each group that it may exist in
      Object.keys(index.groups).forEach((groupName) => {
        index.groups[groupName] = index.groups[groupName].filter(doesntMatch(target));

        // delete group if now empty
        if (!index.groups[groupName].length) {
          delete index.groups[groupName];
        }
      });
    } else {
      debug('clearing entire index');

      if (!redis) {
        memCache.clear();
      } else {
        // clear redis keys one by one from internal index to prevent clearing non-apicache entries
        index.all.forEach((key) => {
          clearTimeout(timers[key]);
          delete timers[key];
          try {
            redis.del(key);
          } catch (err) {
            console.log(`[apicache] error in redis.del("${key}")`);
          }
        });
      }
      this.resetIndex();
    }

    return this.getIndex();
  };

  function parseDuration(duration, defaultDuration) {
    if (typeof duration === 'number') {
      return duration;
    }

    if (typeof duration === 'string') {
      const split = duration.match(/^([\d\.,]+)\s?(\w+)$/);

      if (split.length === 3) {
        const len = Number.parseFloat(split[1]);
        let unit = split[2].replace(/s$/i, '').toLowerCase();
        if (unit === 'm') {
          unit = 'ms';
        }

        return (len || 1) * (t[unit] || 0);
      }
    }

    return defaultDuration;
  }

  this.getDuration = function (duration) {
    return parseDuration(duration, globalOptions.defaultDuration);
  };

  /**
   * Return cache performance statistics (hit rate).  Suitable for putting into a route:
   * <code>
   * app.get('/api/cache/performance', (req, res) => {
   *    res.json(apicache.getPerformance())
   * })
   * </code>
   */
  this.getPerformance = function () {
    return performanceArray.map((p) => {
      return p.report();
    });
  };

  this.getIndex = function (group) {
    if (group) {
      return index.groups[group];
    } else {
      return index;
    }
  };

  this.middleware = function cache(strDuration, middlewareToggle, localOptions) {
    const duration = instance.getDuration(strDuration);
    const opt = {};

    middlewareOptions.push({
      options: opt,
    });

    const options = function (localOptions) {
      if (localOptions) {
        middlewareOptions.find((middleware) => {
          return middleware.options === opt;
        }).localOptions = localOptions;
      }

      syncOptions();

      return opt;
    };

    options(localOptions);

    /**
     * A Function for non tracking performance
     */
    function NOOPCachePerformance() {
      this.report = this.hit = this.miss = function () {}; // noop;
    }

    /**
     * A function for tracking and reporting hit rate.  These statistics are returned by the getPerformance() call above.
     */
    function CachePerformance() {
      /**
       * Tracks the hit rate for the last 100 requests.
       * If there have been fewer than 100 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast100 = new Uint8Array(100 / 4); // each hit is 2 bits

      /**
       * Tracks the hit rate for the last 1000 requests.
       * If there have been fewer than 1000 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast1000 = new Uint8Array(1000 / 4); // each hit is 2 bits

      /**
       * Tracks the hit rate for the last 10000 requests.
       * If there have been fewer than 10000 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast10000 = new Uint8Array(10000 / 4); // each hit is 2 bits

      /**
       * Tracks the hit rate for the last 100000 requests.
       * If there have been fewer than 100000 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast100000 = new Uint8Array(100000 / 4); // each hit is 2 bits

      /**
       * The number of calls that have passed through the middleware since the server started.
       */
      this.callCount = 0;

      /**
       * The total number of hits since the server started
       */
      this.hitCount = 0;

      /**
       * The key from the last cache hit.  This is useful in identifying which route these statistics apply to.
       */
      this.lastCacheHit = null;

      /**
       * The key from the last cache miss.  This is useful in identifying which route these statistics apply to.
       */
      this.lastCacheMiss = null;

      /**
       * Return performance statistics
       */
      this.report = function () {
        return {
          lastCacheHit: this.lastCacheHit,
          lastCacheMiss: this.lastCacheMiss,
          callCount: this.callCount,
          hitCount: this.hitCount,
          missCount: this.callCount - this.hitCount,
          hitRate: this.callCount == 0 ? null : this.hitCount / this.callCount,
          hitRateLast100: this.hitRate(this.hitsLast100),
          hitRateLast1000: this.hitRate(this.hitsLast1000),
          hitRateLast10000: this.hitRate(this.hitsLast10000),
          hitRateLast100000: this.hitRate(this.hitsLast100000),
        };
      };

      /**
       * Computes a cache hit rate from an array of hits and misses.
       * @param {Uint8Array} array An array representing hits and misses.
       * @returns a number between 0 and 1, or null if the array has no hits or misses
       */
      this.hitRate = function (array) {
        let hits = 0;
        let misses = 0;
        for (let i = 0; i < array.length; i++) {
          let n8 = array[i];
          for (j = 0; j < 4; j++) {
            switch (n8 & 3) {
              case 1:
                hits++;
                break;
              case 2:
                misses++;
                break;
            }
            n8 >>= 2;
          }
        }
        const total = hits + misses;
        if (total == 0) {
          return null;
        }
        return hits / total;
      };

      /**
       * Record a hit or miss in the given array.  It will be recorded at a position determined
       * by the current value of the callCount variable.
       * @param {Uint8Array} array An array representing hits and misses.
       * @param {boolean} hit true for a hit, false for a miss
       * Each element in the array is 8 bits, and encodes 4 hit/miss records.
       * Each hit or miss is encoded as to bits as follows:
       * 00 means no hit or miss has been recorded in these bits
       * 01 encodes a hit
       * 10 encodes a miss
       */
      this.recordHitInArray = function (array, hit) {
        const arrayIndex = ~~(this.callCount / 4) % array.length;
        const bitOffset = (this.callCount % 4) * 2; // 2 bits per record, 4 records per uint8 array element
        const clearMask = ~(3 << bitOffset);
        const record = (hit ? 1 : 2) << bitOffset;
        array[arrayIndex] = (array[arrayIndex] & clearMask) | record;
      };

      /**
       * Records the hit or miss in the tracking arrays and increments the call count.
       * @param {boolean} hit true records a hit, false records a miss
       */
      this.recordHit = function (hit) {
        this.recordHitInArray(this.hitsLast100, hit);
        this.recordHitInArray(this.hitsLast1000, hit);
        this.recordHitInArray(this.hitsLast10000, hit);
        this.recordHitInArray(this.hitsLast100000, hit);
        if (hit) {
          this.hitCount++;
        }
        this.callCount++;
      };

      /**
       * Records a hit event, setting lastCacheMiss to the given key
       * @param {string} key The key that had the cache hit
       */
      this.hit = function (key) {
        this.recordHit(true);
        this.lastCacheHit = key;
      };

      /**
       * Records a miss event, setting lastCacheMiss to the given key
       * @param {string} key The key that had the cache miss
       */
      this.miss = function (key) {
        this.recordHit(false);
        this.lastCacheMiss = key;
      };
    }

    const perf = globalOptions.trackPerformance ? new CachePerformance() : new NOOPCachePerformance();

    performanceArray.push(perf);

    const cache = function (req, res, next) {
      function bypass() {
        debug('bypass detected, skipping cache.');
        return next();
      }

      // initial bypass chances
      if (!opt.enabled) {
        return bypass();
      }
      if (req.headers['x-apicache-bypass'] || req.headers['x-apicache-force-fetch']) {
        return bypass();
      }

      // REMOVED IN 0.11.1 TO CORRECT MIDDLEWARE TOGGLE EXECUTE ORDER
      // if (typeof middlewareToggle === 'function') {
      //   if (!middlewareToggle(req, res)) return bypass()
      // } else if (middlewareToggle !== undefined && !middlewareToggle) {
      //   return bypass()
      // }

      // embed timer
      req.apicacheTimer = new Date();

      // In Express 4.x the url is ambigious based on where a router is mounted.  originalUrl will give the full Url
      let key = req.hostname + (req.originalUrl || req.url);
      // Remove querystring from key if jsonp option is enabled
      if (opt.jsonp) {
        key = url.parse(key).pathname;
      }

      // add appendKey (either custom function or response path)
      if (typeof opt.appendKey === 'function') {
        key += `$$appendKey=${opt.appendKey(req, res)}`;
      } else if (opt.appendKey.length > 0) {
        let appendKey = req;

        for (let i = 0; i < opt.appendKey.length; i++) {
          appendKey = appendKey[opt.appendKey[i]];
        }
        key += `$$appendKey=${appendKey}`;
      }

      // attempt cache hit
      const redis = opt.redisClient;
      const cached = !redis ? memCache.getValue(key) : null;

      // send if cache hit from memory-cache
      if (cached) {
        const elapsed = new Date() - req.apicacheTimer;
        debug('sending cached (memory-cache) version of', key, logDuration(elapsed));

        perf.hit(key);
        return sendCachedResponse(req, res, cached, middlewareToggle, next, duration);
      }

      // send if cache hit from redis
      if (redis && redis.connected) {
        try {
          redis.hgetall(key, (err, obj) => {
            if (!err && obj && obj.response) {
              const elapsed = new Date() - req.apicacheTimer;
              debug('sending cached (redis) version of', key, logDuration(elapsed));

              perf.hit(key);
              return sendCachedResponse(req, res, JSON.parse(obj.response), middlewareToggle, next, duration);
            } else {
              perf.miss(key);
              return makeResponseCacheable(req, res, next, key, duration, strDuration, middlewareToggle);
            }
          });
        } catch (err) {
          // bypass redis on error
          perf.miss(key);
          return makeResponseCacheable(req, res, next, key, duration, strDuration, middlewareToggle);
        }
      } else {
        perf.miss(key);
        return makeResponseCacheable(req, res, next, key, duration, strDuration, middlewareToggle);
      }
    };

    cache.options = options;

    return cache;
  };

  this.options = function (options) {
    if (options) {
      Object.assign(globalOptions, options);
      syncOptions();

      if ('defaultDuration' in options) {
        // Convert the default duration to a number in milliseconds (if needed)
        globalOptions.defaultDuration = parseDuration(globalOptions.defaultDuration, 3600000);
      }

      if (globalOptions.trackPerformance) {
        debug('WARNING: using trackPerformance flag can cause high memory usage!');
      }

      return this;
    } else {
      return globalOptions;
    }
  };

  this.resetIndex = function () {
    index = {
      all: [],
      groups: {},
    };
  };

  this.newInstance = function (config) {
    const instance = new ApiCache();

    if (config) {
      instance.options(config);
    }

    return instance;
  };

  this.clone = function () {
    return this.newInstance(this.options());
  };

  // initialize index
  this.resetIndex();
}

module.exports = new ApiCache();
