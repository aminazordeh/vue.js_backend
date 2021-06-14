# devsparkle Backend [Node.js, MongoDB]
1- First we Create a File in project root directory 
```js
const settings = {
  listening_post: 3000,
  front_address: "http://127.0.0.1:8080",
  allow_cors: "*",
  jwt_password: "bblbblbllbblb",
  email_verification_password: "bllblblblblblblb",
  email_service: {
    address: "your-gmail@gmail.com",
    password: "your-gmail-password",
  },
  google_recaptcha_secretkey: "your-google-recatpcha-secretkey",
};

module.exports = settings;

```
2- Create a Databas in 'devsparkle' name in MongoDB  
3- run Node.js backend
```bash
yarn dev
# or
npm run dev
```
