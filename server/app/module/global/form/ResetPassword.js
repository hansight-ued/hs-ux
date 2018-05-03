const { 
  Joi,
  BaseForm
} = require(__framework);

class UserForm extends BaseForm {
  static get columnDefines() {
    return {
      newPassword: Joi.string().min(1).max(256).required(),
      oldPassword: Joi.string().min(1).max(256).required(),      
    };
  }
}

module.exports = UserForm;
