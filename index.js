const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);

    // Check if the message is the command 'LON'
    if (message === 'LON') {
      // Send the response 'ABCDEFGH:A'
      ws.send('ABCDEFGH:A');
    }
  });
});

// Start the server
server.listen(3000, '10.8.0.13', function listening() {
  console.log('Server started');
});
