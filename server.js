const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const ejs = require("ejs");

console.clear();

app.set("view engine", "ejs");

const settings = require("./settings");

app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: settings.allow_cors,
  })
);

mongoose.connect("mongodb://localhost/devsparkle", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// Routes
const IndexRoutes = require("./routes/Index");
app.use("/", IndexRoutes);

const UsersRoutes = require("./routes/Users");
app.use("/users", UsersRoutes);

const PostsRoutes = require("./routes/Posts");
app.use("/posts", PostsRoutes);
// End Routes

app.listen(settings.listening_post, () => {
  console.log(`Server has running at port ${settings.listening_post}`);
});
