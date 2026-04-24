type WsHandler = (data: any) => void;

let ws: WebSocket | null = null;
let handlers: Map<string, Set<WsHandler>> = new Map();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let isConnecting = false;

export type WsConnectionStatus = "connected" | "disconnected" | "connecting";
let statusListeners: Set<(status: WsConnectionStatus) => void> = new Set();
let currentStatus: WsConnectionStatus = "disconnected";

function setStatus(s: WsConnectionStatus) {
  currentStatus = s;
  statusListeners.forEach(fn => fn(s));
}

function getWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws`;
}

function connect() {
  if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
  isConnecting = true;
  setStatus("connecting");

  try {
    // Build ws URL from env or derive from current host
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // Try to connect to API server on the proxy path
    const wsUrl = `${protocol}//${host}/api-server/ws`;
    ws = new WebSocket(wsUrl);
  } catch {
    isConnecting = false;
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    isConnecting = false;
    setStatus("connected");
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 25000);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const type: string = msg.type || "";
      // Dispatch to specific handlers
      const typeHandlers = handlers.get(type);
      if (typeHandlers) typeHandlers.forEach(fn => fn(msg));
      // Dispatch to wildcard handlers
      const wildcards = handlers.get("*");
      if (wildcards) wildcards.forEach(fn => fn(msg));
    } catch {}
  };

  ws.onclose = () => {
    isConnecting = false;
    setStatus("disconnected");
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    scheduleReconnect();
  };

  ws.onerror = () => {
    isConnecting = false;
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 5000);
}

export function initWsClient() { connect(); }

export function onWsMessage(type: string, handler: WsHandler) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => handlers.get(type)?.delete(handler);
}

export function onWsStatus(fn: (status: WsConnectionStatus) => void) {
  statusListeners.add(fn);
  fn(currentStatus);
  return () => statusListeners.delete(fn);
}

export function getWsStatus() { return currentStatus; }
