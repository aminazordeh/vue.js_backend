const express = require("express");
const router = express.Router();
const UsersModel = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const settings = require("../settings");
const mailService = require("../modules/mailService/mailService");
const Recaptcha = require("../modules/Google-Recaptcha/GoogleRecaptchaValidate");
const ejs = require("ejs");

function saveState(req, res) {
  return new Promise(async (_success, _error) => {
    let user = req.user;
    user.full_name =
      req.body.full_name != "" && req.body.full_name != null
        ? req.body.full_name
        : "";
    user.email = req.body.email;
    user.password = req.body.password;
    user.email_verification_password = await bcrypt.hashSync(
      user.email +
        Math.floor(Math.random() * 99999999999) +
        settings.email_verification_password,
      10
    );
    try {
      user.password = await bcrypt.hashSync(user.password, 10);
      user = await user.save();
      _success();
    } catch (error) {
      _error(error);
    }
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

router.post("/signup", (req, res, next) => {
  const user = {
    full_name: req.body.full_name,
    email: req.body.email,
    password: req.body.password,
  };
  if (
    user.email != "" &&
    user.email != undefined &&
    user.password != "" &&
    user.password != null
  ) {
    checkUserExist(user.email).then(
      () => {
        // User NotExist
        req.user = new UsersModel();
        saveState(req, res).then(
          () => {
            // 200
            res.json({
              code: 200,
              message: "user successfully added",
            });
            next();
          },
          (error) => {
            // Error
            res.json({
              code: 500,
              message: "an error occurred on the server",
            });
            console.error(error);
            next();
          }
        );
      },
      () => {
        // User Exist
        res.json({
          code: 409,
          message: "an user exist with this email",
        });
        next();
      }
    );
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
    next();
  }
});

router.post("/signin", (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
    recaptcha: req.body.recaptcha,
  };
  Recaptcha.GoogleRecaptchaVerification(
    user.recaptcha,
    req.connection.remoteAddress
  ).then(
    () => {
      // Error
      res.json({
        code: 503,
        message: "recaptcha not verified",
      });
      next();
      return;
    },
    () => {
      // Sucess
      if (
        user.email != "" &&
        user.email != null &&
        user.email != undefined &&
        user.password != "" &&
        user.password != null &&
        user.password != undefined
      ) {
        checkUserExist(user.email).then(
          () => {
            // User Not Exist
            res.json({
              code: 404,
              message: "user not exist",
            });
            next();
            return;
          },
          () => {
            // User Exist
            const findedUser = UsersModel.findOne(
              {
                email: user.email,
              },
              (err, data) => {
                if (err) return console.error(err);
                bcrypt.compare(
                  user.password,
                  data.password,
                  function (err, result) {
                    if (result) {
                      jwt.sign(
                        { data: data },
                        settings.jwt_password,
                        (err, token) => {
                          const user_info = {
                            full_name: data.full_name,
                            email: data.email,
                            password: data.password,
                            access: data.access,
                            bookmarks: data.bookmarks,
                            email_verified: data.email_verified,
                          };
                          res.json({
                            code: 200,
                            user_info: user_info,
                            token: token,
                          });
                          next();
                          return;
                        }
                      );
                    } else {
                      res.json({
                        code: 401,
                        message: "email or password incorrect",
                      });
                      next();
                      return;
                    }
                  }
                );
              }
            );
          }
        );
      } else {
        res.json({
          code: 400,
          message: "fields incorrect",
        });
        next();
        return;
      }
    }
  );
});

router.post("/auth/token", (req, res, next) => {
  const params = {
    email: req.body.email,
    password: req.body.password,
    token: req.body.token,
  };
  if (
    params.email != "" &&
    params.email != null &&
    params.email != undefined &&
    params.password != "" &&
    params.password != null &&
    params.password != undefined &&
    params.token != "" &&
    params.token != null &&
    params.token != undefined
  ) {
    jwt.verify(params.token, settings.jwt_password, (err, decoded) => {
      if (err) return res.json({ code: 401, message: "token not valid" });
      if (decoded != null && decoded != "undefined") {
        try {
          if (
            decoded.data.email != undefined &&
            decoded.data.email != null &&
            decoded.data.password != undefined &&
            decoded.data.password != null
          ) {
            const findedUser = UsersModel.findOne(
              {
                email: decoded.data.email,
                password: decoded.data.password,
              },
              (err, data) => {
                if (err) {
                  next();
                  return console.error(err);
                }
                if (data != undefined) {
                  res.json({
                    code: 200,
                    message: "success",
                    data: data,
                  });
                  next();
                  return;
                } else {
                  res.json({
                    code: 401,
                    message: "token not valid",
                  });
                  next();
                  return;
                }
              }
            );
          }
        } catch (error) {}
      } else {
        res.json({
          code: 401,
          message: "token not valid",
        });
        next();
        return;
      }
    });
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
    next();
    return;
  }
});

router.post("/send/email/verification", (req, res, next) => {
  const user = {
    email: req.body.email,
  };
  if (user.email != "" && user.email != null && user.email != undefined) {
    checkUserExist(user.email).then(
      () => {
        // User Not Exist
        res.json({
          code: 404,
          message: "user not exist",
        });
      },
      async () => {
        // User Exist
        let EmailVerifyToken = null;
        const findedUser = await UsersModel.findOne({
          email: user.email,
        });
        if (findedUser != undefined && findedUser != null) {
          if (
            findedUser.email_verification_password != "" &&
            findedUser.email_verification_password != undefined &&
            findedUser.email_verification_password != null
          ) {
            EmailVerifyToken = await jwt.sign(
              { email: user.email },
              findedUser.email_verification_password
            );
          }
        }
        if (EmailVerifyToken != null && EmailVerifyToken != "") {
          await mailService.sendMail(
            {
              to: user.email,
              subject: "devsparkle.ir - تایید ایمیل",
              body: `
            <html>
              <body style="width: 100%; text-align: right;">
                <a href="${settings.front_address}/verify/email/${EmailVerifyToken}"
                  <span style="color: #4245f5; font-weight:bold;direction: rtl; font-size: 15px; text-decoration: none;">برای تایید ایمیل کلیک کنید</span>
                </a>
                <br>
                <span style="margin-top: 10px; color: #777">این لینک یک بار مصرف است و هیچگونه استفاده دیگری ندارد.</span>
              </body>
            </html>
            `,
            },
            () => {
              res.json({
                code: 200,
                message: "email verification sended",
              });
              next();
            }
          );
        } else {
          res.json({
            code: 500,
            message: "an error occurred on the server",
          });
          next();
          return;
        }
      }
    );
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
    next();
  }
});

router.post("/verify/email", async (req, res, next) => {
  const user = {
    email: req.body.email,
    token: req.body.verification_token,
  };
  if (
    user.token != "" &&
    user.token != undefined &&
    user.email != "" &&
    user.email != undefined
  ) {
    try {
      const findedUser = await UsersModel.findOne({
        email: user.email,
      });
      const setUserEmailVerified = await UsersModel.findOne(
        {
          email: user.email,
        },
        async function (err, result) {
          if (err) {
            return console.error(err);
          }
          if (result != undefined) {
            let decoded_email_verification_token = undefined;
            try {
              decoded_email_verification_token = await jwt.verify(
                user.token,
                result.email_verification_password
              );
            } catch (error) {
              res.json({
                code: 401,
                message: "token not valid",
              });
              next();
              return;
            }
            if (decoded_email_verification_token != undefined) {
              if (result.email_verified == false) {
                result.email_verified = true;
                // Change ' Email Verification Password '
                result.email_verification_password = await bcrypt.hashSync(
                  user.email +
                    Math.floor(Math.random() * 99999999999) +
                    settings.email_verification_password,
                  10
                );
                await result.save((err) => {
                  if (err) {
                    return console.error(err);
                  }
                });
                res.json({
                  code: 200,
                  message: "email verified!",
                });
                next();
                return;
              } else {
                res.json({
                  code: 200,
                  message: "your email has already been verified",
                });
                next();
                return;
              }
            } else {
              res.json({
                code: 401,
                message: "token not valid",
              });
              next();
              return;
            }
          } else {
            res.json({
              code: 404,
              message: "user not found",
            });
            next();
            return;
          }
        }
      );
    } catch (error) {
      console.error(error);
      next();
      return;
    }
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
    next();
    return;
  }
});

module.exports = router;
