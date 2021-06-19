const jwt = require("jsonwebtoken");
const settings = require("../../settings");

function not_valid(res, next) {
  res.json({
    code: 401,
    message: "token not valid",
  });
  return next();
}

function AuthToken(token, email, req, res, next) {
  return new Promise(async (valid) => {
    try {
      const decoded_user_token = await jwt.verify(token, email + settings.jwt_password);

      if (decoded_user_token != undefined && decoded_user_token != null) {
        valid();
      } else {
        not_valid(res, next);
      }
    } catch (error) {
      not_valid(res, next);
    }
  });
}

module.exports = AuthToken;
