const request = require("request");
const settings = require("../../settings");

function not_valid(res, next) {
  res.json({
    code: 503,
    message: "recaptcha not verified",
  });
  return next();
}

async function GoogleRecaptchaVerification(
  recaptcha_response,
  connection_remote_address,
  req,
  res,
  next
) {
  return new Promise(async (success) => {
    const verificationUrl =
      "https://www.google.com/recaptcha/api/siteverify?secret=" +
      settings.google_recaptcha_secretkey +
      "&response=" +
      recaptcha_response +
      "&remoteip=" +
      connection_remote_address;
    if (recaptcha_response != undefined && recaptcha_response != "") {
      request(verificationUrl, function (error, response, body) {
        body = JSON.parse(body);
        if (body.success !== undefined && !body.success) {
          return not_valid(res, next);
        }
        success();
      });
    } else {
      not_valid(res, next);
    }
  });
}

module.exports = {
  GoogleRecaptchaVerification,
};
