import { Router, type IRouter } from "express";
import healthRouter from "./health";
import threatsRouter from "./threats";
import incidentsRouter from "./incidents";
import gpsAnomaliesRouter from "./gps-anomalies";
import assetsRouter from "./assets";
import signalsRouter from "./signals";
import dashboardRouter from "./dashboard";
import intelFeedsRouter from "./intel-feeds";
import alertsRouter from "./alerts";
import casesRouter from "./cases";
import authRouter from "./auth";
import searchRouter from "./search";
import analyticsRouter from "./analytics";
import knowledgeRouter from "./knowledge";
import workspacesRouter from "./workspaces";
import adminRouter from "./admin";
import aiRouter from "./ai-copilot";
import { getVessels } from "./ais-ws";

const router: IRouter = Router();

router.use(healthRouter);
router.use(threatsRouter);
router.use(incidentsRouter);
router.use(gpsAnomaliesRouter);
router.use(assetsRouter);
router.use(signalsRouter);
router.use(dashboardRouter);
router.use(intelFeedsRouter);
router.use(alertsRouter);
router.use(casesRouter);
router.use(authRouter);
router.use(searchRouter);
router.use(analyticsRouter);
router.use(knowledgeRouter);
router.use(workspacesRouter);
router.use(adminRouter);
router.use(aiRouter);

// AIS live vessel positions
router.get("/intel/ais", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 500, 2000);
  res.json(getVessels(limit));
});

export default router;
