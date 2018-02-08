const RecordModel = require('../model/Record');
const PaginationForm = require(__common + 'form/pagination.js');
const { 
  Joi,
  BaseForm
} = require(__framework);
const fs = require('fs');
const path = require('path');

const MIME_EXT_MAP = {
  'video/webm': 'webm',
  'video/mp4': 'mp4'
};
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
  const record = await RecordModel.findOne(recordId);
  if (!record) return this.error(404);
  record.endTime = new Date();
  await record.save();
  this.success({ id: record.id });
}

async function view() {
  const recordId = this.params.id;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOne(recordId);
  if (!record) return this.error(404);
  this.success(record);
}

function _n(v) { return v < 10 ? v : '0' + v; }
function dateFromObjectId(objectId) {
  try {
    const dt = new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getFullYear() < 2018) return null;
    return `${dt.getFullYear()}${_n(dt.getMonth() + 1)}${_n(dt.getDate())}`;
  } catch(ex) {
    return null;
  }
}
async function upload() {
  const recordId = this.params.id;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOne(recordId);
  if (!record) return this.error(404);
  const body = await this.parseBody({
    type: 'raw'
  });
  const dt = dateFromObjectId(recordId);
  if (!dt) return this.error(400);
  const dataDir = path.join(this.config.ux.dataDir, dt);
  await this.util.mkdir(dataDir, true);
  for(let i = 0; i < 11; i++) {
    try {
      await this.util.appendFile(path.join(dataDir, recordId), body);
      break;
    } catch(ex) {
      if (i >= 10) { // 最多尝试 10 次
        this.logger.error(ex);
        return this.error(500);
      }
    }
  }
  this.logger.debug('append', body.length, ' bytes to record:', recordId);
  this.success({ id: recordId });
}

async function download() {
  const recordId = this.params.id;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOne(recordId);
  if (!record) return this.error(404);
  const dt = dateFromObjectId(recordId);
  if (!dt) return this.error(400);
  const file = path.join(this.config.ux.dataDir, dt, recordId);
  console.log(file);  
  if (!(await this.util.exists(file)))
    return this.error(404);
  this.set('Content-Disposition', `attachment; filename="${recordId}.${MIME_EXT_MAP[record.mimeType]}"`);
  this.success(fs.createReadStream(file));
}

module.exports = {
  create,
  list,
  stop,
  view,
  upload,
  download
};
