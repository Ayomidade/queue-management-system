import Branch from "../models/branch.model.js";
import { sendSuccess } from "../utils/response.js";

export const createBranch = async (req, res, next) => {
  try {
    const { name, location } = req.body;
    const branch = await Branch.create({ name, location });
    return sendSuccess(res, {
      statusCode: 201,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({
      createdAt: -1,
    });
    return sendSuccess(res, {
      statusCode: 200,
      message: "Branches fetched successfully",
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch fetched successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    await branch.deleteOne();
    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
