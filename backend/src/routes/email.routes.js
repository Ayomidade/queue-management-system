import { Router } from "express";
import { sendWelcomeEmail } from "../controllers/email.controller.js";

const router = Router();
router.post("/welcome", sendWelcomeEmail);

export default router;
