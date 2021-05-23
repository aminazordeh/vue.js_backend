const request = require("request");
const configs = require("./config");
configs.googleRecaptchaSecretKey;
async function GoogleRecaptchaVerification(
  recaptcha_response,
  connection_remote_address
) {
  return new Promise(async (not_verified, success) => {
    const secretKey = "6LeCJL4ZAAAAAMcCovb3sPp9F4wJMDbpAtiYsmbr";
    const verificationUrl =
      "https://www.google.com/recaptcha/api/siteverify?secret=" +
      secretKey +
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
