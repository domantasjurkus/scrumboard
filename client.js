$(function () {
    var socket = io();

    socket.on('connect', function() {
        // room is defined by the URL
        socket.emit('room', window.location.pathname);
    });

    socket.on('create', function (msg) {
        var e = $(msg.element);
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
            //stop: function (event, ui) {
                //socket.emit('drag-stop', { id: event.target.id, left: ui.position.left, top: ui.position.top });
            //}
        });
        $("#board").append(e);
        if (msg.hasOwnProperty("position"))
            e.css(msg.position);
        else
            socket.emit('dragging', {id: msg.id, position: e.position()});
    });

    // Update dragged notes
    socket.on('dragging', function (msg) {
        $("#" + msg.id).css(msg.position);
    });

    socket.on('deleteBoard', function() {
        $('#board > .sb-task-note').remove();
    });

    //socket.on('drag-stop', function (msg) {
        //$("#" + msg.id).css({ left: msg.left, top: msg.top });
    //});
    $("#templates").children("svg").wrap("<span>");
    $("#templates, #templates2")
        .children()
        .click(function () {
            socket.emit('create', $(this).html());
        });
    $('#btnNewTask').on("click", function () {
        //$('#svgBox').parent().click() //Fire the click event of box
	$('#testNote').click();
    });
    $('#btnDelete').on("click", function() {
        socket.emit('deleteBoard');
    });

});
