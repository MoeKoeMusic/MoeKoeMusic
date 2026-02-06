const pako = require('pako');
const crypto = require('crypto');

/**
 * 随机字符串
 * @param {number} len
 * @returns {string}
 */
const randomString = (len = 16) => {
  const keyString = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const _key = [];
  const keyStringArr = keyString.split('');
  for (let i = 0; i < len; i += 1) {
    const ceil = Math.ceil((keyStringArr.length - 1) * Math.random());
    const _tmp = keyStringArr[ceil];
    _key.push(_tmp);
  }

  return _key.join('');
};

const randomNumber = (len = 16) => {
  const keyString = '1234567890';
  const _key = [];
  const keyStringArr = keyString.split('');
  for (let i = 0; i < len; i += 1) {
    const ceil = Math.ceil((keyStringArr.length - 1) * Math.random());
    const _tmp = keyStringArr[ceil];
    _key.push(_tmp);
  }

  return _key.join('');
};

/**
 * 格式化cookie
 * @param {string} cookie
 * @returns {string}
 */
const parseCookieString = (cookie) => {
  const t = cookie.replace(/\s*(Domain|domain|path|expires)=[^(;|$)]+;*/g, '');
  return t.replace(/;HttpOnly/g, '');
};

/**
 * cookie 转 json
 * @param {string} cookie
 * @returns
 */
const cookieToJson = (cookie) => {
  if (!cookie) return {};
  let cookieArr = cookie.split(';');
  let obj = {};
  cookieArr.forEach((i) => {
    let arr = i.split('=');
    obj[arr[0]] = arr[1];
  });
  return obj;
};

/**
 * krc解码
 * @param {string | Uint8Array | Buffer} val
 * @returns {string}
 */
const decodeLyrics = (val) => {
  let bytes = null;
  if (val instanceof Uint8Array) bytes = val;
  if (Buffer.isBuffer(val)) bytes = new Uint8Array(val);
  if (typeof val === 'string') bytes = new Uint8Array(Buffer.from(val, 'base64'));
  if (bytes === null) return '';
  const enKey = [64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105];
  const krcBytes = bytes.slice(4);
  const len = krcBytes.byteLength;
  for (let index = 0; index < len; index += 1) {
    krcBytes[index] = krcBytes[index] ^ enKey[index % enKey.length];
  }
  try {
    const inflate = pako.inflate(krcBytes);
    return Buffer.from(inflate).toString('utf8');
  } catch {
    return '';
  }
};

const calculateMid = (str) => {
  let bigInteger = BigInt(0);
  const bigInteger2 = BigInt(16);
  const digest = crypto.createHash('md5').update(str).digest('hex');
  const length = digest.length;
  for (let i = 0; i < length; i += 1) {
    const charValue = BigInt(parseInt(digest.charAt(i), 16));
    const powerValue = bigInteger2 ** BigInt(length - 1 - i);
    bigInteger += charValue * powerValue;
  }

  return bigInteger.toString();
};

const getGuid = () => {
  const e = () => {
    return ((65536 * (1 + Math.random())) | 0).toString(16).substring(1);
  };

  return `${e()}${e()}-${e()}-${e()}-${e()}-${e()}${e()}${e()}`;
};

module.exports = {
  decodeLyrics,
  cookieToJson,
  parseCookieString,
  randomString,
  randomNumber,
  calculateMid,
  getGuid
};
