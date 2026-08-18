import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

router.get("/admin-only", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

export default router;
