const express = require("express");
const router = express.Router();
const PostsModel = require("../models/Posts");
const UsersModel = require("../models/Users");
const persianDate = require("persian-date");
const settings = require("../settings");
const jwt = require("jsonwebtoken");
const bcryot = require("bcrypt");

function slug_post_path(path) {
  let post_path = String(path).trim().toLowerCase().replace(/ /g, "-");
  return post_path;
}

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
    post.post_publish_date = date.trim();
    post.post_author = post_author;

    post.post_path = await slug_post_path(req.body.post_header);

    try {
      post = await post.save();
      _success();
    } catch (error) {
      if (error) {
        _error(error);
      }
    }
  });
}

router.get("/", async (req, res, next) => {
  const posts = await PostsModel.find({
    post_publish: true,
  });
  res.json({
    code: 200,
    data: posts,
  });
});

router.post("/get_post", async (req, res, next) => {
  const post_path = req.body.post_path;
  if (
    String(post_path).trim() != "" &&
    post_path != undefined &&
    post_path != null
  ) {
    const post = await PostsModel.findOne({
      post_path: String(post_path).trim(),
      post_publish: true,
    });
    if (post != undefined && post != null && post.length != 0) {
      res.json({
        code: 200,
        data: post,
      });
      next();
      return;
    } else {
      res.json({
        code: 404,
        message: "post not found",
      });
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
        });
        if (findedUser != undefined && findedUser != null) {
          bcryot.compare(user.password, findedUser.password, (err, result) => {
            if (result) {
              if (findedUser.email_verified == true) {
                if (
                  findedUser.access == "admin" ||
                  findedUser.access == "writer"
                ) {
                  const checkPostExistWithThisInfo = PostsModel.findOne(
                    {
                      post_path: slug_post_path(post.post_header),
                    },
                    (err, data) => {
                      if (err) {
                        return console.error(err);
                      }
                      if (data == undefined || data == null) {
                        req.post = new PostsModel();
                        saveState(req, res, findedUser.full_name).then(
                          () => {
                            res.json({
                              code: 200,
                              message: "post added to database",
                            });
                            next();
                          },
                          (err) => {
                            console.error(err);
                            res.json({
                              code: 500,
                              message: "an error occurred on the server",
                            });
                            next();
                            return;
                          }
                        );
                      } else {
                        res.json({
                          code: 409,
                          message: "duplicate post",
                        });
                        next();
                        return;
                      }
                    }
                  );
                } else {
                  res.json({
                    code: 503,
                    message: "users not access to this point",
                  });
                  next();
                  return;
                }
              } else {
                res.json({
                  code: 401,
                  message: "your email not verified",
                });
                next();
                return;
              }
            } else {
              res.json({
                code: 401,
                message: "email or password incorrect",
              });
              next();
              return;
            }
          });
        } else {
          res.json({
            code: 401,
            message: "email or password incorrect",
          });
          next();
          return;
        }
      }
    } catch (error) {
      res.json({
        code: 401,
        message: "token not valid",
      });
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
