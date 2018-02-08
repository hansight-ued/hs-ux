export function getRecordList(page = 0, size = 10) {
  return fetch('ux/records', {
    query: {
      page,
      size
    }
  });
}

export function getRecordDetail(id) {
  return fetch('ux/records/' + id);
}
