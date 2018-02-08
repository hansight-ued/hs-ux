import {
  component,
  message
} from 'pentagon';
import _tpl from './list.html';
import {
  getRecordList
} from '../../service/api';

class RecordListCtrl {
  $constructor() {
    this.records = {
      _fp: null,
      total: 0,
      page: 0,
      size: 10,
      data: []
    };
    this._request();
  }
  _request() {
    if (this.records._fp) return;
    this.records._fp = getRecordList(
      this.records.page,
      this.records.size
    ).then(result => {
      this.records.total = result.total;
      this.records.data = result.data;
    }, err => {
      message.error('获取录屏列表数据失败', err.message);
    }).finally(() => {
      this.records._fp = null;
    });
  }
}

component('uxRecordList', {
  template: _tpl,
  controller: RecordListCtrl
});
