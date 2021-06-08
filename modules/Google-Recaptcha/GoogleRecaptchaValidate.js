const request = require("request");
const settings = require("../../settings");

async function GoogleRecaptchaVerification(
  recaptcha_response,
  connection_remote_address
) {
  return new Promise(async (not_verified, success) => {
    const verificationUrl =
      "https://www.google.com/recaptcha/api/siteverify?secret=" +
      settings.google_recaptcha_secretkey +
      "&response=" +
      recaptcha_response +
      "&remoteip=" +
      connection_remote_address;
    request(verificationUrl, function (error, response, body) {
      body = JSON.parse(body);
      if (body.success !== undefined && !body.success) {
        return not_verified();
      }
      success();
    });
  });
}

module.exports = {
  GoogleRecaptchaVerification,
};
