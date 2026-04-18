import { createContext, useContext, useState, useEffect, FC, ReactNode } from "react";
import { initWsClient, onWsMessage, onWsStatus, type WsConnectionStatus } from "@/lib/ws-client";

type Alert = { id: number; title: string; severity: string; domain: string; createdAt: string };

type RealtimeCtx = {
  wsStatus: WsConnectionStatus;
  recentAlerts: Alert[];
  tickCount: number;
  clearRecentAlerts: () => void;
};

const RealtimeContext = createContext<RealtimeCtx>({
  wsStatus: "disconnected",
  recentAlerts: [],
  tickCount: 0,
  clearRecentAlerts: () => {},
});

export const RealtimeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>("disconnected");
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [tickCount, setTickCount] = useState(0);

  useEffect(() => {
    initWsClient();
    const offStatus = onWsStatus(setWsStatus);
    const offAlert = onWsMessage("alert_created", (msg) => {
      if (msg.data) {
        setRecentAlerts(prev => [msg.data, ...prev].slice(0, 20));
      }
    });
    const offHeartbeat = onWsMessage("heartbeat", () => {
      setTickCount(c => c + 1);
    });
    return () => { offStatus(); offAlert(); offHeartbeat(); };
  }, []);

  return (
    <RealtimeContext.Provider value={{ wsStatus, recentAlerts, tickCount, clearRecentAlerts: () => setRecentAlerts([]) }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
