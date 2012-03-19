var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    docRouter = require('docrouter').DocRouter,
    url = require('url'),
    somePlugin = require('./api/someplugin'),
    port = process.env.PORT || 4000,
    app = express.createServer();

process.chdir(__dirname);

app.use(express.bodyParser());
app.use(express.favicon());
app.use(express.cookieParser());

// adding plugin to app
app.use('/someplugin', somePlugin);

app.use(docRouter(express.router, "/", function (app) {

        app.get('/', function(req, res) {
            res.redirect('/index.html');
        });

}));

app.use(express.static(path.join(__dirname, "static")));

app.listen(port);

console.log('listening on port', port);