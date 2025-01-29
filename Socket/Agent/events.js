const dgram = require('dgram');
const autoBind = require('auto-bind');
const { getSystemInfo, rebootSystem, chunkString } = require('./utilities');

class Events {
    centralManagerUdpPort;
    centralManagerUdpAddress;
    tcpCentralSocket;
    #eventCounter;

    constructor(socket) {
        this.centralManagerUdpPort = null;
        this.centralManagerUdpAddress = null;
        this.tcpCentralSocket = socket;
        this.#eventCounter = 0;
        autoBind(this);
    }

    async tcpOnData(data) {
        const message = data.toString();
        console.log(`Received message: ${message}`);

        if (message.split(' ').length === 3) {
            const [, address, port] = message.split(' ');
            this.centralManagerUdpAddress = address;
            this.centralManagerUdpPort = +port;

            console.log(`Central manager UDP is: ${this.centralManagerUdpAddress}:${this.centralManagerUdpPort}`);
        } else {
            switch (message) {
                case 'info':
                    const systemInfo = await getSystemInfo();
                    const chunks = chunkString(JSON.stringify(systemInfo), 14_000);
                    chunks.forEach((chunk) => this.tcpCentralSocket.write(chunk));
                    break;
                case 'reboot':
                    this.tcpCentralSocket.write('System reboot successfully.');
                    rebootSystem();
                    break;
                default:
                    this.tcpCentralSocket.write('Invalid Command.');
            }
        }
    }

    udpAlerts() {
        setInterval(async () => {
            const systemInfo = await getSystemInfo();
            const cpuCondition = systemInfo.cpu.usedCpu >= 80;
            const memoryCondition = systemInfo.memory.memoryUsagePercentage >= 80;

            if (cpuCondition || memoryCondition) {
                let alertMessage = `Alert ${++this.#eventCounter}:`;
                if (cpuCondition) alertMessage += `\nCPU usage is ${systemInfo.cpu.usedCpu}%`;
                if (memoryCondition) alertMessage += `\nMemory usage is ${systemInfo.memory.memoryUsagePercentage}%`;

                if (this.centralManagerUdpPort && this.centralManagerUdpAddress) {
                    const udpClient = dgram.createSocket('udp4');
                    const alertBuffer = Buffer.from(alertMessage);
                    udpClient.send(alertBuffer, 0, alertBuffer.length, this.centralManagerUdpPort, this.centralManagerUdpAddress, (err) => {
                        if (err) console.error('Failed to send alert: ', err);
                    });
                    udpClient.close();
                    console.log(`Alert sent: ${alertMessage}`);
                } else {
                    console.error('Central manager UDP details not set');
                }
            }
        }, 5000);
    };
}

module.exports = Events;