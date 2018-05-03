const path = require('path');
const appName = require('./package.json').name;
const CORES = Math.min(require('os').cpus().length, 8);
const logPath = process.env['NODE_ENV'] === 'production' ? '/var/logs/hansight/ux/' : path.join(__dirname, 'run/logs');
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
  instance_var: 'CLUSTER_MY_ID',
  exec_mode : 'cluster',
  env : {
    CLUSTER_TOTAL_COUNT: CORES,
    NODE_ENV: 'production'
  }
};
/*
 * DEV_APP：本地开发 app
 */
const DEV_APP = {
  name: 'dev__' + appName,
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

module.exports = {
  apps : [ PROD_APP, DEV_APP ]
};
