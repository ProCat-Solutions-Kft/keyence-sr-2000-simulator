const express = require('express');
const net = require('net');
const http = require('http');

// Create an Express application
const app = express();

// HTTP Server setup
const server = http.createServer(app);
const PORT_HTTP = 3000;

// Serve a basic HTTP response
app.get('/', (req, res) => {
  res.send('Hello from Express HTTP Server!');
});

// UDP Server setup for PORT 9015
const udpServer9015 = require('dgram').createSocket('udp4');
const PORT_UDP_9015 = 9015;
const PORT_UDP_9004 = 9004;

udpServer9015.on('error', (err) => {
  console.log(`UDP Server 9015 error:\n${err.stack}`);
  udpServer9015.close();
});

udpServer9015.on('message', (msg, rinfo) => {
  const messageText = msg.toString().trim();
  console.log(`Server 9015 Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}: ${messageText}`);

  switch (messageText) {
    case 'READER':
    case 'READER2':
      sendResponse(`OK,${messageText},keyence SR-2000,keyence SR-2000AAAAAAAAAAAAAA`, rinfo, udpServer9015);
      break;
    default:
      console.log('Server 9015: Unknown command received');
      break;
  }
});

udpServer9015.on('listening', () => {
  const address = udpServer9015.address();
  console.log(`UDP Server 9015 listening ${address.address}:${address.port}`);
});

udpServer9015.bind({ address: '10.8.0.13', port: PORT_UDP_9015 });

// TCP Server setup for PORT 9004
const tcpServer9004 = net.createServer((socket) => {
  console.log(`TCP Server 9004 connected: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on('data', (data) => {
    const messageText = data.toString().trim();
    console.log(`Server 9004 Received ${data.length} bytes from ${socket.remoteAddress}:${socket.remotePort}: ${messageText}`);

    if (messageText === 'LON') {
      sendResponse('ABCDEFGH:A', { address: socket.remoteAddress, port: socket.remotePort }, socket);
    } else {
      console.log('Server 9004: Unknown command received');
    }
  });

  socket.on('error', (err) => {
    console.error(`Socket error: ${err}`);
  });
});

tcpServer9004.on('listening', () => {
  const address = tcpServer9004.address();
  console.log(`TCP Server 9004 listening ${address.address}:${address.port}`);
});

tcpServer9004.on('error', (err) => {
  console.error(`TCP Server 9004 error: ${err}`);
});

tcpServer9004.listen(PORT_UDP_9004, '10.8.0.13');

// Function to send responses via specified UDP server or TCP socket
function sendResponse(responseMessage, rinfo, serverOrSocket) {
  const fullResponse = responseMessage + '\r';
  if (serverOrSocket instanceof net.Socket) {
    serverOrSocket.write(fullResponse);
    console.log(`Sent response to ${rinfo.address}:${rinfo.port}: ${fullResponse}`);
  } else {
    const response = Buffer.from(fullResponse);
    serverOrSocket.send(response, rinfo.port, rinfo.address, (error) => {
      if (error) {
        console.log('Error sending response:', error);
      } else {
        console.log(`Sent response to ${rinfo.address}:${rinfo.port}: ${fullResponse}`);
      }
    });
  }
}

// Start HTTP Server on all interfaces
server.listen(PORT_HTTP, '0.0.0.0', () => {
  console.log(`HTTP Server running on http://0.0.0.0:${PORT_HTTP}`);
});
