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
        x: Joi.integer().required(),
        y: Joi.integer().required(),
        w: Joi.integer().required(),
        h: Joi.integer().required(),
        ts: Joi.integer().required(),
        type: Joi.integer().min(0).max(250).required()
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

module.exports = {
  create
};
