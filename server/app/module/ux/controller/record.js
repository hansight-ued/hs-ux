const RecordModel = require('../model/Record');
const { 
  Joi,
  BaseForm
} = require(__framework);

class CreateRecordForm extends BaseForm {
  static get type() {
    return 'query';
  }
  static get columnDefines() {
    return {
      sessionId: Joi.string().length(24).required(),
      recordId: Joi.string().length(24).required(),
      mimeType: Joi.string().allow('video/webm', 'video/mp4').required()
    };
  }
}

async function create() {
  const form = await this.fillForm(CreateRecordForm);
  const body = await this.parseBody({
    type: 'raw'
  });
  const record = new RecordModel(form);
  record.blob = body;
  record.mimeType = RecordModel.MIME_TYPES[record.mimeType];
  await record.save();
  this.success({
    id: record.id
  });
}

module.exports = {
  create
};
