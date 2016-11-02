var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shortid = require('shortid');
var storage = require('node-persist');

// a necessary hack
global.setImmediate = global.setImmediate || process.nextTick.bind(process);
storage.initSync();
storage.clearSync(); // to clear all storage, just for testing

app.get('/client.js', function(req, res){
    res.sendFile('client.js', { root: __dirname });
});

app.get('/', function(req, res) {
    //redirect to a random room
    res.redirect(shortid.generate());
});

app.get('*', function(req, res){
    res.sendFile('/views/testboard1.html', { root: __dirname });
});

io.on('connection', function(socket) {
    var room = "";
    socket.on('room', function(r) {
        room = r;
        socket.join(r);
        var notes = storage.getItemSync(room) || {};
        for (var noteId in notes) {
            // recreate notes from storage
            io.sockets.to(socket.id).emit('create', notes[noteId]);
        }
    });
    socket.on('create', function(msg) {
        var notes = storage.getItemSync(room) || {};
        var idTag = "m-" + Object.keys(notes).length;
        //console.log('create: ' + msg + "; assigning id " + idTag);
        notes[idTag] = msg;
        notes[idTag].id = idTag;
        io.sockets.in(room).emit('create', notes[idTag]);
        storage.setItemSync(room, notes);
    });

    // Broadcast note movement
    socket.on('dragging', function(msg) {
        //console.log('dragging: ' + msg.id + " to " + msg.position.top + " " + msg.position.left);
        var notes = storage.getItemSync(room) || {};
        if (msg.id in notes) {
            notes[msg.id].position = msg.position;
            socket.broadcast.in(room).emit('dragging', msg);
            storage.setItemSync(room, notes);
        }
    });

    //socket.on('drag-stop', function(msg) {
        //console.log('drag-stop: ' + msg.id + " to " + msg.top + " " + msg.left);
        //socket.broadcast.emit('drag-stop', msg);
    //});

    socket.on('deleteBoard', function() {
        storage.setItemSync(room, {});
        io.sockets.in(room).emit('deleteBoard');
    });
});

http.listen(3000, function() {
    console.log('Listening on *:3000');
});
