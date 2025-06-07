import { Socket } from "socket.io";
import { SystemInfo } from "../utils/system";

type Callback = (error: { error?: string; success?: boolean; info?: SystemInfo }) => void;

export interface ServerToClientEvents {
  message: (msg: string, type?: MessageTypes, sender?: string) => void;
  error: (msg: string) => void;
  info: (systemInfo: SystemInfo, sender: string) => void;
  userList: (userList: string[]) => void;
  join: (newUser: { pcName: string; room: string }) => void;
  dis: (pcName: string) => void;
}

export interface ClientToServerEvents {
  join: (user: { pcName: string; room: string; role: string }, callback: Callback) => void;
  message: (msg: string, callback: Callback) => void;
  broadcast: (msg: string, callback: Callback) => void;
  selectChat: (selectedPcName: string, callback: Callback) => void;
  closeChat: (callback: Callback) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  pcName: string;
  room: string;
  role: string;
  infoInterval: NodeJS.Timeout
}

export type SocketType = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

export enum MessageTypes {
  Normal = 'normal',
  Broadcast = 'broadcast',
  OtherSide = 'other',
  System = 'system'
}

export enum Roles {
  Admin = 'admin',
  User = 'user'
}