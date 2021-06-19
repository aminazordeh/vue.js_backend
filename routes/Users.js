const express = require("express");
const router = express.Router();
const UsersModel = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const settings = require("../settings");
const mailService = require("../modules/mailService/mailService");
const Recaptcha = require("../modules/Google-Recaptcha/GoogleRecaptchaValidate");
const ejs = require("ejs");
const EmailDeepValidator = require("email-deep-validator");
const emailValidator = new EmailDeepValidator();
const AuthToken = require("../modules/AuthToken/AuthToken");
const { userLogin, checkUserExist } = require("../modules/userLogin/userLogin");

function generate_email_verification_password(email) {
  return bcrypt.hashSync(
    email +
      Math.floor(Math.random() * 99999999999) +
      settings.email_verification_password,
    10
  );
}

function saveState(req, res) {
  return new Promise(async (_success, _error) => {
    let user = req.user;
    user.full_name =
      req.body.full_name != "" && req.body.full_name != null
        ? req.body.full_name
        : "";
    user.email = req.body.email;
    user.password = req.body.password;
    user.email_verification_password =
      await generate_email_verification_password();
    try {
      user.password = await bcrypt.hashSync(user.password, 10);
      user = await user.save();
      _success();
    } catch (error) {
      _error(error);
    }
  });
}

router.post("/signup", async (req, res, next) => {
  const user = {
    full_name: req.body.full_name,
    email: req.body.email,
    password: req.body.password,
    recaptcha: req.body.recaptcha,
  };
  Recaptcha.GoogleRecaptchaVerification(
    user.recaptcha,
    req.connection.remoteAddress,
    req,
    res,
    next
  ).then(async () => {
    // Success
    if (
      user.email != "" &&
      user.email != undefined &&
      user.password != "" &&
      user.password != null
    ) {
      if (
        String(user.email).includes("@gmail.com") == true ||
        String(user.email).includes("@yahoo.com") == true
      ) {
        checkUserExist(user.email).then(
          () => {
            // User NotExist
            req.user = new UsersModel();
            saveState(req, res).then(
              () => {
                // 200
                userLogin(user.email, undefined, req, res, next).then(
                  async (data) => {
                    if (data != undefined && data != null) {
                      if (
                        data.email_verification_password != "" &&
                        data.email_verification_password != undefined &&
                        data.email_verification_password != null
                      ) {
                        EmailVerifyToken = await jwt.sign(
                          { email: user.email },
                          data.email_verification_password
                        );
                      }
                    }
                    if (EmailVerifyToken != null && EmailVerifyToken != "") {
                      try {
                        ejs.renderFile(
                          process.cwd() + "/modules/mailService/template.ejs",
                          {
                            email: user.email,
                            token: EmailVerifyToken,
                            front_end_address: settings.front_address,
                          },
                          {},
                          async (err, str) => {
                            if (err) {
                              res.json({
                                code: 500,
                                message: "an error occurred on the server",
                              });
                              console.error(err);
                              return next();
                            }

                            await mailService.sendMail(
                              {
                                to: user.email,
                                subject: "devsparkle.ir - تایید ایمیل",
                                body: str,
                              },
                              () => {
                                res.json({
                                  code: 200,
                                  message: "user successfully added",
                                });
                                next();
                              }
                            );
                          }
                        );
                      } catch (error) {
                        res.json({
                          code: 500,
                          message: "an error occurred on the server",
                        });
                        next();
                        return;
                      }
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
              },
              (error) => {
                // Error
                res.json({
                  code: 500,
                  message: "an error occurred on the server",
                });
                console.error(error);
                return next();
              }
            );
          },
          () => {
            // User Exist
            res.json({
              code: 409,
              message: "an user exist with this email",
            });
            return next();
          }
        );
      } else {
        res.json({
          code: 409,
          message: "email not valid",
        });
        return next();
      }
    } else {
      res.json({
        code: 400,
        message: "fields incorrect",
      });
      next();
    }
  });
});

router.post("/signin", (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
    recaptcha: req.body.recaptcha,
  };
  Recaptcha.GoogleRecaptchaVerification(
    user.recaptcha,
    req.connection.remoteAddress,
    req,
    res,
    next
  ).then(() => {
    // Sucess
    if (
      user.email != "" &&
      user.email != null &&
      user.email != undefined &&
      user.password != "" &&
      user.password != null &&
      user.password != undefined
    ) {
      userLogin(user.email, user.password, req, res, next).then((data) => {
        jwt.sign(
          { data: data },
          user.email + settings.jwt_password,
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
      });
    } else {
      res.json({
        code: 400,
        message: "fields incorrect",
      });
      return next();
    }
  });
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
    AuthToken(params.token, params.email, req, res, next).then(() => {
      userLogin(params.email, params.password, req, res, next).then((data) => {
        res.json({
          code: 200,
          message: "success",
          user_info: data,
        });
        next();
        return;
      });
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
    recaptcha: req.body.recaptcha,
  };
  if (user.email != "" && user.email != null && user.email != undefined) {
    userLogin(user.email, undefined, req, res, next).then(async (data) => {
      if (data != undefined && data != null) {
        if (data.email_verified == true) {
          res.json({
            code: 409,
            message: "your email has already been verified",
          });
          return next;
        }
        if (
          data.email_verification_password != "" &&
          data.email_verification_password != undefined &&
          data.email_verification_password != null
        ) {
          EmailVerifyToken = await jwt.sign(
            { email: user.email },
            data.email_verification_password
          );
        }
      }
      if (EmailverifyToken != null && EmailVerifyToken != "") {
        try {
          ejs.renderFile(
            process.cwd() + "/modules/mailService/template.ejs",
            {
              email: user.email,
              token: EmailVerifyToken,
              front_end_address: settings.front_address,
            },
            {},
            async (err, str) => {
              if (err) {
                res.json({
                  code: 500,
                  message: "an error occurred on the server",
                });
                console.error(err);
                return next();
              }

              await mailService.sendMail(
                {
                  to: user.email,
                  subject: "devsparkle.ir - تایید ایمیل",
                  body: str,
                },
                () => {
                  res.json({
                    code: 200,
                    message: "email verification sended",
                  });
                  next();
                }
              );
            }
          );
        } catch (error) {
          res.json({
            code: 500,
            message: "an error occurred on the server",
          });
          next();
          return;
        }
      } else {
        res.json({
          code: 500,
          message: "an error occurred on the server",
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
  }
});

router.post("/verify/email", async (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
    token: req.body.verification_token,
  };
  if (
    user.token != "" &&
    user.token != undefined &&
    user.email != "" &&
    user.email != undefined
  ) {
    userLogin(user.email, undefined, req, res, next).then(async (data) => {
      if (data.email_verified == false) {
        data.email_verified = true;
        // Change ' Email Verification Password '
        data.email_verification_password = await bcrypt.hashSync(
          user.email +
            Math.floor(Math.random() * 99999999999) +
            settings.email_verification_password,
          10
        );
        await data.save((err) => {
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
          code: 409,
          message: "your email has already been verified",
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

module.exports = router;
