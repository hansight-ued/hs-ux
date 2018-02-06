const { 
  Router,
  authorize
} = require(__framework);
const userRouter = new Router({
  prefix: '/user'
});
const userControllers = require('./controller/user');

userRouter.post('/login', userControllers.login);
userRouter.get('/session', authorize(), userControllers.session);
userRouter.post('/register', userControllers.register);
userRouter.post('/logout', authorize(), userControllers.logout);
userRouter.put('/update_setting', authorize(), userControllers.updateUserSetting);
userRouter.put('/reset_password', authorize(), userControllers.resetPassword);
userRouter.get('/test', userControllers.test);

module.exports = userRouter;