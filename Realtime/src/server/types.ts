export interface ServerToClientEvents {
  message: (msg: string, type?: MessageTypes, sender?: string, ack?: () => void) => void;
}

export interface ClientToServerEvents {
  join: (user: { pcName: string; room: string }, ack: () => void) => void;
  message: (msg: string, ack: () => void) => void;
  broadcast: (msg: string, ack: () => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  pcName: string;
  room: string;
}

export enum MessageTypes {
  Normal = 'normal',
  Broadcast = 'broadcast',
  Admin = 'admin'
}