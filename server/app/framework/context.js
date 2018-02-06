const _ = require('lodash');
const parse = require('co-body');

function sendStatus(code) {
  if (this.state.__bodySent) {
    this.logger.error('call ctx.success after body sent');
    return;
  }
  this.status = code;
  this.state.__bodySent = true;
}

function success(data = {}) {
  if (this.state.__bodySent) {
    this.logger.error('call ctx.success after body sent');
    return;
  }
  this.body = {
    code: 0,
    data
  };
  this.state.__bodySent = true;
}

function error(code, message) {
  if (this.state.__bodySent) {
    this.logger.error('call ctx.error after body sent');
    return;
  }
  if (!_.isNumber(code)) {
    message = code;
    code = 500;
  }
  if (code < 1000) {
    this.status = code;
  }
  this.body = {
    code,
    data: message
  };
  this.state.__bodySent = true;
}

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = Buffer.allocUnsafe(0);
    let __ended = false;
    req.on('data', chunk => {
      if (__ended) return;
      const total = body.length + chunk.length;
      // 临时先写死，后期应该改为从配置里读
      if (total >= 3 * 1024 * 1024) {
        __ended = true;        
        req.destroy();
        reject('size too large');
      }
      body = Buffer.concat([body, chunk], total);
    });
    req.on('end', () => {
      if (__ended) return;      
      __ended = true;
      resolve(body);
    });
    req.on('error', err => {
      if (__ended) return;
      __ended = true;
      reject(err);
    });
  });
}
async function parseBody(options = {}) {
  const type = options.type || 'json';
  const config = this.app.config.form;  
  switch(type) {
  case 'raw':
    return await parseRawBody(this.req);
  case 'query':
    return this.query;
  case 'json':
    if (!this.request.is('json')) {
      return this.throw(400);
    }
    return await parse.json(this, {
      limit: options.maxBody || config.jsonMaxBody || config.maxBody
    });
  case 'form':
    if (!this.request.is('urlencoded')) {
      return this.throw(400);
    }
    return await parse.form(this, {
      limit: options.maxBody || config.jsonMaxBody || config.maxBody
    });
  default:
    this.logger.error(`unknown Form type: ${type}`);
    return this.throw(500);
  }
}

async function fillForm(FormModel) {
  const config = this.app.config.form;
  const type = FormModel.type;
  let body;
  let form;
  switch(type) {
  case 'query':
    form = new FormModel(this.query);
    if (!form.validate()) {
      return this.throw(400);
    } 
    break;
  case 'json':
    if (!this.request.is('json')) {
      return this.throw(400);
    }
    body = await parse.json(this, {
      limit:  FormModel.maxBody || config.jsonMaxBody || config.maxBody
    });
    form = new FormModel(body);
    if (!form.validate()) {
      return this.throw(400);
    } 
    break;
  case 'form':
    if (!this.request.is('urlencoded')) {
      return this.throw(400);
    }
    body = await parse.form(this, {
      limit:  FormModel.maxBody || config.formMaxBody || config.maxBody
    });
    form = new FormModel(body);
    if (!form.validate()) {
      return this.throw(400);
    } 
    break;
  default:
    this.logger.error(`unknown Form type: ${type}`);
    return this.throw(500);
  }
  return form;
}

async function coreHandler(ctx, next) {
  const startTime = Date.now();  
  try {
    await next();
    if (!ctx.state.__bodySent) {
      if (ctx.body) {
        ctx.success(ctx.body);        
      } else {
        ctx.error(ctx.status || 600);
      }
    }
  } catch(ex) {
    if (ctx.state.__bodySent) {
      ctx.logger.error('error occur after __bodySent', ex);
    } else {
      let status = (ex && ex.status) ? ex.status : 500;
      if (status < 0) {
        status = 500;
      }
      if (!ex || !ex.status) {
        ctx.logger.error(ex);
      }
      ctx.error(status);
    }
  } finally {
    ctx.logger.access(ctx, startTime);    
  }
}

function extendContext(app) {
  Object.assign(app.context, {
    success,
    error,
    sendStatus,
    fillForm,
    parseBody
  });
  Object.defineProperties(app.context, {
    user: {
      get: function() {
        return this.state.user;
      }
    }
  });
  app.use(coreHandler);
}

module.exports = {
  extendContext
};
