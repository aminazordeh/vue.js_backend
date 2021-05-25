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
            if (err) return console.log(err);
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
          settings.jwt_password
        );

        mailService.sendMail(
          {
            to: user.email,
            subject: "devsparkle.ir - تایید ایمیل",
            body: `
            <html>
              <head>
                <title>devsparkle.ir - تایید ایمیل</title>
                <style>
                  @import url("https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&family=Quicksand:wght@300;400;500;600;700&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;1,100;1,300;1,400;1,500&display=swap");
                  * {
                    padding: 0;
                    margin: 0;
                    box-sizing: border-box;
                  }
                  body {
                    background-color: #fff;
                    font-family: "Quicksand", "Roboto";
                  }
                  #headerTop {
                    width: 100%;
                    height: 70px;
                    background-color: #1a5cff;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    user-select: none;
                  }
                  #brand {
                    padding: 0 20px;
                  }
                  #brand,
                  #brand h1 {
                    color: #fff;
                    font-family: "Comfortaa";
                    font-size: 24px;
                  }
                  .body {
                    position: absolute;
                    width: 100%;
                    top: 70px;
                    padding: 20px;
                    text-align: right;
                    user-select: text;
                  }
                  .help-text {
                    color: #666;
                  }
                </style>
              </head>
              <body>
                <div id="headerTop">
                  <div id="brand">
                    <h1>devsparkle.ir</h1>
                  </div>
                  <div class="body">
                    <div class="help-text" dir="rtl">
                      برای تایید ایمیل روی لینک زیر کلیک کنید.
                    </div>
                    <div class="content">
                      <a href="http://127.0.0.1:/8080/verify/email/${EmailVerifyToken}
                        http://127.0.0.1:/8080/verify/email/${EmailVerifyToken}
                      </a>
                    </div>
                  </div>
                </div>
              </body>
            </html>
            `,
          },
          () => {
            res.json({
              code: 200,
              message: "email verification sended",
            });
          }
        );
      }
    );
  }
});

module.exports = router;
