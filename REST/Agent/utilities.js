const os = require('os');
const { exec } = require('child_process');
const humanizeDuration = require('humanize-duration');
const autoBind = require('auto-bind');

class CPUUtilities {
    constructor() {
        autoBind(this);
    }

    async getSystemInfo() {
        // OS Information
        const osInfo = {
            platform: os.platform(),
            type: os.type(),
            release: os.release(),
            architecture: os.arch(),
            hostname: os.hostname(),
            uptime: humanizeDuration(os.uptime() * 1000, {
                round: true,
                conjunction: " and ", serialComma: false
            }),
        };

        // Memory Information
        const memInfo = {
            totalMemory: +(os.totalmem() / 1_000_000_000).toFixed(2),
            freeMemory: +(os.freemem() / 1_000_000_000).toFixed(2),
            usedMemory: +((os.totalmem() - os.freemem()) / 1_000_000_000).toFixed(2),
            memoryUsagePercentage: +((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        };

        // System Processes
        const processes = await this.getSystemProcesses();

        // CPU Information
        const usedCpu = +(this.calculateCPUPercentageSync());
        const cpuInfo = {
            usedCpu,
            freeCpu: 100 - usedCpu,
            cores: os.cpus()
        };

        // Network Interfaces
        const networkInterfaces = os.networkInterfaces();

        return {
            os: osInfo,
            memory: memInfo,
            cpu: cpuInfo,
            processes,
            networkInterfaces
        };
    }

    getSystemProcesses() {
        return new Promise((resolve, reject) => {
            const command = process.platform === "win32" ? "tasklist" : "ps aux";

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Error executing command: ${error.message}`));
                }

                if (stderr) {
                    return reject(new Error(`Error output: ${stderr}`));
                }

                let processes = stdout.split("\n").map(line => line.trim()).filter(line => line);
                processes = this.#getJSONProcesses(processes);
                resolve(processes);
            });
        });
    }

    getCPUUsage() {
        const cpus = os.cpus();

        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach((core) => {
            for (let type in core.times) {
                totalTick += core.times[type];
            }
            totalIdle += core.times.idle;
        });

        const totalCores = cpus.length;
        const idle = totalIdle / totalCores;
        const total = totalTick / totalCores;

        return { idle, total };
    }

    // Synchronous CPU usage calculation
    calculateCPUPercentageSync() {
        const start = this.getCPUUsage();

        this.#blockForMilliseconds(1000);

        const end = this.getCPUUsage();
        const idleDiff = end.idle - start.idle;
        const totalDiff = end.total - start.total;

        if (totalDiff === 0) {
            throw new Error('Total time difference is zero, cannot calculate CPU usage.');
        }

        // Calculate CPU usage percentage
        const usage = ((1 - idleDiff / totalDiff) * 100).toFixed(2);
        return usage;
    }

    // Blocking delay function
    #blockForMilliseconds(ms) {
        const start = new Date().getTime();
        while (new Date().getTime() - start < ms) {
            //
        }
    }

    #getJSONProcesses(processes) {
        // Extract headers and split into an array
        const headers = processes[0]
            .trim()
            .split(/\s+/)
            .map(header => header.toLowerCase()); // Make keys lowercase for consistency

        // Parse the remaining lines into JSON objects
        const processObjects = processes.slice(1).map(line => {
            const values = line.trim().match(/\S+/g) || []; // Split line into individual values
            const processObject = {};

            headers.forEach((header, index) => {
                processObject[header] = values[index] || ''; // Map headers to values
            });

            return processObject;
        });

        return processObjects;
    }

    rebootSystem() {
        const command = process.platform === "win32" ? "shutdown /r /t 0" : "sudo reboot";

        exec(command, (error, stdout, stderr) => {
            if (error) {
                throw new Error(`Error restarting system: ${error.message}`);
            }

            if (stderr) {
                throw new Error(`Error output: ${stderr}`);
            }
        });
    }
}

module.exports = new CPUUtilities();