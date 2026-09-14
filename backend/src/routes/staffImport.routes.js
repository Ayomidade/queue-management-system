import { Router } from "express";
import multer from "multer";
import { bulkImportStaff } from "../controllers/staffImport.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const upload = multer({ storage: multer.memoryStorage() });

const staffImportRouter = Router();
staffImportRouter.use(protect);

staffImportRouter.post(
  "/import",
  authorize("admin", "manager"),
  upload.single("file"),
  bulkImportStaff,
);

export default staffImportRouter;
