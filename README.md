# Agent-Central Manager Monitoring System (Based on NMS)

A distributed monitoring system where agents (monitoring clients) connect to a central manager (server) over TCP or get agents info with REST. Agents monitor for events, send alerts, and execute commands received from the central manager.

## Features in Socket version

### Agent:
- Connects to the central manager over TCP.
- Monitors for events and sends alerts to the central manager.
- Executes commands received from the central manager and sends back the results.
- Handles chunked data and reconnects if the connection is lost.

### Central Manager:
- Listens for agent connections over TCP.
- Tracks active agents using their unique IDs.
- Sends commands to specific agents.
- Receives alerts and command execution results from agents.
- Handles chunked data.

## Prerequisites

- **Node.js** (v14 or higher)
- **NPM** (Node Package Manager)

## Setup

### 1. Clone the Repository
Clone the project repository to your local machine or VMs.

```bash
git clone https://github.com/1mimhe/monitoring-app
cd <repository-folder>
```

### 2. Install Dependencies
Run the following command in both the agent and central manager folders to install the required dependencies.

```bash
npm install
```

### 3. (In socket version) Set these:
In Central-Manager:
- CENTRAL_MANAGER_UDP_ADDRESS
- CENTRAL_MANAGER_UDP_PORT
- AGENTS

In Agents:
- AGENT_TCP_ADDRESS
- AGENT_TCP_PORT
