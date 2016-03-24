var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var $ = require('jquery');
var routes = require('./routes/index');
var users = require('./routes/users');
var _ = require('underscore');
var fs = require('fs');
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var ObjectID = require('mongodb').ObjectID;

var app = express();

var MongoStore = require('connect-mongo/es5')(session);

var db = new Db('tutor',
    new Server("localhost", 27017,
        {safe: true},
        {auto_reconnect: true},
        {})
);

var arrayContainsObject = function (obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (_.isEqual(list[i], obj)) {
            return true;
        }
    }

    return false;
};

db.open(function () {
    console.log("mongo db connection is opened");
    db.collection('notes', function (error, notes) {
        db.notes = notes;
    });
    db.collection('sections', function (error, sections) {
        db.sections = sections;
    });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'images/angular-icon.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

app.get("/sections", function (req, res) {
    db.sections.find(req.query).toArray(function (err, items) {
        res.send(items);
    });
});

app.get("/tags", function (req, res) {
    var query = req.query.query;
    var section = req.query.section;
    var tags = [];
    db.notes.find({section: section}).toArray(function (err, items) {
        if (err) {
            res.end();
        } else {
            if (!items || items.length == 0) {
                res.end();
            } else {
                notesLoop:for (var i = 0; i < items.length; i++) {
                    if (!items[i].tags || items[i].tags.length == 0) {
                        continue notesLoop;
                    } else {
                        for (var j = 0; j < items[i].tags.length; j++) {
                            if (items[i].tags[j].text.match(new RegExp("^" + query, "i")) && !arrayContainsObject(items[i].tags[j], tags)) {
                                tags.push(items[i].tags[j]);
                            }
                        }
                    }
                }
                res.send(tags);
            }
        }
    });
});

app.post("/sections/replace", function (req, resp) {
    if (req.body.length == 0) {
        resp.end();
    }
    db.sections.remove({}, function (err, res) {
        if (err) {
            console.log(err);
        }
        db.sections.insert(req.body, function (err, res) {
            if (err) {
                console.log("Error after insert", err);
            }
            resp.end();
        });
    })
});

app.get("/notes", function (req, res) {
    var sortBy = req.query.sortBy;
    var section = req.query.section;
    var sortDirection = sortBy === "addedAt" ? 'desc' : 'asc';
    var options = {"sort": [[sortBy, sortDirection]]};
    db.notes.find({section: section}, options).toArray(function (err, items) {
        res.send(items);
    });
});

app.post("/notes", function (req, res) {
    var note = req.body;
    note.addedAt = new Date().getTime();
    note.order = 0;

    db.notes.insert(note, function () {
        res.end();
    });

});

app.delete("/notes", function (req, res) {
    var id = new ObjectID(req.query.id);
    db.notes.remove({_id: id}, function (err) {
        if (err) {
            console.log(err);
            res.send({status: "Failed", clazz: "text-danger"});
        } else {
            res.send({status: "Success", clazz: "text-success"});
        }
    });
});

app.put("/notes", function (req, res) {
    var id = new ObjectID(req.body.params.id);
    var section = req.body.params.section;
    var firstItem;
    var order;
    var options = {"sort": [["order", 'asc']], limit: 1};

    db.notes.find({section: section}, options).toArray(function (err, items) {
        if (err) {
            res.send({status: "Failed", clazz: "text-danger"});
        } else {
            firstItem = items[0];
            order = firstItem.order - 1;
            db.notes.update({_id: id}, {$set: {order: order}});
            res.end();
        }
    });
});

app.put("/notes/edit", function (req, res) {
    var note = req.body;
    note._id = new ObjectID(note._id);
    var id = note._id;

    db.notes.update({_id: id}, {$set: note}, function () {
        res.end();
    });

});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
