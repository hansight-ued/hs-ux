const _util = require('./util');
const _ = require('lodash');
const path = require('path');
const KOARouter = require('koa-router');
const config = require('./config');
const logger = require('./logger');

function wrapUrlPrefix(v) {
  return `/${v}`.replace(/\/+/g, '/').replace(/\/$/, '');
}
class Router extends KOARouter {
  constructor(opts) {
    if (opts && opts.prefix) {
      opts.prefix = wrapUrlPrefix(opts.prefix);
    }
    super(opts);
  }
  register(path, methods, middlewares, opts) {
    if (middlewares && !Array.isArray(middlewares)) {
      middlewares = [middlewares];
    }
    path = wrapUrlPrefix(path);
    logger.debug('Register Route:', methods[0], path);
    /*
		 * 将 router 的 middleware 的 this 绑定为 koa context
		 */
    if (middlewares) {
      middlewares = middlewares.map(mid => {
        return async function(ctx, next) {
          await mid.call(ctx, ctx, next);
        };
      });
    }
    return super.register(path, methods, middlewares, opts);
  }
  /*
    router.rest('/posts', ..., controllers)
  
    Method	Path	   Controller.Action
		GET	    /posts	        list
		GET	    /posts/:id	      view
		POST	  /posts		      create
		PUT	    /posts/:id	      update
		DELETE	/posts/:id	      destroy
	*/
  rest(...args) {
    if (!_.isString(args[0])) {
      throw new Error('first argument of router.rest must be string');
    } 
    const url = args[0];
    const controllers = args[args.length - 1];
    if (!_.isObject(controllers)) {
      throw new Error('need rest controllers');
    }
    const middlewares = args.slice(1, args.length - 1);
    if (controllers.list) {
      this.get(url, ...middlewares.map(m => _.isObject(m) ? m.list : m).filter(m => !!m).concat(controllers.list));
    }
    if (controllers.create) {
      this.post(url, ...middlewares.map(m => _.isObject(m) ? m.create : m).filter(m => !!m).concat(controllers.create));			
    }
    if (controllers.update) {
      this.put(path.join(url, ':id'), ...middlewares.map(m => _.isObject(m) ? m.update : m).filter(m => !!m).concat(controllers.update));
    }
    if (controllers.remove) {
      this.del(path.join(url, ':id'), ...middlewares.map(m => _.isObject(m) ? m.remove : m).filter(m => !!m).concat(controllers.remove));			
    }
    if (controllers.view) {
      this.get(path.join(url, ':id'), ...middlewares.map(m => _.isObject(m) ? m.view : m).filter(m => !!m).concat(controllers.view));						
    }
    return this;
  }
}

async function registerRouter(app) {
  const subModules = await _util.readdir(__module);
  const subRouters = [];
  for(let i = 0; i < subModules.length; i++) {
    const rf = path.join(__module, subModules[i], 'router.js');
    if (await _util.exists(rf)) {
      const rs = require(rf);
      if (Array.isArray(rs)) subRouters.push(...rs);
      else subRouters.push(rs);
    }
  }
  const rootRouter = new Router({
    prefix: wrapUrlPrefix(config.router.prefix || '')
  });
  subRouters.forEach(subRouter => {
    rootRouter.use(subRouter.routes());
  });
  app.use(rootRouter.routes(), rootRouter.allowedMethods());
}

module.exports = {
  Router,
  registerRouter
};
