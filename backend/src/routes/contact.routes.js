import { Router } from "express";
import { submitContact } from "../controllers/contact.controller.js";
import { submitContactValidator } from "../validators/contact.validator.js";
import validate from "../middlewares/validate.js";
import { publicWriteLimiter } from "../middlewares/rateLimiter.js";

const contactRouter = Router();

contactRouter.post(
  "/",
  publicWriteLimiter,
  submitContactValidator,
  validate,
  submitContact,
);

export default contactRouter;
