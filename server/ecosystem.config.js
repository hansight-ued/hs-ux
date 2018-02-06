const path = require('path');
const pkg = require('./package.json');
const appName = pkg.name;
const yaml = require('js-yaml');
const fs = require('fs');
const exec = require('child_process').execSync;
const _ = require('lodash');
const CORES = Math.min(require('os').cpus().length, 8);
const logPath = (function getAndInitLogPath() {
  let defaultLogPath = path.join(__dirname, 'run', 'logs');
  let ymlText = null;
  let extractYml = null;
  try {
    // production 模式下，尝试加载外部 yml 配置
    ymlText = fs.readFileSync(path.resolve(__dirname, '../config.yml'), 'utf8');
    extractYml = require('./app/framework/config').extractYml;
  } catch (e) {
    // ignore if not exists
  }
  if (process.env['NODE_ENV'] === 'production' && ymlText && extractYml) {
    try {
      let ymlConfig = yaml.safeLoad(ymlText);
      if (ymlConfig) {
        ymlConfig = extractYml(ymlConfig);
      }
      defaultLogPath = ymlConfig && ymlConfig.log && ymlConfig.log.path ? ymlConfig.log.path : '/var/log/hansight';
    } catch(ex) {
      console.error('load yml config fail');
      console.error(ex);
    }
  }
  try {
    exec(`mkdir -p ${defaultLogPath}`);
  } catch(ex) {
    console.error('make dir', defaultLogPath, 'fail:', ex.message);
    defaultLogPath = path.join(__dirname, 'run', 'logs');
  }
  console.log('log.path:', defaultLogPath);
  return defaultLogPath;
})();
/*
 * PROD_APP: 线上环境 app
 */
const PROD_APP = {
  name      : appName,
  merge_logs: true,
  log_date_format : "YYYY-MM-DD HH:mm:ss.SSS Z",
  out_file  : path.join(logPath, `${appName}.out.log`),
  error_file: path.join(logPath, `${appName}.err.log`),
  pid_file  : path.join(logPath, `${appName}.pid`),
  script    : 'app/index.js',
  instances : CORES,
  exec_mode : 'cluster',
  env : {
    NODE_ENV: 'production'
  }
};
/*
 * DEV_APP：本地开发 app
 */
const DEV_APP = {
  name: 'dev',
  script: 'app/index.js',
  autorestart: false,
  watch: true,
  ignore_watch: [
    'node_modules',
    '.idea',
    '.git',
    '.tmp',
    '.vscode',
    'run',
    'dist',
    'script'
  ],
  env: {
    NODE_ENV: 'development'
  }
};

/*
 * DEV_ONLINE_APP：线上环境无法通过日志排查问题，需要线上开发调试
 */
const DEV_ONLINE_APP = _.cloneDeep(DEV_APP);
DEV_ONLINE_APP.name = 'dev-online';
DEV_ONLINE_APP.env.NODE_ENV = 'production';

module.exports = {
  apps : [ PROD_APP, DEV_APP, DEV_ONLINE_APP ]
};
