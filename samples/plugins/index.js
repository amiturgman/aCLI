var express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    path = require('path'),
    somePlugin = require('./api/someplugin'),
    port = process.env.PORT || 4000,
    app = express();

process.chdir(__dirname);

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// adding plugin to app
app.use('/someplugin', somePlugin.router);

app.use(express.static(path.join(__dirname, "static")));

app.listen(port);

console.log('listening on port', port);