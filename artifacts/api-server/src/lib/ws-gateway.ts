import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { logger } from "./logger";

const clients = new Set<WebSocket>();

export function initWsGateway(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    clients.add(ws);
    logger.info({ ip: req.socket.remoteAddress, total: clients.size }, "WS client connected");

    ws.send(JSON.stringify({ type: "connected", ts: Date.now(), message: "SENTINEL-X real-time feed active" }));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        if (msg.type === "subscribe") ws.send(JSON.stringify({ type: "subscribed", channel: msg.channel, ts: Date.now() }));
      } catch {}
    });

    ws.on("close", () => {
      clients.delete(ws);
      logger.debug({ total: clients.size }, "WS client disconnected");
    });

    ws.on("error", (err) => {
      logger.warn({ err: err.message }, "WS client error");
      clients.delete(ws);
    });
  });

  // Heartbeat to keep connections alive
  setInterval(() => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      } else {
        clients.delete(client);
      }
    }
  }, 30000);

  logger.info("WebSocket gateway initialized at /ws");
  return wss;
}

export function broadcast(payload: object) {
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch {}
    }
  }
}

export function getClientCount() { return clients.size; }
