const Koa = require('koa');
const config = require('./config');
const { registerRouter } = require('./router');
const logger = require('./logger');
const { manager } = require('./db');
const { extendContext } = require('./context');
const { initSession } = require('./session');
const { initStatic } = require('./static');
const { getRedisClient } = require('./redis');

function bootstrap(options = {}) {
  (async function run() {
    await manager.initialize();
    logger.info('database initialized');
    const app = new Koa();
    app.keys = [ config.__secretKey ];
    if (config.session.type === 'redis') {
      const redis = await getRedisClient();
      app.redis = app.context.redis = redis;
    }
    await extendContext(app);
    /*
     * 静态文件不需要会话鉴权，首先注册
     * 然后是会话
     * 最后是业务路由
     */
    if (config.static.enable) {
      await initStatic(app);
    }
    await initSession(app);
    await registerRouter(app);    
    
    options.beforeStart && (await options.beforeStart(app));

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
