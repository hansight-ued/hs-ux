const { 
  Joi,
  BaseForm
} = require(__framework);

class UserForm extends BaseForm {
  static get columnDefines() {
    return {
      nickname: Joi.string().required(),
      theme: Joi.string().allow('black', 'white').required(),
      locale: Joi.string().allow('zh-cn', 'en').required()
    };
  }
}

module.exports = UserForm;
