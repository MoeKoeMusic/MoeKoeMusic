const { srcappid } = require('../util');
// 乐谱合集详情
module.exports = (params, useAxios) => {
  const paramsMap = {
    srcappid,
    page: params.page ?? 1,
    collection_id: params.collection_id
  }
  return useAxios({
    url: '/miniyueku/v1/opern_square/collection_detail',
    encryptType: 'web',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
