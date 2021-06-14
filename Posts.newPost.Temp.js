if (findedUser.access == "admin" || findedUser.access == "writer") {
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
