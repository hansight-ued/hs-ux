function _n(v) { return v >= 10 ? v : ('0' + v); }
function dateFromObjectId(objectId) {
  try {
    const dt = new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getFullYear() < 2018) return null;
    return `${dt.getFullYear()}${_n(dt.getMonth() + 1)}${_n(dt.getDate())}`;
  } catch(ex) {
    return null;
  }
}

module.exports = {
  dateFromObjectId
};
