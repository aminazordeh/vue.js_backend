const mongoose = require("mongoose");
const settings = require("../settings");

const PostsSchema = mongoose.Schema({
  post_path: {
    type: String,
    required: true,
  },
  post_header: {
    type: String,
    required: true,
  },
  post_content: {
    type: String,
    required: true,
  },
  post_author_id: {
    type: String,
    required: true,
  },
  post_cover_img: {
    type: String,
    required: true,
  },
  post_cover_text: {
    type: String,
    required: true,
  },
  post_likes: {
    type: Array,
    default: [],
  },
  post_comments: {
    type: Array,
    default: [],
  },
  post_publish: {
    type: Boolean,
    default: false,
  },
  post_publish_date: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("tbl_posts", PostsSchema);
