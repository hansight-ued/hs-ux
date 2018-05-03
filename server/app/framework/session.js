const koaSession = require('koa-session');
const _ = require('lodash');
const config = require('./config');
const logger = require('./logger');

let Session = null;
let User = null;

class SessionStore {
  constructor(app, sessCfg) {
    this._expire = sessCfg.expire || 60000;
    this._redis = sessCfg.type === 'redis' ? app.redis : null;
  }
  get(key) {
    return this._redis ? Session.getRedis(key, this._redis) : Session.get(key);
  }
  set(key, sess, maxAge) {
    const expire = _.isNumber(maxAge) ? Math.max(maxAge, this._expire) : this._expire;
    return this._redis ? Session.setRedis(key, sess, expire, this._redis) : Session.set(key, sess, expire);
  }
  destroy(key) {
    return this._redis ? Session.destroyRedis(key) : Session.destroy(key);
  }
}

async function sessionHandler(ctx, next) {
  if (ctx.session.userId) {
    ctx.state.user = new User();
    ctx.state.user.id = ctx.session.userId;
  }
  await next();
}

function initSession(app) {
  Session = require(__common + 'model/Session');  
  User = require(__common + 'model/User');
  const sessCfg = config.session;  
  if (sessCfg.DEBUG_SKIP) {
    logger.debug('Skip session auth, use:', sessCfg.DEBUG_SKIP);
    app.use(async (ctx, next) => {
      ctx.state.user = await User.findOne({
        username: sessCfg.DEBUG_SKIP
      });
      await next();
    });
    return;
  }
  app.use(koaSession({
    key: sessCfg.key || 'NODE_SESS',
    maxAge: sessCfg.maxAge || 'session',
    httpOnly: sessCfg.httpOnly !== false,
    signed: sessCfg.signed !== false,
    rolling: sessCfg.rolling !== false,
    store: new SessionStore(app, sessCfg)
  }, app));
  app.use(sessionHandler);
}

/*
 * 用于检查用户是否登录以及是否拥有某些权限的中间介，
 *   接受长度为 N 的动态参数，
 *   并将该数组传递给 User.hasAnyPrivileges
 *   进行权限校验。
 * User.hasAnyPrivilege 用于鉴定给定的权限至少满足其中
 *   一个权限。如果需要鉴定同时满足多个权限，可以使用嵌套子数组。
 * 更多说明参看 ./db.js 里面的 BaseUserModel 类
 */
function authorizeMiddleware(...privileges) {
  return async function(ctx, next) {
    if (!ctx || !ctx.state.user) {
      return ctx.throw(401);
    }
    if (privileges.length > 0 && !(await ctx.state.user.hasAnyPrivilege(privileges))) {
      return ctx.throw(403);
    }
    await next();
  };
}

module.exports = {
  authorizeMiddleware,
  initSession
};
