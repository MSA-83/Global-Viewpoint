import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startAisStream } from "./routes/ais-ws";
import { initWsGateway } from "./lib/ws-gateway";
import { startSimulator, seedInitialData } from "./lib/simulator";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

// Initialize WebSocket gateway
initWsGateway(server);

server.listen(port, async () => {
  logger.info({ port }, "SENTINEL-X API Server listening");

  // Start AIS maritime stream
  startAisStream();

  // Seed initial demo data if needed
  try {
    await seedInitialData();
  } catch (err: any) {
    logger.warn({ err: err.message }, "Seeding error (non-fatal)");
  }

  // Start live data simulation engine
  startSimulator();

  logger.info("SENTINEL-X platform fully operational");
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
