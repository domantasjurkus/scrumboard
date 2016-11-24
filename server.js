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

app.use('/static', express.static(path.join(__dirname + '/public')));

app.get('/note', function(req, res) {
    res.sendFile('/public/note_markup.html', { root: __dirname });
});

app.get('/', function(req, res) {
    //redirect to a random room
    res.redirect(shortid.generate());
});

app.get('*', function(req, res){
    res.sendFile('/public/index.html', { root: __dirname });
});

function getState(room) {
    var emptyState = {state: {notes: {}, headers: {'header0': 'Backlog',
                                                   'header1': 'To do',
                                                   'header2': 'In Progress',
                                                   'header3': 'Done'}},
                      undo: [], redo: []};
    emptyState.nextId = 0;
    return storage.getItemSync(room) || emptyState;
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
    state.undo.push(clone(state.state));
}

io.on('connection', function(socket) {
    var room = "";

    // recreate the whole board, can be sent to one or multiple clients
    function createState(state, room) {
        io.sockets.to(room).emit('deleteBoard');
        for (var id in state.notes)
            io.sockets.to(room).emit('create', state.notes[id]);
        for (var id in state.headers) {
            io.sockets.to(room).emit('edit-header', {id: id,
                                                     text: state.headers[id]});
        }
    }

    socket.on('room', function(r) {
        room = r;
        socket.join(r);
        createState(getState(room).state, socket.id);
    });

    socket.on('create', function(msg) {
        var state = getState(room);
        //console.log('create: ' + msg + "; assigning id " + idTag);
        registerUndo(state);
        var idTag = "m-" + state.nextId++;
        state.state.notes[idTag] = msg;
        state.state.notes[idTag].id = idTag;
        io.sockets.in(room).emit('create', state.state.notes[idTag]);
        storage.setItemSync(room, state);
    });

    // Broadcast note movement
    socket.on('dragging', function(msg) {
        //console.log('dragging: ' + msg.id + " to " + msg.position.top + " " + msg.position.left);
        var state = getState(room);
        if (msg.id in state.state.notes) {
            // note: no registerUndo, we do it at the drag-start event
            state.state.notes[msg.id].parent = msg.parent;
            state.state.notes[msg.id].position = msg.position;
            socket.broadcast.in(room).emit('dragging', msg);
            storage.setItemSync(room, state);
        }
    });

     socket.on('drag-start', function(msg) {
        var state = getState(room);
        var previousState = clone(state.state);
        if (msg.id in previousState.notes) {
            socket.broadcast.in(room).emit('disable', msg.id);
            state.redo = [];
            previousState.notes[msg.id].position = msg.position;
            state.undo.push(previousState);
            storage.setItemSync(room, state);
        }
    });

    socket.on('drag-stop', function(msg) {
        socket.broadcast.in(room).emit('enable', msg);
    });

    socket.on('resizing', function(msg) {
        var state = getState(room);
        if (msg.id in state.state.notes) {
            // note: no registerUndo, we do it at the resize-start event
            state.state.notes[msg.id].size = msg.size;
            socket.broadcast.in(room).emit('resizing', msg);
            storage.setItemSync(room, state);
        }
    });
    
    socket.on('resize-start', function(msg) {
        var state = getState(room);
        var previousState = clone(state.state);
        if (msg.id in previousState) {
            state.redo = [];
            previousState.notes[msg.id].size = msg.size;
            state.undo.push(previousState);
            storage.setItemSync(room, state);
        }
    });
    
    socket.on('edit-start', function(msg) {
        socket.broadcast.in(room).emit('edit-start', msg);
    });

    socket.on('edit', function(msg) {
        //console.log('edit: ' + msg.id + ' changed to ' + msg.text);
        var state = getState(room);
        if (msg.id in state.state.notes) {
            registerUndo(state);
            state.state.notes[msg.id].text = msg.text;
            state.state.notes[msg.id].size = msg.size;
            socket.broadcast.in(room).emit('edit', msg);
            storage.setItemSync(room, state);
        }
    });

    socket.on('edit-header', function(msg) {
        //console.log('edit-header: ' + msg.id + ' changed to ' + msg.text);
        var state = getState(room);
        registerUndo(state);
        state.state.headers[msg.id] = msg.text;
        socket.broadcast.in(room).emit('edit-header', msg);
        storage.setItemSync(room, state);
    });
    
    socket.on('delete', function(msg) {
        var state = getState(room);
        if (msg in state.state.notes) {
            registerUndo(state);
            delete state.state.notes[msg];
            io.sockets.in(room).emit('delete', msg);
        }
    });

    socket.on('change-color', function(msg) {
        var state = getState(room);
        if (msg.id in state.state.notes) {
            registerUndo(state);
            state.state.notes[msg.id].color = msg.color;
            socket.broadcast.in(room).emit('change-color', msg);
        }
    });
    
    socket.on('undo', function() {
        var state = getState(room);
        if (state.undo.length > 0) {
            state.redo.push(clone(state.state));
            state.state = state.undo.pop();
            createState(state.state, room);
            storage.setItemSync(room, state);
        }
    });
    
    socket.on('redo', function() {
        var state = getState(room);
        if (state.redo.length > 0) {
            state.undo.push(clone(state.state));
            state.state = state.redo.pop();
            createState(state.state, room);
            storage.setItemSync(room, state);
        }
    });

    socket.on('deleteBoard', function() {
        var state = getState(room);
        registerUndo(state);
        state.state.notes = {};
        io.sockets.in(room).emit('deleteBoard');
        storage.setItemSync(room, state);
    });

    socket.on('createBoard', function(msg) {
        io.sockets.in(room).emit('createBoard',shortid.generate());
        
    });
});

http.listen(3000, function() {
    console.log('Listening on *:3000');
});
