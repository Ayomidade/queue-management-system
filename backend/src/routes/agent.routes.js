import { Router } from "express";
import { sendMessage } from "../controllers/agent.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const agentRouter = Router();
agentRouter.use(protect);

agentRouter.post("/chat", sendMessage);

export default agentRouter;
