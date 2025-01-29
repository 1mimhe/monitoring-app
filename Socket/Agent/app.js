const net = require('net');
const Events = require('./events');

const AGENT_TCP_PORT = 3333;
const AGENT_TCP_IP = ''; // Set it
let tcpCentralSocket = null;

const tcpServer = net.createServer((socket) => {
    console.log('Central manager connected.');

    tcpCentralSocket = new Events(socket);
    tcpCentralSocket.udpAlerts();
    socket.on('data', tcpCentralSocket.tcpOnData);

    socket.on('end', () => {
        console.log('Central manager disconnected.');
    });

    socket.on('error', (err) => {
        console.error('TCP socket error:', err);
    });
});

tcpServer.listen(AGENT_TCP_PORT, AGENT_TCP_IP, () => {
    console.log(`Agent TCP server listening on ${AGENT_TCP_IP}:${AGENT_TCP_PORT}.`);
});

tcpServer.on('error', (err) => {
    console.error('TCP server error:', err);
});