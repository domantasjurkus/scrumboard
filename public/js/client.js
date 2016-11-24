$(function () {
    var socket = io();
    socket.on('connect', function() {
        // room is defined by the URL
        socket.emit('room', window.location.pathname);
        // make headers editable
        for (var i = 0; i < 4; i++) {
            var header = "#header" + i;
            $(header).editable("click", function(e) {
                socket.emit('edit-header', {id: e.target.attr('id'),
                                            text: e.value});
            });
        }
    });

    socket.on('create', function (msg) {
        var noteMarkup;
        $.ajax({
            url: '/note',
            success: function(markup) {
                e = $(markup);
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
                    snap: '.snap-region',
                    snapMode: 'inner',
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
                                          var note = $('#' + msg.id);
                                          // make the size larger if necessary,
                                          //but not too large
                                          var previousHeight = note.outerHeight(true);
                                          var previousWidth = note.outerWidth(true);
                                          note.css({height: 'auto', width: 'auto'});
                                          var newSize = {
                                              height: Math.min(Math.max(note.outerHeight(true) + 20, previousHeight),
                                                               note.parent().outerHeight(true)),
                                              width: Math.min(Math.max(note.outerWidth(true) + 10, previousWidth),
                                                              note.parent().outerWidth(true))
                                          };
                                          note.css(newSize);
                                          socket.emit('edit', {
                                              id: msg.id,
                                              text: e.value.replace(/\n/g, '<br />'),
                                              size: newSize
                                          });
                                      },
                                      function() {
                                          socket.emit('edit-start', msg.id);
                                      });

                e.css(msg.position);

                if (msg.hasOwnProperty('size'))
                    e.css(msg.size);
                if(msg.hasOwnProperty('color'))
                    e.css('background-color', msg.color);

                $("#" + msg.parent).append(e);

                // Color picker
                e.find(".color-square").click(function(a) {
                    var color = $(this).css("background-color");
                    socket.emit('change-color', {id: msg.id, color: color});
                    $(this).parent().parent().css('background-color', color);
                });
            }
        });
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
    
    socket.on('edit-start', function(msg) {
        $('#' + msg).addClass('sb-highlighted');
    });

    socket.on('edit', function(msg) {
        var note = $('#' + msg.id);
        note.find('h3').html(msg.text);
        note.css(msg.size);
        note.removeClass('sb-highlighted');
    });
    
    socket.on('delete', function(msg) {
        $("#" + msg).remove();
    });

    socket.on('createBoard', function(msg){
        var url = "http://localhost:3000/"+msg;
        var wind = window.open(url);
    })

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
        //console.log(msg.id + ' changed to ' + msg.text);
        $('#' + msg.id).html(msg.text);
    });

    socket.on('change-color', function(msg) {
        $('#' + msg.id).css('background-color', msg.color);
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

    $('#btnNewBoard').on("click", function() {
       socket.emit('createBoard');
    });

});
