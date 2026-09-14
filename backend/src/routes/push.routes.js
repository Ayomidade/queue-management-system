import { Router } from "express";
import { getPublicKey, subscribe, unsubscribe } from "../controllers/push.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const pushRouter = Router();

pushRouter.get("/vapid-public-key", getPublicKey);
pushRouter.post("/subscribe", protect, subscribe);
pushRouter.post("/unsubscribe", protect, unsubscribe);

export default pushRouter;
