const settings = require("../../settings");
const nodemailer = require("nodemailer");

const mail = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: settings.email_service.address,
    pass: settings.email_service.password,
  },
});

function sendMail(opts, sended) {
  const mailOpions = {
    from: settings.email_service.address,
    to: opts.to,
    subject: opts.subject,
    html: opts.body,
  };
  mail.sendMail(opts, function (error, response) {
    if (error) {
      return console.error(error);
    }
    sended();
  });
}

module.exports = {
  sendMail,
};
