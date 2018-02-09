const { 
  Router,
  authorize
} = require(__framework);
const uxRouter = new Router({
  prefix: '/ux'
});

const recordControllers = require('./controller/record');

uxRouter.rest('/records', recordControllers);
uxRouter.put('/records/:id/stop', recordControllers.stop);
uxRouter.post('/records/:id/upload', recordControllers.upload);
uxRouter.get('/records/:id/download', recordControllers.download);
uxRouter.get('/record/test', recordControllers.test);

module.exports = uxRouter;