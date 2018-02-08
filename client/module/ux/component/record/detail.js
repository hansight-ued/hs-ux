import {
  component,
  message,
  util,
  env
} from 'pentagon';
import _tpl from './detail.html';
import {
  getRecordDetail
} from '../../service/api';

class RecordDetailCtrl {
  static get $inject() {
    return ['$element'];
  }
  $constructor($ele) {
    this.$video = $ele.find('video')[0];
    this.record = {};
    this._request();
  }
  togglePlay() {
    this.playing = !this.playing;
    if (this.playing) {
      this.$video.play();
    } else {
      this.$video.pause();
    }
  }
  _request() {
    getRecordDetail(this.id).then(data => {
      this.record = data;
      this._loadVideo();
    }, err => {
      message.error('获取录屏数据失败', err.message);
    });
  }
  _loadVideo() {
    this.$video.src = util.joinUrl(
      env.API_ROOT,
      'ux/records/' + this.id + '/download'
    );
  }
}

component('uxRecordDetail', {
  template: _tpl,
  controller: RecordDetailCtrl,
  bindings: {
    id: '<'
  }
});
