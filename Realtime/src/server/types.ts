export interface ServerToClientEvents {
  message: (msg: string) => void;
}

export interface ClientToServerEvents {
  init: (name: string) => void;
  message: (msg: string) => void;
  broadcast: (msg: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  pcName: string;
}