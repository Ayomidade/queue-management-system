import { Router } from "express";
import multer from "multer";
import { bulkImportStaff } from "../controllers/staffImport.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv")) {
      return cb(null, true);
    }
    return cb(new Error("Only CSV files are accepted"));
  },
});

const staffImportRouter = Router();
staffImportRouter.use(protect);

staffImportRouter.post(
  "/import",
  authorize("admin", "manager"),
  upload.single("file"),
  bulkImportStaff,
);

export default staffImportRouter;
