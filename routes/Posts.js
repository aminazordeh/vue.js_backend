const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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

function saveState(req, res, post_author_id) {
  return new Promise(async (_success, _error) => {
    const date__now = new persianDate();
    let date = date__now.year() + "/" + date__now.month() + "/" + date__now.day();
    let post = req.post;
    post.post_header = req.body.post_header;
    post.post_content = req.body.post_content;
    post.post_cover_img = req.body.post_cover_img;
    post.post_cover_text = req.body.post_cover_text;
    post.post_publish_date = date.trim();
    post.post_author_id = post_author_id;

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
    if (findedPost != undefined && findedPost != null && findedPost.length != 0) {
      const Writer_Name = await UsersModel.findById(findedPost.post_author_id);
      if (Writer_Name != undefined && Writer_Name != null && Writer_Name != "") {
        function getUserFullName(user_id) {
          return new Promise(async (full_name) => {
            try {
              const getUser_FullName = await UsersModel.findById(user_id);
              if (getUser_FullName != undefined && getUser_FullName != null) {
                full_name(getUser_FullName.full_name);
              } else return "";
            } catch (error) {
              return "";
            }
          });
        }
        let post = {
          post_header: findedPost.post_header,
          post_content: findedPost.post_content,
          post_cover_img: findedPost.post_cover_img,
          post_cover_text: findedPost.post_cover_text,
          post_publish_date: findedPost.post_publish_date,
          post_author: Writer_Name.full_name,
          post_path: findedPost.post_path,
          post_likes: false,
          you_are_liked_this_post: false,
          post_comments: findedPost.post_comments,
        };
        let item_processed = 0;
        if (post.post_comments != undefined && post.post_comments != null && post.post_comments.length > 0) {
          await post.post_comments.forEach(async (item, index) => {
            try {
              await getUserFullName(item.comment_sender_id).then(async (full_name) => {
                item["comment_sender_name"] = full_name;
                item["show_reply_message"] = false;
              });

              item_processed++;
            } catch (error) {
              console.error("error in get post sender name with sender_id", error);
            }
            if (item_processed == post.post_comments.length) {
              if (item.replies != undefined && item.replies != null && item.replies.length > 0) {
                let item_processed2 = 0;
                await item.replies.forEach(async (item2, index2) => {
                  try {
                    await getUserFullName(item2.comment_sender_id).then(async (full_name) => {
                      item2["comment_sender_name"] = full_name;
                      item2["show_reply_message"] = false;
                    });

                    item_processed2++;
                  } catch (error) {
                    console.error("error in get post sender name with sender_id", error);
                  }
                  if (item_processed2 == post.post_comments[index].replies.length) {
                    if (item2.replies != undefined && item2.replies != null && item2.replies.length > 0) {
                      let item_processed3 = 0;
                      await item2.replies.forEach(async (item3, index3) => {
                        try {
                          await getUserFullName(item3.comment_sender_id).then(async (full_name) => {
                            item3["comment_sender_name"] = full_name;
                            item3["show_reply_message"] = false;
                          });
                          item_processed3++;
                        } catch (error) {
                          console.error("error in get post sender name with sender_id", error);
                        }
                        if (item_processed3 == post.post_comments[index].replies[index2].replies.length) {
                          setUsersFullName_Finished();
                        }
                      });
                    } else {
                      setUsersFullName_Finished();
                    }
                  }
                });
              } else {
                setUsersFullName_Finished();
              }
            }
          });
        } else {
          setUsersFullName_Finished();
        }
        function setUsersFullName_Finished() {
          if (getforuser == false || getforuser == undefined || getforuser == null) {
            post.post_likes = findedPost.post_likes;
          } else {
            if (__email != undefined && __email != null && __email != "") {
              const likes = findedPost.post_likes;
              if (likes.find(({ email }) => email === __email) != undefined) {
                post.you_are_liked_this_post = true;
              } else {
                post.you_are_liked_this_post = false;
              }
            }
            post.post_likes = findedPost.post_likes.length;
          }
          exist(post);
        }
      } else {
        not_exist();
      }
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

router.post("/get_post", async (req, res, next) => {
  const post_path = req.body.post_path;
  const email = req.body.email;
  if (String(post_path).trim() != "" && post_path != undefined && post_path != null) {
    getPost(post_path, true, email == undefined || email == "" ? undefined : email).then(
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
    AuthToken(user.token, user.email, req, res, next).then(async () => {
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
                saveState(req, res, data._id).then(
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
    AuthToken(params.token, params.email, req, res, next).then(() => {
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
});

router.post("/comments/new", async (req, res, next) => {
  const date__now = new persianDate();
  let date = date__now.year() + "/" + date__now.month() + "/" + date__now.day();
  const user = {
    email: req.body.email,
    password: req.body.password,
    token: req.body.token,
  };
  const comment = {
    comment_id: await mongoose.Types.ObjectId(),
    comment_content: req.body.comment_content,
    comment_send_date: date,
    reply_to: req.body.reply_to,
    post_path: req.body.post_path,
    replies: [],
  };
  if (
    // user
    user.email != undefined &&
    user.email != null &&
    user.email != "" &&
    user.password != undefined &&
    user.password != null &&
    user.password != "" &&
    user.token != undefined &&
    user.token != null &&
    user.token != "" &&
    // comment
    comment.comment_content != undefined &&
    comment.comment_content != null &&
    comment.comment_content != "" &&
    comment.post_path != undefined &&
    comment.post_path != null &&
    comment.post_path != ""
  ) {
    AuthToken(user.token, user.email, req, res, next).then(() => {
      userLogin(user.email, user.password, req, res, next).then(async (data) => {
        if (comment.reply_to != undefined && comment.reply_to != null && comment.reply_to != "") {
          getPost(comment.post_path, true, undefined).then(
            async (post) => {
              // Push to 'post_comments' replies
              let post_finded_state = false;
              post.post_comments.forEach(async (item, index) => {
                if (item.comment_id == comment.reply_to) {
                  post_finded_state = true;
                  const comment_to_insert = {};
                  comment_to_insert[`post_comments.${index}.replies`] = {
                    comment_id: comment.comment_id,
                    comment_sender_id: data._id,
                    comment_send_date: comment.comment_send_date,
                    comment_content: comment.comment_content,
                    replies: [],
                  };
                  let update_result = await PostsModel.updateOne(
                    {
                      post_path: comment.post_path,
                    },
                    {
                      $push: comment_to_insert,
                    }
                  );
                  if (update_result.ok == 1) {
                    res.json({
                      code: 200,
                      message: "comment sended successfully",
                    });
                    return next();
                  } else {
                    console.error(update_result);
                    res.json({
                      code: 503,
                      message: "error in insert comment",
                    });
                    return next();
                  }
                }
              });
              if (post_finded_state == false) {
                post.post_comments.forEach((item, index) => {
                  item.replies.forEach(async (item2, index2) => {
                    if (item2.comment_id == comment.reply_to) {
                      post_finded_state = true;
                      const comment_to_insert = {};
                      comment_to_insert[`post_comments.${index}.replies.${index2}.replies`] = {
                        comment_id: comment.comment_id,
                        comment_sender_id: data._id,
                        comment_send_date: comment.comment_send_date,
                        comment_content: comment.comment_content,
                        replies: [],
                      };
                      let update_result = await PostsModel.updateOne(
                        {
                          post_path: comment.post_path,
                        },
                        {
                          $push: comment_to_insert,
                        }
                      );
                      if (update_result.ok == 1) {
                        res.json({
                          code: 200,
                          message: "comment sended successfully",
                        });
                        return next();
                      } else {
                        res.json({
                          code: 503,
                          message: "error in insert comment",
                        });
                        return next();
                      }
                    }
                  });
                });
              }
              if (post_finded_state == false) {
                post.post_comments.forEach((item, index) => {
                  item.replies.forEach((item2, index2) => {
                    item2.replies.forEach(async (item3, index3) => {
                      if (item3.comment_id == comment.reply_to) {
                        post_finded_state = true;
                        const comment_to_insert = {};
                        comment_to_insert[`post_comments.${index}.replies.${index2}.replies.${index3}.replies`] = {
                          comment_id: comment.comment_id,
                          comment_sender_id: data._id,
                          comment_send_date: comment.comment_send_date,
                          comment_content: comment.comment_content,
                          last_comment: true,
                        };
                        let update_result = await PostsModel.updateOne(
                          {
                            post_path: comment.post_path,
                          },
                          {
                            $push: comment_to_insert,
                          }
                        );
                        if (update_result.ok == 1) {
                          res.json({
                            code: 200,
                            message: "comment sended successfully",
                          });
                          return next();
                        } else {
                          res.json({
                            code: 503,
                            message: "error in insert comment",
                          });
                          return next();
                        }
                      }
                    });
                  });
                });
              }
              if (post_finded_state == false) {
                res.json({
                  code: 404,
                  message: "post not found",
                });
                return next();
              }
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
          const findedPost = await PostsModel.findOneAndUpdate(
            {
              post_path: comment.post_path,
            },
            {
              $push: {
                post_comments: {
                  comment_id: comment.comment_id,
                  comment_sender_id: data._id,
                  comment_send_date: comment.comment_send_date,
                  comment_content: comment.comment_content,
                  replies: [],
                },
              },
            }
          );
          res.json({
            code: 200,
            message: "comment sended successfully",
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

module.exports = router;

// {
//   comment_id: comment.comment_id,
//   comment_sender_id: data._id,
//   comment_send_date: comment.comment_send_date,
//   comment_content: comment.comment_content,
//   replies: [],
// };
