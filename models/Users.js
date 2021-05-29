const mongoose = require("mongoose");
const settings = require("../settings");

const UserSchema = mongoose.Schema({
  full_name: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
  },
  access: {
    type: String,
    default: "user",
  },
  bookmarks: {
    type: Array,
    default: [],
  },
  email_verified: {
    type: Boolean,
    default: false,
  },
  email_verification_password: {
    type: String,
  },
});

module.exports = mongoose.model("tbl_users", UserSchema);
