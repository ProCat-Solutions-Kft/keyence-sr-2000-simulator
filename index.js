const express = require('express');
const net = require('net');
const http = require('http');
require('dotenv').config();
const app = express();
var fs = require('fs');
// HTTP Server setup
const server = http.createServer(app);
const PORT_HTTP = process.env.HTTP_PORT || 3000;

// Serve a basic HTTP response
app.get('/', (req, res) => {
  res.send('Hello from Express HTTP Server!');
});

// UDP Server setup for PORT 9015
const udpServer9015 = require('dgram').createSocket('udp4');
const PORT_UDP = process.env.PORT_UDP || 9015;
const PORT_TCP = process.env.PORT_TCP || 9004;

udpServer9015.on('error', (err) => {
  console.log(`UDP Server ${PORT_UDP} error:\n${err.stack}`);
  udpServer9015.close();
});

udpServer9015.on('message', (msg, rinfo) => {
  const messageText = msg.toString().trim();
  console.log(`Server ${PORT_UDP} Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}: ${messageText}`);

  switch (messageText) {
    case 'READER':
    case 'READER2':
      sendResponse(`OK,${messageText},${process.env.DEVICE_INFO}`, rinfo, udpServer9015);
      break;
    default:
      console.log(`Server ${PORT_UDP}: Unknown command received`);
      break;
  }
});

udpServer9015.on('listening', () => {
  const address = udpServer9015.address();
  console.log(`UDP Server ${PORT_UDP} listening ${address.address}:${address.port}`);
});

udpServer9015.bind({ address: process.env.HOST_IP, port: PORT_UDP });

// TCP Server setup for PORT 9004
const tcpServer9004 = net.createServer((socket) => {
  console.log(`TCP Server 9004 connected: ${socket.remoteAddress}:${socket.remotePort}`);

  const code = JSON.parse(fs.readFileSync(process.env.CODES_FILE_PATH, 'utf8'));

  socket.on('data', (data) => {
    const messageText = data.toString().trim();
    console.log(`Server ${PORT_TCP} Received ${data.length} bytes from ${socket.remoteAddress}:${socket.remotePort}: ${messageText}`);

    if (messageText === 'LON') {
      sendResponse(code?.codes[Math.floor(Math.random()*code?.codes.length)] + '\r', { address: socket.remoteAddress, port: socket.remotePort }, socket);
    } else if (messageText === 'LOFF') {
      sendResponse('ERROR\r', { address: socket.remoteAddress, port: socket.remotePort }, socket);
    } else {
      console.log(`Server ${PORT_TCP}: Unknown command received`);
    }
  });

  socket.on('error', (err) => {
    console.error(`Socket error: ${err}`);
  });
});

tcpServer9004.on('listening', () => {
  const address = tcpServer9004.address();
  console.log(`TCP Server ${PORT_TCP} listening ${address.address}:${address.port}`);
});

tcpServer9004.on('error', (err) => {
  console.error(`TCP Server ${PORT_TCP} error: ${err}`);
});

tcpServer9004.listen(PORT_TCP, process.env.HOST_IP);

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
server.listen(PORT_HTTP, process.env.HOST_IP, () => {
  console.log(`HTTP Server running on ${process.env.HOST_IP}:${PORT_HTTP}`);
});
