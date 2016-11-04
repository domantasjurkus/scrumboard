var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shortid = require('shortid');
var storage = require('node-persist');
var path = require('path');

// a necessary hack
global.setImmediate = global.setImmediate || process.nextTick.bind(process);
storage.initSync();
storage.clearSync(); // to clear all storage, just for testing

app.use('/', express.static(path.join(__dirname + '/public')));
// app.use('/static', express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    //redirect to a random room
    res.redirect(shortid.generate());
});
app.get('*', function(req, res){
    res.sendFile('/public/index.html', { root: __dirname });
});

function getState(room) {
    return storage.getItemSync(room) || {notes: {}, undo: [], redo: []};
}

function clone(obj) {
    if (obj == null || typeof obj != "object")
        return obj;
    var copy = obj.constructor();
    for (var attr in obj)
        if (obj.hasOwnProperty(attr))
            copy[attr] = clone(obj[attr]);
    return copy;
}

function registerUndo(state) {
    state.redo = [];
    state.undo.push(clone(state.notes));
}

io.on('connection', function(socket) {
    var room = "";

    // recreate the whole board, can be sent to one or multiple clients
    function createState(notes, room) {
        io.sockets.to(room).emit('deleteBoard');
        for (var id in notes) {
            io.sockets.to(room).emit('create', notes[id]);
        }
    }

    socket.on('room', function(r) {
        room = r;
        socket.join(r);
        createState(getState(room).notes, socket.id);
    });

    socket.on('create', function(msg) {
        var state = getState(room);
        var idTag = "m-" + Object.keys(state.notes).length;
        //console.log('create: ' + msg + "; assigning id " + idTag);
        registerUndo(state);
        state.notes[idTag] = msg;
        state.notes[idTag].id = idTag;
        io.sockets.in(room).emit('create', state.notes[idTag]);
        storage.setItemSync(room, state);
    });

    // Broadcast note movement
    socket.on('dragging', function(msg) {
        //console.log('dragging: ' + msg.id + " to " + msg.position.top + " " + msg.position.left);
        var state = getState(room);
        if (msg.id in state.notes) {
            // note: no registerUndo, we do it at the drag-start event
            state.notes[msg.id].position = msg.position;
            socket.broadcast.in(room).emit('dragging', msg);
            storage.setItemSync(room, state);
        }
    });

     socket.on('drag-start', function(msg) {
        var state = getState(room);
        var previousState = clone(state.notes);
        if (msg.id in previousState) {
            state.redo = [];
            previousState[msg.id].position = msg.position;
            state.undo.push(previousState);
            storage.setItemSync(room, state);
        }
    });
   
    socket.on('resizing', function(msg) {
        var state = getState(room);
        if (msg.id in state.notes) {
            // note: no registerUndo, we do it at the resize-start event
            state.notes[msg.id].size = msg.size;
            socket.broadcast.in(room).emit('resizing', msg);
            storage.setItemSync(room, state);
        }
    });
    
    socket.on('resize-start', function(msg) {
        var state = getState(room);
        var previousState = clone(state.notes);
        if (msg.id in previousState) {
            state.redo = [];
            previousState[msg.id].size = msg.size;
            state.undo.push(previousState);
            storage.setItemSync(room, state);
        }
    });

    socket.on('edit', function(msg) {
        //console.log('edit: ' + msg.id + ' changed to ' + msg.text);
        var state = getState(room);
        if (msg.id in state.notes) {
            registerUndo(state);
            state.notes[msg.id].text = msg.text;
            socket.broadcast.in(room).emit('edit', msg);
            storage.setItemSync(room, state);
        }
    });
    
    socket.on('undo', function() {
        var state = getState(room);
        if (state.undo.length > 0) {
            state.redo.push(clone(state.notes));
            state.notes = state.undo.pop();
            createState(state.notes, room);
            storage.setItemSync(room, state);
        }
    });
    
    socket.on('redo', function() {
        var state = getState(room);
        if (state.redo.length > 0) {
            state.undo.push(clone(state.notes));
            state.notes = state.redo.pop();
            createState(state.notes, room);
            storage.setItemSync(room, state);
        }
    });

    socket.on('deleteBoard', function() {
        var state = getState(room);
        registerUndo(state);
        state.notes = {};
        io.sockets.in(room).emit('deleteBoard');
        storage.setItemSync(room, state);
    });
});

http.listen(3000, function() {
    console.log('Listening on *:3000');
});
