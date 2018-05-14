const RecordModel = require('../model/Record');
const PointModel = require('../model/Point');
const PaginationForm = require(__common + 'form/pagination.js');
const { 
  Joi,
  BaseForm,
  database
} = require(__framework);

class PointsForm extends BaseForm {
  static get columnDefines() {
    return {
      points: Joi.array().min(1).max(10000).required().items(Joi.object().keys({
        x: Joi.number().integer().required(),
        y: Joi.number().integer().required(),
        w: Joi.number().integer().required(),
        h: Joi.number().integer().required(),
        timestamp: Joi.number().integer().required(),
        type: Joi.number().integer().min(0).max(250).required()
      }))
    };
  }
}
async function create() {
  const recordId = this.params.recordId;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOneById(recordId);
  if (!record) return this.error(404);
  const form = await this.fillForm(PointsForm);
  const ps = form.points.map(sp => {
    const p = new PointModel(sp);
    p.record = record;
    return p;
  });
  await database.save(ps);
  this.success(true);
}

async function list() {
  const recordId = this.params.recordId;
  if (!recordId || recordId.length !== 24)
    return this.error(400);
  const record = await RecordModel.findOneById(recordId);
  if (!record) return this.error(404);
  const form = await this.fillForm(PaginationForm);
  const [ points, total ] = await PointModel.findAndCount({
    skip: form.page * form.size,
    take: form.size,
    where: {
      record
    }
  });
  this.success({
    data: points,
    total
  });
}

module.exports = {
  create,
  list
};
