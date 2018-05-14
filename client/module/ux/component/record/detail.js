import {
  component,
  message,
  util,
  env,
  router
} from 'pentagon';
import Heatmap from 'heatmap.js';
import _tpl from './detail.html';
import {
  getRecordDetail,
  getPointList
} from '../../service/api';

class RecordDetailCtrl {
  $constructor() {
    this.$video = this.$ele.find('video')[0];
    this.canvas = {
      $c: this.$ele.find('div.mouse'),
      $track: this.$ele.find('canvas.t')[0],
      $hot: this.$ele.find('canvas.h')[0],
      points: [],
      width: 0,
      height: 0
    };
    this.record = {};
    this.points = {
      list: [],
      pagi: {page: 0, size: 10}
    };
    this.showMouseTrack = true;
    this.showMouseHot = true;
  }
  $ngLink() {
    this._request();    
  }
  _resizeCanvas() {
    const W = this.$video.offsetWidth;
    const H = this.$video.offsetHeight;
    const ratio = this.record.aspectRatio;
    let width = W;
    let height = H;
    const R = W / H;
    if (R >= ratio) {
      width = (height * ratio) | 0;
    } else {
      height = (W / ratio) | 0;
    }
    const top = ((H - height) / 2) | 0;
    const left = ((W - width) / 2) | 0;
    // console.log(W, H, width, height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.$c.css({
      left,
      top,
      width,
      height
    });
    util.initHIDPICanvas(this.canvas.$track, width, height);
    util.initHIDPICanvas(this.canvas.$hot, width, height);    
  }
  $ngResize() {
    if (!this.record.id) return;
    this._resizeCanvas();
    this._renderMouse();    
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
      this._resizeCanvas();      
      this._loadVideo();
      this._loadPoints();
    }, err => {
      message.error('获取录屏数据失败', err.message);
    });
  }
  _loadPoints() {
    const {page, size} = this.points.pagi;
    getPointList(router.params.id, page, size).then(result => {
      this.points.list.push(...result.data.map(p => {
        p.timestamp = parseInt(p.timestamp);
        this._calc(p);
        return p;
      }));
      if (this.points.list.length < result.total) {
        this.points.pagi.page++;
        setTimeout(() => this._loadPoints());
      } else {
        this._renderMouse();
      }
    }, err => {
      message.error('获取录屏数据失败', err.message);
    });
  }
  _renderMouse() {
    const { points, $track, $hot, width, height} = this.canvas;
    const t_ctx = $track.getContext('2d');
    t_ctx.clearRect(0, 0, width, height);
    const h_ctx = $hot.getContext('2d');
    h_ctx.clearRect(0, 0, width, height);
    if (points.length <= 1 || (!this.showMouseTrack && !this.showMouseHot)) return;  
    if (this.showMouseHot) {
      const hotmap = Heatmap.create({
        canvas: this.canvas.$hot,
        container: this.canvas.$c[0]
      });
      hotmap.setData({
        data: points
      });
    }
    if (this.showMouseTrack) {
      t_ctx.lineWidth = 2;
      t_ctx.strokeStyle = 'rgba(0, 0, 200, 0.6)';      
      t_ctx.beginPath();
      t_ctx.moveTo(points[0].x, points[1].y);
      for(let i = 1; i < points.length; i++) {
        t_ctx.lineTo(points[i].x, points[i].y);
      }
      t_ctx.stroke();
      t_ctx.closePath();
    }
  }
  _calc(p) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const R = W / H;
    const ratio = p.w / p.h;
    let width = W;
    let height = H;
    if (ratio >= R) {
      height = W / ratio;
    } else {
      width = H * ratio;
    }
    p.x = ((W - width) / 2 + p.x * width / p.w) | 0;
    p.y = ((H - height) / 2 + p.y * height / p.h) | 0; 
  }
  _loadVideo() {
    this.$video.src = util.joinUrl(
      env.API_ROOT,
      'ux/records/' + router.params.id + '/download'
    );
    this.$video.addEventListener('timeupdate', () => {
      if (!this.showMouseTrack && !this.showMouseHot) return;
      const mills = this.$video.currentTime * 1000;
      const ts = Number(this.record.startTime) + mills;
      const points = this.points.list;
      let i = 0;
      for(; i < points.length; i++) {
        if (points[i].timestamp > ts) break;
      }
      this.canvas.points = points.slice(0, i);
      this._renderMouse();
    });
  }
  onShowMouseTrackChange(v) {
    this.showMouseTrack = v;
    this._renderMouse();
  }
  onShowMouseHotChange(v) {
    this.showMouseHot = v;
    this._renderMouse();
  }
}

component('uxRecordDetail', {
  template: _tpl,
  controller: RecordDetailCtrl
});
