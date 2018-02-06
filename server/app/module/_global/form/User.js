const { 
  Joi,
  BaseForm
} = require(__framework);

class UserForm extends BaseForm {
  static get schemaDefines() {
    return {
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
      theme: Joi.string().allow('black', 'white').optional(),
      locale: Joi.string().allow('zh-cn', 'en').optional()
    };
  }
}

module.exports = UserForm;
