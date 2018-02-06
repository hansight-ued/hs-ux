const koaSession = require('koa-session');
const _ = require('lodash');
const path = require('path');

let Session = null;
let User = null;

class SessionStore {
  constructor(app, config) {
    this.logger = app.logger;
    this._expire = config.expire || 60000;
    this._redis = config.type === 'redis' ? app.redis : null;
  }
  get(key, maxAge) {
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
  if(ctx.session.userId){
    ctx.state.user = new User();
    ctx.state.user.id = ctx.session.userId;
  }
  await next();
}

function initSession(app, config) {
  Session = require(__common + 'model/Session');  
  User = require(__common + 'model/User');  
  if (config.DEBUG_SKIP) {
    app.logger.debug('Skip session auth, use:', config.DEBUG_SKIP);
    app.use(async (ctx, next) => {
      ctx.state.user = await User.findOne({
        username: config.DEBUG_SKIP
      });
      await next();
    });
    return;
  }
  app.use(koaSession({
    key: config.key || 'HANSIGHT_UX_SESS',
    maxAge: config.maxAge || 'session',
    httpOnly: config.httpOnly !== false,
    signed: config.signed !== false,
    rolling: config.rolling !== false,
    store: new SessionStore(app, config)
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
    if (!ctx || !ctx.user) {
      return ctx.throw(401);
    }
    if (privileges.length > 0) {
      console.log(privileges);
    }
    if (privileges.length > 0 && !(await ctx.user.hasAnyPrivilege(privileges))) {
      return ctx.throw(403);
    }
    await next();
  };
}

module.exports = {
  authorizeMiddleware,
  initSession
};
