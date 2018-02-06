import {
  mainMenus
} from './menu';
import app from 'app';
import './component/record';

app.config([
  '$stateProvider',
  function ($stateProvider) {
    $stateProvider.state('ux', {
      redirectTo: 'ux.record',
      url: '/ux',
      data: {
        appModule: 'ux'
      }
    }).state('ux.record', {
      url: '/records?(page)&(size)',
      component: 'uxRecordList',
      params: {
        page: {
          dynamic: true,
          value: 0,
          type: 'int'
        },
        size: {
          dynamic: true,
          type: 'int',
          value: 20
        }
      }
    });
  }
]);

export default {
  mainMenus
};