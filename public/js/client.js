$(function () {
    var socket = io();

    socket.on('connect', function() {
        // room is defined by the URL
        socket.emit('room', window.location.pathname);
    });

    socket.on('create', function (msg) {
        var e = $('<div class="sb-task-note"><div class="sb-delete"><i class="fa fa-2x fa-times" aria-hidden="true"></i></div><h3 style="margin: 8px;"></h3></div>');
        e.children('.sb-delete').on("click",function(){
            socket.emit('delete', msg.id);
        });
        e.attr('id', msg.id);
        e.resizable({
            containment: "#board",
            resize: function (event, ui) {
                socket.emit('resizing', {id: event.target.id, size: ui.size});
            },
            start: function(event, ui) {
                socket.emit('resize-start', {id: event.target.id,
                                             size: ui.originalSize});
            }
        });
        e.draggable({
            snap: '.sb-resize,.sb-task-note',
            containment: "#board",
            snapTolerance: 25,
            start: function(event, ui) {
                $(this).addClass('noclick');
                socket.emit('drag-start', {id: event.target.id,
                                           position: ui.originalPosition});
            },
            drag: function (event, ui) {
                socket.emit('dragging', {
                    id: event.target.id,
                    position: ui.position
                });
            }
        });
        e.find("h3").text(msg.text);
        e.find("h3").editable({type: "textarea", action: "click"},
                              function(e) {
                                  socket.emit('edit', {id: msg.id,
                                                       text: e.value});
                              });
        e.css(msg.position);

        if (msg.hasOwnProperty('size'))
            e.css(msg.size);
        
        $("#backlog").append(e);
    });

    // Update dragged notes
    socket.on('dragging', function (msg) {
        $("#" + msg.id).css(msg.position);
    });

    socket.on('resizing', function(msg) {
        $("#" + msg.id).css(msg.size);
    });

    socket.on('edit', function(msg) {
        $("#" + msg.id + " > h3").text(msg.text);
    });
    
    socket.on('delete', function(msg) {
        $("#" + msg).remove();
    });

    socket.on('deleteBoard', function() {
        $('.sb-task-note').remove();
    });

    $('#btnNewTask').on("click", function () {
        socket.emit('create', {text: 'Your New Task!',
                               position: {top: 0, left: 0}});
    });
    $('#btnUndo').on("click", function() {
        socket.emit('undo');
    });
    $('#btnRedo').on("click", function() {
        socket.emit('redo');
    });
    $('#btnDelete').on("click", function() {
        socket.emit('deleteBoard');
    });

});
