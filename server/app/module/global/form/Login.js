const { 
  Joi,
  BaseForm
} = require(__framework);

class LoginForm extends BaseForm {
  static get columnDefines() {
    return {
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().min(1).max(256).required(),
    };
  }
}

module.exports = LoginForm;
