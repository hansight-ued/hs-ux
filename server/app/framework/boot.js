const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync;
const Koa = require('koa');
const { loadConfig } = require('./config');
const { registerRouter } = require('./router');
const logger = require('./logger');
const { getConnection } = require('./db');
const { extendContext } = require('./context');
const { initSession } = require('./session');
const { initStatic } = require('./static');
const { getRedisClient } = require('./redis');
const { Hash } = require('./hash');
const util = require('./util');

function bootstrap(options = {}) {

  (async function run() {
    const config = await loadConfig(logger);
    logger.level = process.env['LOG_LEVEL'] || config.log.level;
    const db = await getConnection(config.db, logger);
    logger.info('database initialized');
    const app = new Koa();
    app.keys = [ config.app.secretKey ];
    app.config = app.context.config = config;
    app.util = app.context.util = util;
    app.logger = app.context.logger = logger;
    app.hash = app.context.hash = new Hash(app, config.hash || {});
    app.db = app.context.db = db.manager;
    if (config.session.type === 'redis') {
      const redis = await getRedisClient(config.redis, logger);
      app.redis = app.context.redis = redis;
    }
    await extendContext(app);
    /*
     * 静态文件不需要会话鉴权，首先注册
     * 然后是会话、proxy
     * 最后是业务路由
     */
    await initStatic(app, config.static);
    await initSession(app, config.session);
    options.beforeStart && (await options.beforeStart(app));
    await registerRouter(app, config.router);

    app.listen(config.server.port, config.server.host, () => {
      logger.info(`server listen at ${config.server.host}:${config.server.port}`);
    });
    app.on('error', err => {
      logger.error(err);
    });

  })().catch(ex => {
    logger.error(ex);
    options.onError && options.onError(ex);
  });

}

module.exports = bootstrap;
