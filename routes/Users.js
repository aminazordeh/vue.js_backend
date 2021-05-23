const express = require("express");
const router = express.Router();
const UsersModel = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const settings = require("../settings");

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
      }
    );
  } else {
    res.send("fields incorrect");
  }
});

router.post("/signin", (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password /* recaptcha: req.body.recaptcha */,
    /* REVIEW */
  };
  checkUserExist(user.email).then(
    () => {
      // User Not Exist
      res.json({
        code: 404,
        message: "user not exist",
      });
    },
    () => {
      // User Exist
      const findedUser = UsersModel.findOne(
        {
          email: user.email,
        },
        (err, data) => {
          if (err) return console.log(err);
          bcrypt.compare(user.password, data.password, function (err, result) {
            if (result) {
              jwt.sign({ data: data }, settings.jwt_password, (err, token) => {
                res.json({
                  user_info: data,
                  token: token,
                });
              });
            } else {
              res.json({
                code: 401,
                message: "email or password incorrect",
              });
            }
          });
        }
      );
    }
  );
});

module.exports = router;
