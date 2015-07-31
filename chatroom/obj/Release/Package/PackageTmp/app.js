 /**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var mongo = require('mongodb').MongoClient;
//var $ = require('jquery')(require("jsdom-compat").jsdom().parentWindow);

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}

var msg = "";  //empty message, to avoid crashing of database function

app.get('/', routes.index);
app.get('/users', user.list);

// hook in sockets
var serve = http.createServer(app);
var io = require('socket.io')(serve);


// socket methods
io.on('connection', function (socket) {
    console.log('a user connected');
    
    // save messages to database, will crash if no msg variable exists
    mongo.connect(process.env.CUSTOMCONNSTR_MONGOLAB_URI, function (err, db) {
        if (err) {
            console.warn(err.message);
        } else {
            var collection = db.collection('chat messages');
            console.log('connect event');
            //display 10 messages
            var stream = collection.find().sort({ _id : -1 }).limit(10).stream();
            stream.on('data', function (chat) {
                socket.emit('chat', chat.content);
            });
            
        }
    });
    socket.on('disconnect', function () {
        socket.on('disconnect', function () {
            console.log('disconnect event');
        });
    });
   socket.on('chat', function (msg) {
        mongo.connect(process.env.CUSTOMCONNSTR_MONGOLAB_URI, function (err, db) {
            if (err) {
                console.warn(err.message);
            } else {
                var collection = db.collection('chat messages');
                collection.insert({ content: msg }, function (err, o) {
                    if (err) {
                        console.warn('err.message');
                    } else {
                        console.log('message inserted in db: ' + msg);
                    }
                });
            }
        });
        socket.broadcast.emit('chat', msg);
    });
});

serve.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
