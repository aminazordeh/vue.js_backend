const express = require("express");
const router = express.Router();
const PostsModel = require("../models/Posts");
const UsersModel = require("../models/Users");
const persianDate = require("persian-date");
const settings = require("../settings");

function saveState(req, res, post_author) {
  return new Promise(async (_success, _error) => {
    const date__now = new persianDate();
    let date =
      date__now.year() + "/" + date__now.month() + "/" + date__now.day();
    let post = req.post;
    post.post_header = req.body.post_header;
    post.post_content = req.body.post_content;
    post.post_cover_img = req.body.post_cover_img;
    post.post_cover_text = req.body.post_cover_text;
    post.post_publish_date = req.body.post_publish_date;
    post.post_publish_date = date.trim();
    post.author = post_author;
    try {
      post = await post.save();
      _success();
    } catch (error) {
      _error(error);
    }
  });
}

router.get("/", (req, res, next) => {});

router.post("/new_post", async (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
    user_token: req.body.user_token,
  };
  const post = {
    post_header: req.body.post_header,
    post_cover_img: req.body.post_cover_img,
    post_cover_text: req.body.post_cover_text,
    post_content: req.body.post_content,
  };
  console.log(user);
  console.log(post);
  if (
    // Check Post Params
    post.post_header != "" &&
    post.post_header != undefined &&
    post.post_cover_img != "" &&
    post.post_cover_img != undefined &&
    post.post_cover_text != "" &&
    post.post_cover_text != undefined &&
    post.post_content != "" &&
    post.post_content != undefined &&
    // Check User Params
    user.email != "" &&
    user.email != undefined &&
    user.password != "" &&
    user.password != undefined
  ) {
    try {
      const decoded_user_token = await jwt.verify(
        user.user_token,
        settings.jwt_password
      );
      if (decoded_user_token != undefined && decoded_user_token != null) {
        const findedUser = await UsersModel.findOne({
          email: user.email,
          password: user.password,
        });
        if (findedUser != undefined && findedUser != null) {
          if (findedUser.email_verified == true) {
            if (findedUser.access == "admin" || findedUser.access == "writer") {
              res.send("every thing ok!");
            } else {
              res.json({
                code: 503,
                message: "users not access to this point",
              });
            }
          } else {
            res.json({
              code: 401,
              message: "your email not verified",
            });
            next();
          }
        } else {
          res.json({
            code: 401,
            message: "email or password incorrect",
          });
          next();
        }
      }
    } catch (error) {
      res.json({
        code: 401,
        message: "token not valid",
      });
      next();
    }
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
    next();
  }
});

module.exports = router;
