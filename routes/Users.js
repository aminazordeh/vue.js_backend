const express = require("express");
const router = express.Router();
const UsersModel = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const settings = require("../settings");
const mailService = require("../modules/mailService/mailService");
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
              message: error,
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
    res.send("fields incorrect");
    next();
  }
});

router.post("/signin", (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password /* recaptcha: req.body.recaptcha */,
    /* REVIEW */
  };
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
                      res.json({
                        user_info: data,
                        token: token,
                      });
                      next();
                    }
                  );
                } else {
                  res.json({
                    code: 401,
                    message: "email or password incorrect",
                  });
                  next();
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
  }
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
                  res.send(data);
                  next();
                } else {
                  res.json({
                    code: 401,
                    message: "token not valid",
                  });
                  next();
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
        const EmailVerifyToken = await jwt.sign(
          { email: user.email },
          settings.jwt_password,
          {
            expiresIn: "5h",
          }
        );

        await mailService.sendMail(
          {
            to: user.email,
            subject: "devsparkle.ir - تایید ایمیل",
            body: `
            <html>
              <body>
                <a href="http://127.0.0.1:/8080/verify/email/${EmailVerifyToken}"
                  <span style="color: #4245f5; font-weight:bold;direction: rtl; font-size: 15px; text-decoration: none;">برای تایید ایمیل کلیک کنید</span>
                </a>
                <br>
                <span style="margin-top: 10px; color: #777">حداکثر زمان برای فعال کردن لینک 5 ساعت است</span>
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
    const decoded_email_verification_token = await jwt.verify(
      user.token,
      settings.jwt_password
    );
    if (decoded_email_verification_token != undefined) {
      const setUserEmailVerified = UsersModel.findOne(
        {
          email: user.email,
        },
        async function (err, result) {
          if (err) {
            return console.error(err);
          }
          if (result != undefined) {
            if (result.email_verified == true) {
              res.json({
                code: 200,
                message: "your email has already been verified",
              });
              return;
            }
            result.email_verified = true;
            await result.save((err) => {
              if (err) {
                return console.error(err);
              }
            });
          } else {
            res.json({
              code: 404,
              message: "user not found",
            });
          }
        }
      );
      res.json({
        code: 200,
        message: "email verified!",
      });
    } else {
      res.json({
        code: 401,
        message: "token not valid",
      });
    }
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
  }
});

module.exports = router;
