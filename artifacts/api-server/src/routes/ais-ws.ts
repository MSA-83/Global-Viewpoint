import WebSocket from "ws";
import { logger } from "../lib/logger";

export type AisVessel = {
  mmsi: string;
  shipName?: string;
  latitude?: number;
  longitude?: number;
  sog?: number;
  cog?: number;
  trueHeading?: number;
  navStatus?: number;
  shipType?: number;
  callSign?: string;
  destination?: string;
  lastUpdate: string;
};

const vessels = new Map<string, AisVessel>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const AISSTREAM_KEY = process.env.AISSTREAM_KEY!;

function connect() {
  if (!AISSTREAM_KEY) return;
  try {
    ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

    ws.on("open", () => {
      logger.info("AIS stream connected");
      ws!.send(JSON.stringify({
        APIKey: AISSTREAM_KEY,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FiltersShipMMSI: [],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      }));
    });

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        const mmsi = String(msg.MetaData?.MMSI || "");
        if (!mmsi) return;
        const existing = vessels.get(mmsi) || { mmsi, lastUpdate: new Date().toISOString() };

        if (msg.MessageType === "PositionReport") {
          const p = msg.Message?.PositionReport;
          vessels.set(mmsi, {
            ...existing,
            latitude: p?.Latitude,
            longitude: p?.Longitude,
            sog: p?.Sog,
            cog: p?.Cog,
            trueHeading: p?.TrueHeading,
            navStatus: p?.NavigationalStatus,
            lastUpdate: new Date().toISOString(),
          });
        } else if (msg.MessageType === "ShipStaticData") {
          const s = msg.Message?.ShipStaticData;
          vessels.set(mmsi, {
            ...existing,
            shipName: s?.Name?.trim(),
            shipType: s?.Type,
            callSign: s?.CallSign?.trim(),
            destination: s?.Destination?.trim(),
            lastUpdate: new Date().toISOString(),
          });
        }

        // Keep map capped at 2000 entries
        if (vessels.size > 2000) {
          const oldest = Array.from(vessels.entries())
            .sort((a, b) => a[1].lastUpdate.localeCompare(b[1].lastUpdate))
            .slice(0, 200);
          oldest.forEach(([k]) => vessels.delete(k));
        }
      } catch {}
    });

    ws.on("error", (e) => logger.warn({ err: e.message }, "AIS WS error"));
    ws.on("close", () => {
      logger.info("AIS stream closed, reconnecting in 10s");
      reconnectTimer = setTimeout(connect, 10000);
    });
  } catch (e: any) {
    logger.warn({ err: e.message }, "AIS connect failed");
    reconnectTimer = setTimeout(connect, 15000);
  }
}

export function startAisStream() {
  if (AISSTREAM_KEY) connect();
  else logger.warn("AISSTREAM_KEY not set, AIS stream disabled");
}

export function getVessels(limit = 500): AisVessel[] {
  return Array.from(vessels.values())
    .filter(v => v.latitude != null && v.longitude != null)
    .sort((a, b) => b.lastUpdate.localeCompare(a.lastUpdate))
    .slice(0, limit);
}
