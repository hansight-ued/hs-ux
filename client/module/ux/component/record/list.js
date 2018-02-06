import {
  component
} from 'pentagon';
import pen from 'pentagon';

import _tpl from './list.html';
import { find } from 'lodash';

class RecordListCtrl {
  $constructor() {
    console.log(find);
  }
}

component('uxRecordList', {
  template: _tpl,
  controller: RecordListCtrl
});
