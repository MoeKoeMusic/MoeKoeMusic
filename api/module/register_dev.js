// Register device to get dfid
module.exports = (params, useAxios) => {
  const { cryptoMd5 } = require('../util/crypto');

  // Generate mid and uuid from dfid (or default '-')
  const dfid = params?.cookie?.dfid || '-';
  const mid = params?.mid || cryptoMd5(dfid);
  const uuid = params?.uuid || cryptoMd5(`${dfid}${mid}`);
  const userid = params?.cookie?.userid || params?.userid || '0';

  const dataMap = {
    mid,
    uuid,
    appid: '1014',
    userid: String(userid),
  };

  return useAxios({
    baseURL: 'https://userservice.kugou.com',
    url: '/risk/v1/r_register_dev',
    method: 'POST',
    data: Buffer.from(JSON.stringify(dataMap)).toString('base64'),
    params: { ...dataMap, 'p.token': '', platid: 4 },
    encryptType: 'register',
    cookie: params?.cookie || {},
  });
};
