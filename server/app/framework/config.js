const _ = require('lodash');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').execSync;
const pkgName = require('../../package.json').name;
const APP_NAME = process.env['BUILD_APP'] || pkgName;

function mergeConfig(dst, src) {
  for(const k in src) {
    const sv = src[k];
    if (_.isObject(sv) && _.isObject(dst[k])) {
      mergeConfig(dst[k], sv);
    } else if (!_.isUndefined(sv)) {
      dst[k] = sv;
    }
  }
  return dst;
}

/*
 * yml 中的配置是扁平化的，需要还原成嵌套化 object
 *
 * server.port: 8080
 * server.host: 127.0.0.1
 *
 * 还原成
 *
 * server: {
 *   port: 8080,
 *   host: '127.0.0.1'
 * }
 */
function extractYml(ymlObj) {
  const newObj = {};
  for(const k in ymlObj) {
    let co = newObj;
    const ks = k.split('.');
    const v = ymlObj[k];
    ks.forEach((ck, i) => {
      if (i === ks.length - 1) {
        co[ck] = v;
        return;
      }
      if (!co.hasOwnProperty(ck)) {
        co[ck] = {};
      }
      co = co[ck];
    });
    if (!Array.isArray(v)) {
      continue;
    }
    for(let i = 0; i < v.length; i++) {
      if (_.isObject(v[i])) {
        v[i] = extractYml(v[i]);
      }
    }
  }
  return newObj;
}

async function loadConfig(logger) {
  const defaultConfig = require('../config/config.default');
  const env = process.env['NODE_ENV'];
  if (!env || env === 'development') {
    mergeConfig(defaultConfig, require('../config/config.dev'));
    try {
      mergeConfig(defaultConfig, require('../config/config.custom'));
    } catch(ex) {
      // ignore
    }
  } else if (env === 'production') {
    if (defaultConfig.db.type === 'mysql') {
      // mysql 类型数据库必须在 config.yml 中配置 mysql 链接
      defaultConfig.db.mysql = null;
    }
    mergeConfig(defaultConfig, require('../config/config.prod'));
    try {
      // production 模式下，尝试加载外部 yml 配置
      const ymlFile = path.resolve(__root, '../../config.yml');
      const ymlConfig = yaml.safeLoad(fs.readFileSync(ymlFile, 'utf8'));
      if (_.isObject(ymlConfig)) {
        mergeConfig(defaultConfig, extractYml(ymlConfig));
      }
    } catch (e) {
      logger.error('load yml config fail:', e.message);
    }
  } else if (env === 'test') {
    mergeConfig(defaultConfig, require('../config/config.test'));
  } else {
    throw new Error('unsupport enviroment ' + env);
  }
  const db = defaultConfig.db;
  if (db.type === 'sqlite') {
    initSqlite(db.sqlite, logger);
  } else if (db.type === 'mysql') {
    if (!db.mysql.host || !db.mysql.username || !db.mysql.password || !db.mysql.database) {
      throw new Error(`mysql config required`);
    }
  } else {
    throw new Error(`Unsupport database type: ${db.type}`);
  }
  loadProxyRules(defaultConfig, logger);
  return defaultConfig;
}

function initSqlite(cfg, logger, fallback = true) {
  try {
    exec(`mkdir -p ${cfg.database}`);
    cfg.database = path.join(cfg.database, `${(pkgName || 'db').toLowerCase()}.sqlite`);
  } catch(ex) {
    logger.error(ex.message);
    if (ex.message.indexOf('Permission denied') >= 0 && fallback) {
      const fp = path.resolve(__root, '../run/db');
      logger.error(`Permission denied to make database dir: ${cfg.database}, use ${fp} instead`);
      cfg.database = fp;
      initSqlite(cfg, logger, false);
    } else {
      throw ex;
    }
  }
}

function loadProxyRules(config, logger) {
  try {
    config.proxy.rules.unshift(...require(path.join(__root, 'config', 'proxy_rules', APP_NAME + '.js')));
    logger.debug('Load', config.proxy.rules.length, 'proxy rules');
  } catch(ex) {
    logger.warn('Failed to load proxy rules for app:', APP_NAME, ex.message);
  }
}

module.exports = {
  loadConfig,
  extractYml
};
