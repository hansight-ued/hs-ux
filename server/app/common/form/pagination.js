const {
  Joi,
  BaseForm
} = require(__framework);

class PaginationForm extends BaseForm {
  static get type() {
    return 'query';
  }
  static get columnDefines() {
    return {
      size: Joi.number().integer().min(1).max(1000).default(10),
      page: Joi.number().integer().min(0).default(0)
    };
  }
  getOptions() {
    return {
      skip: this.page * this.size,
      take: this.size
    };
  }
}

module.exports = PaginationForm;
