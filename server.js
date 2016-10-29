var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/client.js', function(req, res){
	res.sendFile('client.js', { root: __dirname });
});

app.get('/socket.io.js', function(req, res){
	res.sendFile('socket.io.js', { root: __dirname });
});

app.get('/', function(req, res){
	res.sendFile('index.html', { root: __dirname });
});

var id = 0;
io.on('connection', function(socket) {
	socket.on('create', function(msg) {
		//console.log('create: ' + msg + "; assigning id m-" + id);
		io.emit('create', {id: "m-" + id++, element: msg});
	});

	// Broadcast shape movement
	socket.on('draging', function(msg) {
		//console.log('draging: ' + msg.id + " to " + msg.top + " " + msg.left);
		socket.broadcast.emit('draging', msg);
	});

	socket.on('drag-stop', function(msg) {
		//console.log('drag-stop: ' + msg.id + " to " + msg.top + " " + msg.left);
		socket.broadcast.emit('drag-stop', msg);
	});
	socket.on('transform', function(msg) {
		//console.log('transform: ' + msg);
		io.emit('transform', msg);
	});
});

http.listen(80, function(){
	console.log('Listening on *:80');
});
