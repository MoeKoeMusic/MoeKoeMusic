// 领取vip(领取一天) 需要登录
module.exports = (params, useAxios) => {
  return useAxios({
    url: '/youth/v1/recharge/receive_vip_listen_song',
    encryptType: 'android',
    method: 'post',
    params: { source_id: 90139, receive_day: params.receive_day },
    cookie: params?.cookie,
  });
};
