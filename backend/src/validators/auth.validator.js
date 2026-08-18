import { body } from "express-validator";

export const validateRegistration = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  // body("role")
  //   .notEmpty()
  //   .withMessage("Role is required.")
  //   .isIn(["customer", "admin", "staff"])
  //   .withMessage("Role must be either 'customer', 'admin', or 'staff'."),
  body("branch")
    .if(body("role").equals("staff"))
    .notEmpty()
    .withMessage("Branch is required for staff role."),
];

export const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password").trim().notEmpty().withMessage("Password is required."),
];
