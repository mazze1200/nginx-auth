const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    // console.log(req.originalUrl)
    console.log("[/] ");
    res.status(200).type("html").send("<h1>Hello World!<h1>");
});

app.get("/authorize", (req, res) => {
    // var url = new URL(`${req.protocol}://${req.get('host')}`);
    
    var url = new URL("http://192.168.20.32/_github_login");
    url.searchParams.set("code", "1234");
    console.log("[authorize] " + url);
    res.redirect(302, url);
});


// app.get("/access_token", (req, res) => {
//     console.log("[access_token get] ");
//     const code = req.query.code;
//     // const code = req.body.code;

//     console.log("[access_token] code:" + code);

//     if (code && typeof code === 'string') {
//         console.log(code);
//         res.send({
//             access_token: "gho_" + code,
//             scope: "repo,gist",
//             token_type: "bearer"
//         });
//     } else {
//         console.log("code paramter is missing or not a string");
//         res.send({});
//     }
// });

app.post("/access_token", (req, res) => {
    console.log("[access_token post] body: " + req.body + " query: " + JSON.stringify(req.query));
    const code = req.query.code;
    // const code = req.body.code;

    console.log("[access_token] code:" + code);

    if (code && typeof code === 'string') {
        console.log(code);
        res.send({
            access_token: "gho_" + code,
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
    console.log("[get user] ");
    res.send({
        user: "me",
        name: "Me, MyName"
    });
});

router.use((req, res, next) => {
    console.log("[router.use]");
    res.status(404).send('protected route not found');
})

app.use('/user', (req, res, next) => {
    console.log("[use user] " + JSON.stringify(req.query) + " "  + JSON.stringify(req.headers) );
    if (!req.headers.authorization ||
        typeof req.headers.authorization !== 'string' ||
        !req.headers.authorization.toLowerCase().startsWith("bearer gho_")) {
        return res.status(403).json({ error: 'No credentials sent!' });
    }
    next();
}, router);

app.use((req, res, next) => {
    console.log("[app.use]");
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
