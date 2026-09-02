import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companionRouter from "./companion";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companionRouter);

export default router;
