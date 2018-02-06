import {
  component
} from 'pentagon';
import _tpl from './list.html';

class RecordListCtrl {
  $constructor() {
  }
}

component('uxRecordList', {
  template: _tpl,
  controller: RecordListCtrl
});
