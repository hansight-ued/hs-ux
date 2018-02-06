const { 
  Router,
  authorize
} = require(__framework);
const uxRouter = new Router({
  prefix: '/ux'
});

const recordControllers = require('./controller/record');
uxRouter.rest('/records', recordControllers);

module.exports = uxRouter;