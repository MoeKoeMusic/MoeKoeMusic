const { playlistAesEncrypt, playlistAesDecrypt, rsaEncrypt2, signParamsKey, clientver, appid } = require('../util');
module.exports = (params, useAxios) => {
  const userid = params?.userid || params?.cookie?.userid || 0;
  const token = params?.token || params.cookie?.token || '';
  const dataMap = {
    'availableRamSize': 4983533568,
    'availableRomSize': 48114719,
    'availableSDSize': 48114717,
    'basebandVer': '',
    'batteryLevel': 100,
    'batteryStatus': 3,
    'brand': 'Redmi',
    'buildSerial': 'unknown',
    'device': 'marble',
    'imei': params.cookie?.KUGOU_API_GUID,
    'imsi': '',
    'manufacturer': 'Xiaomi',
    'uuid': params.cookie?.KUGOU_API_GUID,
    'accelerometer': false,
    'accelerometerValue': '',
    'gravity': false,
    'gravityValue': '',
    'gyroscope': false,
    'gyroscopeValue': '',
    'light': false,
    'lightValue': '',
    'magnetic': false,
    'magneticValue': '',
    'orientation': false,
    'orientationValue': '',
    'pressure': false,
    'pressureValue': '',
    'step_counter': false,
    'step_counterValue': '',
    'temperature': false,
    'temperatureValue': '',
  };

  const aesEncrypt = playlistAesEncrypt(dataMap);

  const p = rsaEncrypt2({ aes: aesEncrypt.key, uid: userid, token });

  return new Promise((resolve, reject) => {
    useAxios({
      baseURL: 'https://userservice.kugou.com',
      url: '/risk/v2/r_register_dev',
      method: 'POST',
      data: aesEncrypt.str,
      params: { part: 1, platid: 1, p },
      encryptType: 'android',
      cookie: params?.cookie || {},
      responseType: 'arraybuffer',
    })
      .then((res) => {
        res.body = playlistAesDecrypt({ str: res.body.toString('base64'), key: aesEncrypt.key });

        const { body } = res;
        if (body?.status === 1 && body?.data) {
          res.cookie.push(`dfid=${res.body.data['dfid']}`);
        }

        resolve(res);
      })
      .catch((e) => reject(e));
  });
};
