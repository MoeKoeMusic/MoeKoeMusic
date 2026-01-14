// Register device to get dfid
module.exports = (params, useAxios) => {
  const { cryptoMd5 } = require("../util/crypto");

  // Generate mid and uuid from dfid (or default '-')
  const dfid = params?.cookie?.dfid || "-";
  const mid = params?.mid || `${cryptoMd5(dfid)}${cryptoMd5(dfid).slice(0, 7)}`;
  const uuid = params?.uuid || cryptoMd5(`${dfid}${mid}`);
  const userid = params?.cookie?.userid || params?.userid || "0";

  const dataMap = {
    mid,
    uuid,
    appid: "1014",
    userid: String(userid),
  };

  return new Promise((resolve, reject) => {
    useAxios({
      baseURL: "https://userservice.kugou.com",
      url: "/risk/v1/r_register_dev",
      method: "POST",
      data: Buffer.from(JSON.stringify(dataMap)).toString("base64"),
      params: { ...dataMap, "p.token": "", platid: 4 },
      encryptType: "register",
      cookie: params?.cookie || {},
    })
      .then((res) => {
        const { body } = res;
        if (body?.status === 1 && body?.data) {
          res.cookie.push(`dfid=${res.body.data["dfid"]}`);
        }

        resolve(res);
      })
      .catch((e) => reject(e));
  });
};
