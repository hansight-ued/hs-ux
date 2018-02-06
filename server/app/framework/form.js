const Joi = require('joi');
const _ = require('lodash');
const logger = require('./logger');

class BaseForm {
  static get type() {
    return 'json';
  }
  static get maxBody() {
    return null; // use global config
  }
  static get columnDefines() {
    return {};
  }
  constructor(obj = {}) {
    const FormClass = this.constructor;
    // columnDefines 是 static getter，每次调用都会生成新数据。
    // todo 待 es7 class fields 标准被支持后，使用 class fields 而不是 class getter
    let columnDefines = FormClass.__COLUMN_DEFINES;
    if (!columnDefines) {
      columnDefines = FormClass.__COLUMN_DEFINES = FormClass.columnDefines;
    }
    for(const fn in columnDefines) {
      this[fn] = obj[fn];
    }
  }
  validate(convert = true) {
    const FormClass = this.constructor;
    let columnDefines = FormClass.__COLUMN_DEFINES;
    if (!columnDefines) {
      columnDefines = FormClass.__COLUMN_DEFINES = FormClass.columnDefines;
    }
    if (!FormClass.__SCHEMA) {
      FormClass.__SCHEMA = Joi.compile(Joi.object().keys(columnDefines));
    }
    const result = Joi.validate(this, FormClass.__SCHEMA);
    if (result.error) {
      logger.debug(result.error);
      return false;
    }
    convert && Object.assign(this, result.value);
    return true;
  }
}

module.exports = {
  BaseForm,
  Joi
};
