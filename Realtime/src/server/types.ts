export interface ServerToClientEvents {
  message: (msg: string) => void;
}

export interface ClientToServerEvents {
  init: (name: string, ack: () => void) => void;
  message: (msg: string, ack: () => void) => void;
  broadcast: (msg: string, ack: () => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  pcName: string;
}