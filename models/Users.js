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

UserSchema.pre("save", async (next) => {
  if (this.email_verification_password) {
    this.email_verification_password = await bcrypt.hashSync(
      user.email +
        Math.floor(Math.random() * 99999999999) +
        settings.email_verification_password,
      10
    );
    console.log(
      this.email_verification_passwordthis.email_verification_password
    );
  }
});

module.exports = mongoose.model("tbl_users", UserSchema);
