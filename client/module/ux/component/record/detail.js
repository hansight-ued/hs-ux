import {
  component,
  message,
  util,
  env,
  router
} from 'pentagon';
import _tpl from './detail.html';
import {
  getRecordDetail
} from '../../service/api';

class RecordDetailCtrl {
  $constructor() {
    this.$video = this.$ele.find('video')[0];
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
    getRecordDetail(router.params.id).then(data => {
      this.record = data;
      this._loadVideo();
    }, err => {
      message.error('获取录屏数据失败', err.message);
    });
  }
  _loadVideo() {
    this.$video.src = util.joinUrl(
      env.API_ROOT,
      'ux/records/' + router.params.id + '/download'
    );
  }
}

component('uxRecordDetail', {
  template: _tpl,
  controller: RecordDetailCtrl
});
