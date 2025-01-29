const net = require('net');
const dgram = require('dgram');
const readline = require('readline');
const { isValidJSON } = require('./utilities');

const CENTRAL_MANAGER_UDP_PORT = 5000;
const CENTRAL_MANAGER_UDP_ADDRESS = ''; // Set It
const AGENTS = [
    { address: '', port: 3333 },
    // Add all agents like this format
];

// UDP server for listening alerts
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (message, remote) => {
    console.log(`Received alert from ${remote.address}:${remote.port}:\n${message}`);
});

udpServer.on('listening', () => {
    const local = udpServer.address();
    console.log(`Central manager UDP server listening on all interfaces, at port ${local.port}.`);
});

udpServer.bind(CENTRAL_MANAGER_UDP_PORT, CENTRAL_MANAGER_UDP_ADDRESS);

// Connect to specific agents
AGENTS.forEach((agent, index) => {
    const client = new net.Socket();

    client.connect(agent.port, agent.address, () => {
        console.log(`Connected to agent at ${agent.address}:${agent.port}.`);
        AGENTS[index].socket = client;

        client.write(`UDPListeningOn: ${CENTRAL_MANAGER_UDP_ADDRESS} ${CENTRAL_MANAGER_UDP_PORT}`);
    });

    let receivedData = '';
    client.on('data', (chunk) => {
        receivedData += chunk.toString();

        if (isValidJSON(receivedData)) {
            const jsonData = JSON.parse(receivedData.toString());
            receivedData = '';

            console.log(`Received response from agent [${agent.address}:${agent.port}]:`);
            console.dir(jsonData);
        }
    });

    client.on('close', () => {
        console.log(`Connection to agent at ${agent.address}:${agent.port} closed.`);
    });

    client.on('error', (err) => {
        console.error(`Error connecting to agent at ${agent.address}:${agent.port}:\n`, err);
    });
});

// Terminal input for sending commands to agents
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.on('line', (input) => {
    const [agentIndex, command] = input.split(' ');
    const agent = AGENTS[+agentIndex]?.socket;

    if (agent) {
        agent.write(command);
    } else {
        console.log('Invalid agent index.');
    }
});

console.log('Enter commands in the format: <agent-index> <command>');
console.log('Commands:\n- info\n- reboot');