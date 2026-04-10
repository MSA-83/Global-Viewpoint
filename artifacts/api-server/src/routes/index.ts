import { Router, type IRouter } from "express";
import healthRouter from "./health";
import threatsRouter from "./threats";
import incidentsRouter from "./incidents";
import gpsAnomaliesRouter from "./gps-anomalies";
import assetsRouter from "./assets";
import signalsRouter from "./signals";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(threatsRouter);
router.use(incidentsRouter);
router.use(gpsAnomaliesRouter);
router.use(assetsRouter);
router.use(signalsRouter);
router.use(dashboardRouter);

export default router;
