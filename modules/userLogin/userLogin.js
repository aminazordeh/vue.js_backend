const UsersModel = require("../../models/Users");
const settings = require("../../settings");
const bcrypt = require("bcrypt");

function userLogin(email, password, req, res, next) {
  return new Promise((todo) => {
    checkUserExist(email).then(
      () => {
        // User Not Exist
        res.json({
          code: 404,
          message: "user not exist",
        });
        return next();
      },
      () => {
        // User Exist
        UsersModel.findOne(
          {
            email: email,
          },
          (err, data) => {
            if (err) return console.error(err);
            if (password == undefined || password == null) {
              return todo(data);
            }
            bcrypt.compare(password, data.password, function (err, result) {
              if (result) {
                if (
                  data.email_verified != undefined &&
                  data.email_verified == true
                ) {
                  todo(data);
                } else {
                  res.json({
                    code: 503,
                    message: "email not verified",
                  });
                  return next();
                }
              } else {
                res.json({
                  code: 401,
                  message: "email or password incorrect",
                });
                return next();
              }
            });
          }
        );
      }
    );
  });
}

function checkUserExist(email) {
  return new Promise(async (notExist, Exist) => {
    const findedUser = await UsersModel.findOne({ email: email });
    if (findedUser == null) {
      notExist();
    } else {
      Exist();
    }
  });
}

module.exports = { userLogin, checkUserExist };
