const { spawn } = require('child_process');
const { 
  util,
  logger,
  config,
  database
} = require(__framework);
const path = require('path');
const { dateFromObjectId } = require('./util');
const RecordModel = require('../model/Record');
const fs = require('fs');

class ConvertManager {
  constructor() {
    this.maxTasks = config.ux.maxTasks;
    this.maxTries = config.ux.maxTries;
    this.dataDir = config.ux.dataDir;
    this.enable = !!config.ux.enable;
    this.runningCount = 0;
    logger.debug('new convert manager', this.maxTasks, this.maxTries);
    /*
     * 每 2 分钟触发一次调度，保证即使偶然的原因导致调度未被
     * 业务层代码触发，也能在最多 2 分钟的延迟后开始调度。
     */
    this.enable && setInterval(() => {
      logger.debug('convert manager interval schedule');
      this.schedule();
    }, 120 * 1000);
  }
  schedule() {
    if (!this.enable || this.runningCount >= this.maxTasks) return;
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
      logger.error(ex);
    }
  }
  async _fetch() {
    return await database.transaction(async db => {
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
    let result = null;
    for(let i = 1; i <= this.maxTries; i++) {
      try {
        result = await this._doCovert(record);
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
      return await record.save();
    }
    const [file, finalFile, info] = result;
    if (!info || !Array.isArray(info.streams) 
      || !info.streams[0] || !info.streams[0].display_aspect_ratio
      || !info.streams[0].duration) {
      record.state = RecordModel.STATES.ERROR;
      return await record.save();
    }
    const ar = info.streams[0].display_aspect_ratio.split(':');
    record.duration = Number(info.streams[0].duration);
    record.aspectRatio = Number(ar[0]) / Number(ar[1]);
    record.state = RecordModel.STATES.FINISHED;
    await record.save();
    // 此处如果发生错误，只需要简单地把日志记录。
    // 后期可以通过脚本分析日志，重新删除。
    fs.unlink(file, err => {
      if (err) {
        logger.error(`unlink record: ${record.id} failed`);
      }
    });
  }
  async _doCovert(record) {
    const dt = dateFromObjectId(record.id);
    if (!dt) throw new Error('back record.id');
    const file = path.join(this.dataDir, dt, `${record.id}.${record.mimeType.split('/')[1]}`);
    if (!(await util.exists(file)))
      throw new Error('File not exists: ' + file);
    const finalFile = path.join(this.dataDir, dt, `${record.id}.final.mp4`);
    await new Promise((resolve, reject) => {
      logger.debug('run ffmepg converting for record', record.id);      
      const ff = spawn('ffmpeg', [
        '-i', file,
        '-v', 'error', 
        '-r', '24',
        '-y',
        finalFile
      ], {
        stdio: ['ignore', 'ignore', 'pipe']
      });
      let err = '';
      ff.stderr.on('data', data => {
        err += data.toString();
      });
      ff.on('error', err => {
        reject(err);
      });
      ff.on('close', code => {
        logger.debug('ffmpeg convert exit with code', code, 'for record', record.id);
        if (code !== 0) reject(err);
        else resolve();
      });
    });
    const info = await new Promise((resolve, reject) => {
      logger.debug('get metainfo using ffprobe...');      
      const ff = spawn('ffprobe', [
        '-v', 'error', 
        '-print_format', 'json',
        '-show_streams',
        finalFile
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let err = '';
      ff.stderr.on('data', data => {
        err += data.toString();
      });
      let out = '';
      ff.stdout.on('data', data => {
        out += data.toString();
      });
      ff.on('error', err => {
        reject(err);
      });
      ff.on('close', code => {
        logger.debug('ffprob exit with code', code);
        if (code !== 0) return reject(err);
        try { resolve(JSON.parse(out)); }
        catch(ex) {reject(ex);}
      });
    });
    return [ file, finalFile, info ];
  }
}

// singleton
module.exports = new ConvertManager();
