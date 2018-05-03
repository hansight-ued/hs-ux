const RecordModel = require('../model/Record');
const PaginationForm = require(__common + 'form/pagination.js');
const { 
  Joi,
  BaseForm,
  logger,
  config,
  util
} = require(__framework);
const convertManager = require('../service/convert');
const { dateFromObjectId } = require('../service/util');
const fs = require('fs');
const path = require('path');

class CreateRecordForm extends BaseForm {
  static get columnDefines() {
    return {
      id: Joi.string().length(24).required(),
      tag: Joi.string().min(1).max(500).required(),
      mimeType: Joi.string().valid('video/webm', 'video/mp4').required()
    };
  }
}

async function create() {
  const form = await this.fillForm(CreateRecordForm);
  if (!dateFromObjectId(form.id)) return this.error(400);
  const record = new RecordModel(form);
  record.duration = record.aspectRatio = -1.0;
  record.state = RecordModel.STATES.RECORDING;
  record.startTime = record.lastUpdateTime = Date.now();
  await record.save();
  this.success({
    id: record.id
  });
}

async function list() {
  const form = await this.fillForm(PaginationForm);
  const [ records, total ] = await RecordModel.findAndCount({
    skip: form.page * form.size,
    take: form.size
  });
  this.success({
    total,
    data: records
  });
}

async function stop() {
  const recordId = this.params.id;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOneById(recordId);
  if (!record) return this.error(404);
  if (record.state !== RecordModel.STATES.RECORDING)
    return this.success({ id: recordId });
  record.endTime = record.lastUpdateTime = Date.now();
  record.state = RecordModel.STATES.WAITING;
  await record.save();
  convertManager.schedule();
  this.success({ id: recordId });
}

async function view() {
  const recordId = this.params.id;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  logger.debug(recordId);
  const record = await RecordModel.findOneById(recordId);
  if (!record) return this.error(404);
  this.success(record);
}

async function upload() {
  const recordId = this.params.id;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOneById(recordId);
  if (!record) return this.error(404);
  if (record.state !== RecordModel.STATES.RECORDING)
    return this.error(400);
  const body = await this.parseBody({
    type: 'raw'
  });
  const dt = dateFromObjectId(recordId);
  if (!dt) return this.error(400);
  const dataDir = path.join(config.ux.dataDir, dt);
  await this.util.mkdir(dataDir, true);
  for(let i = 0; i < 11; i++) {
    try {
      await this.util.appendFile(path.join(dataDir, `${recordId}.${record.mimeType.split('/')[1]}`), body);
      break;
    } catch(ex) {
      if (i >= 10) { // 最多尝试 10 次
        logger.error(ex);
        return this.error(500);
      }
    }
  }
  record.lastUpdateTime = Date.now();
  // 此处不使用 await 是因为发生错误对系统的影响不大可忽略
  // 反到是如果把错误发送给浏览器，会导致浏览器重试，重复提交
  record.save().catch(err => {
    logger.error(err);
  });
  logger.debug('append', body.length, ' bytes to record:', recordId);
  this.success({ id: recordId });
}

async function download() {
  const recordId = this.params.id;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOneById(recordId);
  if (!record) return this.error(404);
  const dt = dateFromObjectId(recordId);
  if (!dt) return this.error(400);
  let file = path.join(config.ux.dataDir, dt, `${recordId}.`);
  if (record.state === RecordModel.STATES.FINISHED) {
    file += 'final.mp4';
  } else {
    file += record.mimeType.split('/')[1];
  }
  logger.debug(file);
  if (!(await util.exists(file)))
    return this.error(404);
  const stat = await util.stat(file);
  const total = stat.size;
  const range = this.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total-1;
    const chunksize = (end - start) + 1;
    logger.debug('RANGE:', start, '-', end, '=', chunksize);

    const stream = fs.createReadStream(file, {
      start,
      end
    });
    this.status = 206;
    this.set({
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': record.state === RecordModel.STATES.FINISHED ? 'video/mp4' : record.mimeType
    });
    this.success(stream);
  } else {
    this.set({
      'Accept-Ranges': 'bytes',
      'Content-Length': total,
      'Content-Type': record.mimeType
    });
    this.success(fs.createReadStream(file));
  }
}

async function test() {
  const r = await RecordModel.findOneById('5a7ff1c5e43bddd06308872a');
  logger.debug(r);
  this.success(r);
}

module.exports = {
  create,
  list,
  stop,
  view,
  upload,
  download,
  test
};
