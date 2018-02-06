window.fetch2 = (function() {
  function appendUrlQuery(url, data) {
    const arr = [];
    for(const k in data) {
      if (data[k] === undefined) continue;
      arr.push(encodeURIComponent(k) + '=' + encodeURIComponent(data[k]));
    }
    url += (url.indexOf('?') > 0 ? '&' : '?') + arr.join('&');
    return url;
  }

  const ACEEPT_BODY_METHODS = ['POST', 'PUT', 'DELETE'];
  function fetch2(url, options = {}) {
    const p = new Promise((resolve, reject) => {
      if (typeof url === 'object') {
        options = url;
        url = options.url;
      }
      if (!url) {
        throw new Error('fetch need url');
      }
      options.method = options.method || 'GET';
      let params = options.params || options.query;
      const data = typeof options.data !== 'undefined' ? options.data : options.body;
      const acceptBody = ACEEPT_BODY_METHODS.indexOf(options.method) >= 0;
      if (!acceptBody && !params && typeof data !== 'undefined') {
        params = data;
      }
      if (typeof params !== 'undefined') {
        url = appendUrlQuery(url, params);
      }
      options.credentials = options.credentials || 'same-origin';      
      options.headers = options.headers || {};
      debugger;
      if (acceptBody) {
        let contentType = options.contentType || options.headers['Content-Type'] || 'json';
        if (options.data instanceof Blob || typeof options.data === 'string' || contentType === 'text') {
          contentType = 'raw';
        } else if (contentType === 'json') {
          contentType = 'application/json';
        } else if (contentType === 'form') {
          contentType = 'application/x-www-form-urlencoded';
        } else if (contentType === 'multipart' || contentType === 'file') {
          contentType = 'multipart/form-data';
        }
        options.headers['Content-Type'] = contentType;
        if (contentType === 'raw') {
          options.body = data;
        } else if (typeof data === 'undefined') {
          options.body = '';
        } else if (contentType === 'application/json') {
          options.body = JSON.stringify(data);
        } else if (contentType === 'application/x-www-form-urlencoded') {
          throw new Error('not implement');
        } else {
          throw new Error('not implement');
        }
      }
      window.fetch(url, options).then(res => {
        fetchHandler(res, options).then(resolve, reject);
      }).catch(err => {
        console.error(err);
        // window.NProgress.done();
        reject({
          message: err.message || err.toString()
        });
      });
    });
    return p;
  }

  function fetchHandler(response, options) {
    return new Promise((resolve, reject) => {
      if (response.status === 401 && options.auth !== false) {
        reject({
          status: 401,
          message: 'error.unauthorized'
        });
        return;
      }

      if (response.status >= 200 && response.status < 300) {
        if (options.method === 'HEAD') resolve();
        const responseType = options.responseType || 'json';
        if (responseType === 'text') {
          response.text().then(resolve, reject);
        } else if (responseType === 'json') {
          response.json().then(obj => {
            if (typeof obj.code !== 'undefined') {
              if (obj.code === 0) {
                resolve(obj.data);
              } else {
                const msg = obj.data;
                reject({
                  status: obj.code,
                  message: msg
                });
              }
            } else {
              resolve(obj);
            }
          }, reject);
        } else {
          throw new Error(`responseType ${responseType} not support`);
        }
      } else {
        console.error(response);
        reject({
          message: typeof response.body === 'string' ? response.body : 'error.network',
          status: response.status
        });
      }
    });
  }
  return fetch2;
})();
