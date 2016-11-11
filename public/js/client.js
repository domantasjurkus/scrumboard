$(function () {
    var socket = io();

    socket.on('connect', function() {
        // room is defined by the URL
        socket.emit('room', window.location.pathname);
        // make headers editable
        for (var i = 0; i < 4; i++) {
            $('#header' + i).editable("click", function(e) {
                socket.emit('edit-header', {id: e.target.attr('id'),
                                            text: e.value});
            });
        }
    });

    socket.on('create', function (msg) {
        var e = $('<div class="sb-task-note"><div class="sb-delete"><i class="fa fa-2x fa-times" aria-hidden="true"></i></div><h3 style="margin: 8px;"></h3></div>');
        e.children('.sb-delete').on("click",function(){
            socket.emit('delete', msg.id);
        });
        e.attr('id', msg.id);
        e.resizable({
            containment: 'parent',
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
                    parent: $(this).parent().attr('id'),
                    position: ui.position
                });
            },
            stop: function(event, ui) {
                socket.emit('drag-stop', event.target.id);
            }
        });
        e.find("h3").html(msg.text);
        e.find("h3").editable({type: "textarea", action: "click"},
                              function(e) {
                                  socket.emit('edit', {
                                      id: msg.id,
                                      text: e.value.replace(/\n/g, '<br />')
                                  });
                              });
        e.css(msg.position);

        if (msg.hasOwnProperty('size'))
            e.css(msg.size);
        
        $("#" + msg.parent).append(e);
    });

    // Update dragged notes
    socket.on('dragging', function (msg) {
        var note = $("#" + msg.id);
        $("#" + msg.parent).append(note);
        note.css(msg.position);
    });

    socket.on('resizing', function(msg) {
        $("#" + msg.id).css(msg.size);
    });

    socket.on('edit', function(msg) {
        $("#" + msg.id + " > h3").html(msg.text);
    });
    
    socket.on('delete', function(msg) {
        $("#" + msg).remove();
    });

    socket.on('deleteBoard', function() {
        $('.sb-task-note').remove();
    });

    socket.on('enable', function(msg) {
        $('#' + msg).draggable('enable').resizable('enable');
    });

    socket.on('disable', function(msg) {
        $('#' + msg).draggable('disable').resizable('disable');
    });

    socket.on('edit-header', function(msg) {
        $('#' + msg.id).html(msg.text);
    });

    $('#btnNewTask').on("click", function () {
        socket.emit('create', {text: 'Your New Task!',
                               position: {top: 0, left: 0},
                               parent: 'backlog'});
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

    $('#btnShare').on("click", function() {
    	var pic = "static/images/img" +  (Math.floor(Math.random() * 5) + 1) + ".jpg"; 
       	swal({
  	    title: "Your URL:",
  	    text: window.location.href,
  	    imageUrl: pic
	});
    });

});
