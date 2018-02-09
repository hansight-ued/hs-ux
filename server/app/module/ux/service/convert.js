const { spawn } = require('child_process');
const { 
  util,
  logger
} = require(__framework);
const path = require('path');
const { dateFromObjectId } = require('./util');
const RecordModel = require('../model/Record');
const fs = require('fs');

class ConvertManager {
  constructor(config) {
    console.log(config);
    this.maxTasks = config.ux.maxTasks;
    this.maxTries = config.ux.maxTries;
    this.dataDir = config.ux.dataDir;
    this.runningCount = 0;
    logger.debug('new convert manager', this.maxTasks, this.maxTries);
    /*
     * 每 2 分钟触发一次调度，保证即使偶然的原因导致调度未被
     * 业务层代码触发，也能在最多 2 分钟的延迟后开始调度。
     */
    // setInterval(() => {
    //   logger.debug('convert manager interval schedule');
    //   this.schedule();
    // }, 120 * 1000);
  }
  schedule() {
    if (this.runningCount >= this.maxTasks) return;
    this._doSchedule().catch(err => {
      logger.error(`convert fetch error:`);
      logger.error(err);
    });
  }
  async _doSchedule() {
    const record = await this._fetch();
    if (!record) return;
    try {
      this.runningCount++;
      await this._convert(record);
      this.runningCount--;
      setTimeout(() => {
        this.schedule();
      });
    } catch(ex) {
      this.runningCount--;
    }
  }
  async _fetch() {
    return await RecordModel.entityManager.transaction(async db => {
      const rec = await db.createQueryBuilder(RecordModel, 'record')
        .where('record.state = :state', {state: RecordModel.STATES.WAITING})
        .orderBy('record.id', 'DESC')
        .setLock('pessimistic_write')
        .take(1)
        .getOne();
      if (!rec) return null;
      rec.state = RecordModel.STATES.CONVERTING;
      await db.save(rec);
      return rec;
    });
  }
  async _convert(record) {
    let err = null;
    for(let i = 1; i <= this.maxTries; i++) {
      try {
        await this._doCovert(record);
        err = null;
        break; // success, no more retry
      } catch(ex) {
        err = ex;
      }
    }
    if (err) {
      logger.error(`convert record ${record.id} error:`);
      logger.error(err);
      record.state = RecordModel.STATES.ERROR;
    } else {
      record.state = RecordModel.STATES.FINISHED;
      record.mimeType = 'video/mp4';
    }
    for(let i = 1; i <= this.maxTries; i++) {
      try {
        await record.save();
        break; // success, no more retry
      } catch(ex) {
        if (i === this.maxTries) {
          logger.error(`convert update state error, record: ${record.id}, state: ${record.state}`);
          logger.error(ex);
        }
      }
    }
  }
  async _doCovert(record) {
    const dt = dateFromObjectId(record.id);
    if (!dt) return this.error(400);
    const file = path.join(this.dataDir, dt, `${record.id}.${record.mimeType.split('/')[1]}`);
    if (!(await util.exists(file)))
      return this.error(404);
    logger.debug('run ffmepg converting for record', record.id);
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-fflags', '+genpts', 
        '-i', file, 
        '-r', '24',
        '-y', // overwrite
        path.join(this.dataDir, dt, `${record.id}.mp4`)
      ], {
        stdio: ['ignore', 'ignore', 'pipe']
      });
      let err = '';
      ff.stderr.on('data', data => {
        err += data.toString();
      });
      ff.on('close', code => {
        logger.debug('ffmpeg convert exit with code', code, 'for record', record.id);
        if (code !== 0) reject(err);
        else resolve();
      });
    });
    // 此处如果发生错误，只需要简单地把日志记录。
    // 后期可以通过脚本分析日志，重新删除。
    fs.unlink(file, err => {
      if (err) {
        logger.error(`unlink record: ${record.id} failed`);
      }
    });
  }
}

// singleton
let manager = null;
function getManager(config) {
  manager = manager || new ConvertManager(config);
  return manager;
}
module.exports = {
  getManager
};
