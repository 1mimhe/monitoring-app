# Agent-Central Manager Monitoring System

A distributed monitoring system where agents (users) connect to a central manager (admin) over TCP, REST API, or real-time Socket.IO connections. Agents monitor for events, send alerts, and execute commands received from the central manager.

## Features in Socket.IO Real-time Version

### Real-time Communication Architecture
The Socket.IO implementation provides instant bidirectional communication between agents (users) and the central manager (admin) through WebSocket connections with automatic fallback to HTTP long-polling.

### Multi-Room Management System
- **Room-based Organization**: Agents are organized into separate monitoring rooms
- **Room Isolation**: Each room operates independently with its own set of users and administrator
- **Scalable Architecture**: Support for multiple concurrent rooms with isolated communication channels

### User Features
(Simplified setup without user authentication barriers)

#### Administrator Features:
- **Individual User Communication**: Select and chat privately with specific users in the room
- Send messages to all users in the room simultaneously
- **Real-time User Monitoring**: 
  - View online/offline status of all room members
  - Monitor live system metrics (CPU, RAM, disk usage)
  - Receive automated alerts when user system resources exceed 70% threshold

#### Normal User Features:
- **Direct Admin Communication**: Send private messages to room administrator
- **Room Broadcasting**: Send messages visible to all room members

## Features in Node Socket version

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

## How to Run the Socket.IO Real-time Version

### Starting the Server
Navigate to the Socket.IO version directory and start the central manager:

```bash
cd socketio-version
npm start
```

### Accessing the Application

#### For Regular Users (Agents):
Open your web browser and navigate to:
```
localhost:PORT/
```
This opens the user panel where agents can join rooms and communicate with administrators.

#### For Administrators:
Open your web browser and navigate to:
```
localhost:PORT/admin.html
```
This opens the administrative panel for room management and user monitoring.

## Setup Node Socket Version

### 1. Clone the Repository
Clone the project repository to your local machine or VMs.

```bash
git clone https://github.com/1mimhe/monitoring-app
cd monitoring-app
```

### 2. Install Dependencies
Run the following command in both the agent and central manager folders to install the required dependencies.

```bash
npm install
```

### 3. Configuration
Set the following environment variables:

In Central-Manager:
- CENTRAL_MANAGER_UDP_ADDRESS
- CENTRAL_MANAGER_UDP_PORT
- AGENTS

In Agents:
- AGENT_TCP_ADDRESS
- AGENT_TCP_PORT


**Good Luck**
