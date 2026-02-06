// 乐谱详情
module.exports = (params, useAxios) => {
  const paramsMap = {
    id: params.id,
    source: params.source,
  }
  return useAxios({
    baseURL: 'https://miniyueku.kugou.com',
    url: '/v1/opern/detail',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
