const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    // console.log(req.originalUrl)
    res.status(200).type("html").send("<h1>Hello World!<h1>");
});

app.get("/authorize", (req, res) => {
    var url = new URL(`${req.protocol}://${req.get('host')}`);
    url.searchParams.set("code", "1234");
    console.log(url);
    res.redirect(302, url);
});

app.post("/access_token", (req, res) => {
    if (req.query.code && typeof req.query.code === 'string') {
        console.log(req.query.code);
        res.send({
            access_token: "gho_" + req.query.code,
            scope: "repo,gist",
            token_type: "bearer"
        });
    } else {
        console.log("code paramter is missing or not a string");
        res.send({});
    }
});

const router = express.Router();

router.get('/', (req, res) => {
    res.send({
        user: "me",
        name: "Me, MyName"
    });
});

router.use((req, res, next) => {
  res.status(404).send('protected route not found');
})

app.use('/user', (req, res, next) => {
  if (!req.headers.authorization ||
    typeof req.headers.authorization !== 'string' ||
    !req.headers.authorization.startsWith("Bearer gho_")) {
    return res.status(403).json({ error: 'No credentials sent!' });
  }
  next();
}, router);

app.use((req, res, next) => {
  res.status(404).send('open route not found');
})


app.listen(port, () => {
    console.log(`Express app listening at http://localhost:${port}`);
});


// const http = require("http");

// const server = http.createServer(function (req, res) {});

// server.listen(3000, function () {
//   console.log("server started at port 3000");
// });
