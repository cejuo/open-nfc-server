import { io } from "socket.io-client";
const PORT = 4002;
const DOMAIN = (true ? "http://192.168.1.87:" : "https://securpicks.com:") + PORT.toString();

const socket = io(DOMAIN, {
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 2000,
  reconnectionAttempts: 100,
  rejectUnauthorized: false,
  query: {},
});

socket.on("connect", () => {
  console.log("[*] Socket connected");
  // prettier-ignore
  // prettier-ignore
});

socket.on("connect_error", (error: any) => {
  console.log(`[!] Socket error`);
  console.log(error);
  // prettier-ignore
});

socket.on("disconnect", () => {
  console.log(`[i] Socket disconnected`);
  // prettier-ignore
});
