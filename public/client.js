$(function () {
    var socket = io();

    socket.on('connect', function() {
        // room is defined by the URL
        socket.emit('room', window.location.pathname);
    });

    socket.on('create', function (msg) {
        var e = $('<div class="sb-task-note"><h3 style="margin: 0px;"></h3></div>');
        e.attr('id', msg.id);
        e.draggable({
            snap: '#board,.sb-task-note',
            containment: "parent",
            drag: function (event, ui) {
                socket.emit('dragging', {
                    id: event.target.id,
                    position: ui.position
                });
            },
        });
        e.find("h3").text(msg.text);
        e.find("h3").editable({type: "textarea", action: ""},
                              function(e) {
                                  socket.emit('edit', {id: msg.id,
                                                       text: e.value});
                              });
        e.css(msg.position);
        $("#board").append(e);
    });

    // Update dragged notes
    socket.on('dragging', function (msg) {
        $("#" + msg.id).css(msg.position);
    });

    socket.on('edit', function(msg) {
        $("#" + msg.id + " > h3").text(msg.text);
    });

    socket.on('deleteBoard', function() {
        $('#board > .sb-task-note').remove();
    });

    $('#btnNewTask').on("click", function () {
        socket.emit('create', {text: 'Your New Task!',
                               position: {top: 0, left: 0}});
    });
    $('#btnDelete').on("click", function() {
        socket.emit('deleteBoard');
    });

});
