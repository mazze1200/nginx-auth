const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.status(200).type("html").send("<h1>Hello World!<h1>");
});

app.get("/google", (req, res) => {
  res.redirect(301, "https://google.com");
});

app.use(function (req, res, next) {
  res.status(404).send("<h1>Sorry nothing found!<h1>");
});

app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});


// const http = require("http");

// const server = http.createServer(function (req, res) {});

// server.listen(3000, function () {
//   console.log("server started at port 3000");
// });
