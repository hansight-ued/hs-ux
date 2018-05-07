const _ = require('lodash');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').execSync;
const pkgName = require('../../package.json').name;
const _util = require('./util');
const logger = require('./logger');

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

function loadConfig() {
  const defaultConfig = require('../config/config.default');
  const env = process.env['NODE_ENV'];
  if (!env || env === 'development') {
    mergeConfig(defaultConfig, require('../config/config.dev'));
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
        mergeConfig(defaultConfig, _util.extractYml(ymlConfig));
      }
    } catch (e) {
      logger.error('load yml config fail:', e.message);
    }
  } else {
    throw new Error('unsupport enviroment ' + env);
  }
  try {
    mergeConfig(defaultConfig, require('../config/config.custom'));
  } catch(ex) {
    // ignore
  }
  const db = defaultConfig.db;
  if (db.type === 'sqlite') {
    initSqlite(db.sqlite);
  } else if (db.type === 'mysql') {
    if (!db.mysql.host || !db.mysql.username || !db.mysql.password || !db.mysql.database) {
      throw new Error('mysql config required');
    }
  } else {
    throw new Error(`Unsupport database type: ${db.type}`);
  }
  if (!defaultConfig.__secretKey) {
    defaultConfig.__secretKey = loadSecretKey(logger);
  }
  return defaultConfig;
}

function initSqlite(cfg) {
  exec(`mkdir -p ${cfg.database}`);
  cfg.database = path.join(cfg.database, `${(pkgName || 'db').toLowerCase()}.sqlite`);
}

function loadSecretKey(logger) {
  let key;
  const keyFile = path.join(__dirname, '.secretKey');
  if (!(_util.existsSync(keyFile))) {
    key = _util.generatePassword({ length: 32 });
    fs.writeFileSync(keyFile, key);
    logger.info('Generated new secretKey');
  } else {
    key = fs.readFileSync(keyFile, 'utf-8');
  }
  return key;
}

// singleton
const config = loadConfig();
logger.level = process.env['LOG_LEVEL'] || config.log.level;
module.exports = config;
