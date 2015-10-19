// Many of the comments and logic in this and associated files are inspired by or copied from socket.io/get-started/chat/ and more from their website.

// ! Global Variables Section !
var express = require('express');
var app = express();

// wraps http server in socket.io ?
var http = require('http').Server(app);


// The main idea behind Socket.IO is that you can send and receive any events you want, with any data you want. Any objects that can be encoded as JSON will do, and binary data is supported too.
// Notice that I initialize a new instance of socket.io by passing the http (the HTTP server) object
var io = require('socket.io')(http);

var filesys = require('fs');

// Sets nL to system specific newline character. In Unix like systems it's "\n" but in Windows it's "\n\r".
var nL = require('os').EOL;
// ! End of Global Variables Section !

// ! Central Function Calls Section !
// These are the central functions of the program. They should be completely independent of each other.
startServingContent();
handleClientConnects();
handleServerShutdown();
handleServerError();
// ! End of Central Function Calls Section !

// ! Central Functions' Definitions Section !

// Handles inital page request and assets requested by that page
function startServingContent() {
  // when there is an http request to specified path (/), the res object gets sent as http response.
  app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
  }); 

  /* sets up static server. Will serve exact paths to assets. Example path: localhost:3000/assets/Yahhoo.wav.
  Without the static server no assets on host machine are accessible by the app. */
  app.use(express.static(__dirname + '/public'));

  // Finishes serving initialization by starting server listening
  var port = 3000;
  http.listen(port, function(){
    console.log('listening on ' + port.toString());
  });
};



// Handles initial client connection and data interchange between server and client after that
function handleClientConnects() {

  // Event listener, runs  callback function on a client (socket) connnection event that handles/takes care of this specific client connection
  io.on('connection', function(socket){

    //console.log(io.engine.clientsCount);

    registerClientConnect();
    
    // Tells all clients, the console, and the log that this client (socket) has connected
    function registerClientConnect() {
      registerClientState(socket, 'connected');
    }
    
    
  

    // Does stuff when this client disconnects
    socket.on('disconnect', function () {
      
      registerClientDisconnect();
      
      // Tells all clients, the console, and the log that this client (socket) has disconnected
      function registerClientDisconnect() {
        registerClientState(socket, 'disconnected');
      };
    });


    // Does stuff when client sends a 'chat message' event to the server
    socket.on('chat message', function(msg) {
      
      console.log(socket.handshake.address + ' says: ' + msg);
      filesys.appendFile(__dirname + '/log/log.txt', socket.handshake.address +' says: ' + msg + nL, function(err) {
        if (err) throw err;
      });
      
      // Emits a 'chat message' event to all clients but the current client (the one that sent the message)
      socket.broadcast.emit('chat message', socket.handshake.address + ' says: ' + msg);
      
      // Emits the client's 'chat message' back to itself but under a new event name so the client knows it is receiving
      // its own message and can then handle it differently from other clients' messages, if necessary.
      socket.emit('own chat message', socket.handshake.address + ' says: ' + msg);
    });

  });
  
  // This function is used to tell all clients, the console, and the log, the state of the client (as described by a string argument)
  // E.G. given that stateChangeDescriptor = 'disconnected', this function will cause a printing of '<example ip> disconnected' to
  // all clients, the console, and the log. 
  function registerClientState(socket, stateChangeDescriptor) {
    var textToRegister = socket.handshake.address + " " + stateChangeDescriptor;
    io.emit('chat message', textToRegister);
    console.log(textToRegister);
    filesys.appendFile(__dirname + '/log/log.txt', textToRegister + nL, function(err) {
      if (err) throw err;
    });
  };
};



function handleServerShutdown() {
  // if it's inside the connection event listener when server is shut down as many times as the connection was ever initiated will be how many times alertServerShutdown() runs.
  // catch ctrl+c event and exit normally
  // (Don't exit the server by clicking the X button of the terminal. Use 'Ctrl + C'! If you don't the 'Warning: Server hutting down!' message won't be sent.)
  process.on('SIGINT', function (code) {
    alertServerShutdown();
    setTimeout(function() {process.exit(2)}, 1000);
    
    function alertServerShutdown() {
    var msg = 'Warning: Server shutting down!';
    io.emit("chat message", msg);
    console.log(msg);
    }
  });
};


function handleServerError() {
//catches uncaught exceptions
    process.on('uncaughtException', function(ev) {io.emit('chat message', 'Warning: Server error! You may become disconnected soon or features may no longer work!')});
};

// ! End of Central Functions' Definitions Section !



