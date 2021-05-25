const settings = require("../../settings");
const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "devsparkle.ir@gmail.com",
    pass: "Taha0406213",
  },
});

async function sendMail(params, sended) {
  await transporter.sendMail({
    from: "devsparkle.ir@gmail.com",
    to: params.to,
    subject: params.subject,
    html: params.body,
  });
  sended();
}

module.exports = {
  sendMail,
};
