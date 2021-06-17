const express = require("express");
const router = express.Router();
const PostsModel = require("../models/Posts");
const UsersModel = require("../models/Users");
const persianDate = require("persian-date");
const settings = require("../settings");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AuthToken = require("../modules/AuthToken/AuthToken");
const { userLogin, checkUserExist } = require("../modules/userLogin/userLogin");

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

function getPost(post_path, getforuser, __email) {
  return new Promise(async (exist, not_exist) => {
    const findedPost = await PostsModel.findOne({
      post_path: String(post_path).trim(),
      post_publish: true,
    });

    if (
      findedPost != undefined &&
      findedPost != null &&
      findedPost.length != 0
    ) {
      const post = {
        post_header: findedPost.post_header,
        post_content: findedPost.post_content,
        post_cover_img: findedPost.post_cover_img,
        post_cover_text: findedPost.post_cover_text,
        post_publish_date: findedPost.post_publish_date,
        post_author: findedPost.post_author,
        post_path: findedPost.post_path,
        post_likes: false,
        you_are_liked_this_post: false,
        post_comments: findedPost.post_comments,
      };
      if (
        getforuser == false ||
        getforuser == undefined ||
        getforuser == null
      ) {
        post.post_likes = findedPost.post_likes;
      } else {
        if (__email != undefined && __email != null && __email != "") {
          const likes = findedPost.post_likes;
          if (
            likes.find(({ email }) => email === __email) != undefined
          ) {
            post.you_are_liked_this_post = true;
          } else {
            post.you_are_liked_this_post = false;
          }
        }
        post.post_likes = findedPost.post_likes.length;
      }
      exist(post);
    } else {
      not_exist();
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

router.get("/get_likes", async (req, res, next) => {
  const posts = await PostsModel.find({
  });
  res.json({
    code: 200,
    data: posts,
  });
});

router.post("/get_post", async (req, res, next) => {
  const post_path = req.body.post_path;
  const email = req.body.email;
  if (
    String(post_path).trim() != "" &&
    post_path != undefined &&
    post_path != null
  ) {
    getPost(
      post_path,
      true,
      email == undefined || email == "" ? undefined : email
    ).then(
      (post) => {
        res.json({
          code: 200,
          data: post,
        });
        return next();
      },
      () => {
        res.json({
          code: 404,
          message: "post not found",
        });
        return next();
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
});

router.post("/new_post", async (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
    token: req.body.token,
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
    AuthToken(user.token, req, res, next).then(async () => {
      // Valid
      userLogin(user.email, user.password, req, res, next).then((data) => {
        if (data.access == "admin" || data.access == "writer") {
          const checkPostExistWithThisInfo = PostsModel.findOne(
            {
              post_path: slug_post_path(post.post_header),
            },
            (err, result) => {
              if (err) {
                return console.error(err);
              }
              if (result == undefined || result == null) {
                req.post = new PostsModel();
                saveState(req, res, data.full_name).then(
                  () => {
                    res.json({
                      code: 200,
                      message: "post added to database",
                    });
                    return next();
                  },
                  (err) => {
                    console.error(err);
                    res.json({
                      code: 500,
                      message: "an error occurred on the server",
                    });
                    return next();
                  }
                );
              } else {
                res.json({
                  code: 409,
                  message: "duplicate post",
                });
                return next();
              }
            }
          );
        } else {
          res.json({
            code: 503,
            message: "users not access to this point",
          });
          return next();
        }
      });
    });
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
    return next();
  }
});

router.post("/like_post", (req, res, next) => {
  const params = {
    email: req.body.email,
    password: req.body.password,
    token: req.body.token,
    post_path: req.body.post_path,
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
    params.token != undefined &&
    params.post_path != "" &&
    params.post_path != null &&
    params.post_path != undefined
  ) {
    AuthToken(params.token, req, res, next).then(() => {
      userLogin(params.email, params.password, req, res, next).then((data) => {
        getPost(params.post_path).then((post) => {
          const likes = post.post_likes;
          if (
            likes.find(({ email }) => email === data.email) == undefined ||
            likes.find(({ email }) => email === data.email) == true
          ) {
            // Like Post
            PostsModel.updateOne(
              { post_path: params.post_path },
              {
                $push: {
                  post_likes: {
                    email: data.email,
                  },
                },
              },
              (err) => {
                if (err) {
                  res.json({
                    code: 500,
                    message: "an error occurred on the server",
                  });
                  console.error("Error => ", err);
                  return next();
                }
                res.json({
                  code: 200,
                  message: "liked",
                });
                return next();
              }
            );
          } else {
            // DisLike Post
            PostsModel.updateOne(
              { post_path: params.post_path },
              {
                $pull: {
                  post_likes: {
                    email: data.email,
                  },
                },
              },
              (err) => {
                if (err) {
                  res.json({
                    code: 500,
                    message: "an error occurred on the server",
                  });
                  console.error("Error => ", err);
                  return next();
                }
                res.json({
                  code: 200,
                  message: "disliked",
                });
                return next();
              }
            );
          }
        });
      });
    });
  } else {
    res.json({
      code: 400,
      message: "fields incorrect",
    });
    return next();
  }
  AuthToken(params.token);
});

module.exports = router;
