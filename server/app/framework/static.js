const _util = require('./util');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const zlib = require('zlib');

const NOT_EXIST_CODES = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
const cache = new Map();

function _joinUrl(...args) {
  return args.join('/').replace(/\/+/g, '/');
}

function replaceEnv(indexBuffer, env) {
  let text = indexBuffer.toString('utf-8');
  text = text.replace(/\$\{ASSET_ROOT\}/g, _joinUrl(env.SERVER_ROOT, env.ASSET_PREFIX));
  text = text.replace(/\$\{TITLE\}/g, env.TITLE);
  text = text.replace('/** PRODUCTION ENV **/', [
    'SERVER_MODE', 'SERVER_ROOT', 'API_PREFIX', 'ASSET_PREFIX',
  ].map(k => `${k}:${JSON.stringify(env[k])}`).join(', ') + ',\n');
  return Buffer.from(text, 'utf-8');
}

async function initStatic(app, config) {
  console.log(config);
  if (!config || !config.path) return;
  const apiPrefix = `/${app.config.router.prefix || ''}/`.replace(/\/+/g, '/');
  const assetPrefix = `/${config.prefix || ''}/`.replace(/\/+/g, '/');
  const appTitle = app.config.app.title;
  const logger = app.logger;
  app.use(async (ctx, next) => {
    let url = ctx.url;
    /*
     * /__public/ 打头的全部是静态文件
     * /__api/ 打头的全部是 API 接口请求
     * 其它所有路由都返回 index.html
     */
    if (url.startsWith(assetPrefix)) {
      url = url.substring(10);
    } else if (url.startsWith(apiPrefix)) {
      await next();
      // important to return
      return;
    } else {
      url = '/index.html';
    }
    let i;
    if ((i = url.indexOf('?')) >= 0) {
      url = url.substring(0, i);
    }
    // logger.debug(url);
    const file = path.join(config.path, url);
    let stat;

    try {
      stat = await _util.stat(file);
    } catch (ex) {
      if (NOT_EXIST_CODES.indexOf(ex.code) < 0) {
        // 对于某些意料之外的异常类型，打印日志
        ctx.logger.error(ex);
      }
      ctx.throw(404);
      return;
    }
    if (!stat || !stat.isFile()) {
      ctx.throw(404);
      return;
    }

    const mt = ctx.headers['if-modified-since'];
    const nmt = stat.mtime.toUTCString();
    if (mt && mt === nmt) {
      ctx.sendStatus(304);
      return;
    }

    const ext = path.extname(file);
    let maxAge = 0; // html 文件默认不缓存
    if (ext === '.js' || ext === '.css') {
      // js 和 css 文件名都会有 hash tag，可以永久缓存
      maxAge = 315360000;
    } else if (ext !== '.html') {
      // 其它非 html 文件缓存 6 个小时
      maxAge = 6 * 60 * 60;
    }
    ctx.set('Cache-Control', maxAge > 0 ? `max-age=${maxAge}` : 'no-cache');
    ctx.set('Last-Modified', nmt);
    ctx.set('Content-Type', mime.contentType(ext));
    /*
     * 对于 html, js, css 文件，或者其它少于 2M 大小的文件，
     * 进行 gzip 压缩并缓存在内存里
     */
    if (ext === '.html' || ext === '.js' || ext === '.css' || stat.size <= 2 * 1024 * 1024) {
      let f = cache.get(file);
      if (!f || f.mtime !== nmt) {
        // 缓存失效时读取文件内容并 gzip 压缩
        f = {
          mtime: nmt,
          buffer: await _util.readFile(file),
          gzip: false
        };
        if (url === '/index.html') {
          f.buffer = replaceEnv(f.buffer, {
            SERVER_MODE: app.config.server.mode,
            SERVER_ROOT: app.config.server.root,
            API_PREFIX: apiPrefix,
            ASSET_PREFIX: assetPrefix,
            TITLE: appTitle
          });
        }
        const gzipOut = await new Promise((resolve, reject) => {
          zlib.gzip(f.buffer, (err, output) => {
            if (err) {
              reject(err);
            } else {
              resolve(output);
            }
          });
        });
        // 如果 gzip 后的大小确实小于原始大小，才真正返回 gzip
        if (gzipOut.length < f.buffer.length) {
          f.gzip = true;
          f.buffer = gzipOut;
        }
        cache.set(file, f);
      }
      f.gzip && ctx.set('Content-Encoding', 'gzip');
      ctx.body = f.buffer;
      ctx.state.__bodySent = true;
    } else {
      ctx.body = fs.createReadStream(file);
      ctx.state.__bodySent = true;
    }
  });
}

module.exports = {
  initStatic
};
