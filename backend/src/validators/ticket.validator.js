import { body, param } from "express-validator";

export const createTicketValidator = [
  body("queueId")
    .notEmpty()
    .withMessage("queueId is required")
    .isMongoId()
    .withMessage("Invalid queue ID"),
  body("branchId")
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
];

export const callNextValidator = [
  body("queueId")
    .notEmpty()
    .withMessage("queueId is required")
    .isMongoId()
    .withMessage("Invalid queue ID"),
];

export const ticketIdParamValidator = [
  param("id")
    .notEmpty()
    .withMessage("Ticket ID is required")
    .isMongoId()
    .withMessage("Invalid ticket ID"),
];

export const setPriorityValidator = [
  param("id")
    .notEmpty()
    .withMessage("Ticket ID is required")
    .isMongoId()
    .withMessage("Invalid ticket ID"),
  body("priority")
    .notEmpty()
    .withMessage("priority is required")
    .isIn(["normal", "priority"])
    .withMessage("priority must be 'normal' or 'priority'"),
];

export const branchIdParamValidator = [
  param("branchId")
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
];
