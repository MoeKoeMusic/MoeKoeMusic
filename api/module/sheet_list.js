// 乐谱列表 // 0全部，1、钢琴，2、吉他，3、鼓谱，98：简谱，99:其他
module.exports = (params, useAxios) => {
  const paramsMap = {
    album_audio_id: params.album_audio_id,
    opern_type: params.opern_type ?? 0,
    page: params.page ?? 1,
    pagesize: params.pagesize ?? 30,
  }
  return useAxios({
    url: '/miniyueku/v1/opern/list',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
