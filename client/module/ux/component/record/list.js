import {
  component,
  message,
  modal
} from 'pentagon';
import _tpl from './list.html';
import {
  getRecordList,
  removeRecord
} from '../../service/api';

const STATE_NAME_MAP = {
  '0': '转换出错',
  '10': '录屏中...',
  '20': '待处理',
  '30': '处理中...',
  '100': '已完成'
};

class RecordListCtrl {
  $constructor() {
    this.records = {
      loading: false,
      total: 0,
      page: 0,
      size: 10,
      data: []
    };
    this._request();
  }
  _request() {
    if (this.records.loading) return;
    this.records.loading = true;
    getRecordList(
      this.records.page,
      this.records.size
    ).then(result => {
      this.records.total = result.total;
      this.records.data = result.data;
      result.data.forEach(re => {
        re.state = STATE_NAME_MAP[re.state];
      });
    }, err => {
      message.error('获取录屏列表数据失败', err.message);
    }).finally(() => {
      this.records.loading = false;
    });
  }
  remove(record) {
    modal.confirm(`确认删除${record.tag}？`, () => {
      return removeRecord(record.id).then(() => {
        message.success('删除成功!');
        this._request();
      }, ex => {
        message.error('删除失败', ex.message);
      });
    });
  }
}

component('uxRecordList', {
  template: _tpl,
  controller: RecordListCtrl
});
