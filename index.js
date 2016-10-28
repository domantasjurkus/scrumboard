var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){

  console.log('Connected: ', socket.id);
  console.log(socket.rooms);

  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    io.emit('chat message', msg);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  // Emit an event for the front-end
  socket.on('typing', function(bool) {
    socket.broadcast.emit('typing', bool);
  })

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});