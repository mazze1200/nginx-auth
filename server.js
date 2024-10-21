const express = require("express");
const app = express();
const port = 3000;

const myLogger = function (req, res, next) {
    console.log('LOGGED: ' + req.originalUrl)
    next()
}
app.use(myLogger);


app.get("/", (req, res) => {
    // console.log(req.originalUrl)
    console.log("[/] ");
    res.status(200).type("html").send("<h1>Hello World!<h1>");
});

app.get("/authorize", (req, res) => {
    console.log("[authorize] query: " + JSON.stringify(req.query));

    // var url = new URL(`${req.protocol}://${req.get('host')}`);

    var url = new URL("http://192.168.20.32/github_login_callback");
    url.searchParams.set("code", "1234");
    url.searchParams.set("state", req.query.state);

    console.log("[authorize] " + url);
    res.redirect(302, url);
});


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

router.get('/user', (req, res) => {
    console.log("[get user] " + req.url + " | " + req.originalUrl);
    res.send({
        login: "my_cool_login",
        name: "Me, MyName"
    });
});



router.get('/orgs/:org/teams/:team/memberships/:login', (req, res) => {
    console.log("[team memvership] team: " +req.params.team + " | " + req.originalUrl);
    res.send({
        state: "active"
    });
});

router.use((req, res, next) => {
    console.log("[router.use]" + " | " + req.originalUrl);
    res.status(404).send('protected route not found');
})

app.use('/', (req, res, next) => {
    console.log("[use user] " + JSON.stringify(req.query) + " " + JSON.stringify(req.headers) + " | " + req.originalUrl);
    if (!req.headers.authorization ||
        typeof req.headers.authorization !== 'string' ||
        !req.headers.authorization.toLowerCase().startsWith("bearer gho_")) {
        return res.status(403).json({ error: 'No credentials sent!' });
    }
    next();
}, router);

app.use((req, res, next) => {
    console.log("[app.use] " + req.url + " | " + req.originalUrl);
    res.status(404).send('open route not found');
})

app.listen(port, () => {
    console.log(`Express app listening at http://localhost:${port}`);
});

