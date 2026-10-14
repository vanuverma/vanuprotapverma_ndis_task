import { Router, type Request, type Response } from "express";

import type { IUserService } from "../services/user.service.js";
import { populateApiResponse } from "../utils/utilities.js";
import type { User, UserInput } from "../models/index.models.js";
import { ErrorCodes } from "../utils/constants.js";
import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import { AppError } from "../utils/app-error.util.js";


export class UserRoutes {

  private readonly _router: Router;

  constructor(private userService: IUserService) {
    this._router = Router();
    this.registerRoutes();
  }

  getUserRoutes = (): Router => {
    return this._router;
  }

  private registerRoutes = (): void => {
    this._router.get("/", asyncHandler(this.getAllUsers));
    this._router.get("/:id", asyncHandler(this.getUserById));
    this._router.post("/", asyncHandler(this.addUser));
    this._router.put("/:id", asyncHandler(this.updateUser));
    this._router.delete("/:id", asyncHandler(this.removeUser));
  }

  private getAllUsers = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const users = await this.userService.getAllUsers();
    const apiResponse = populateApiResponse(200, "Success", users, null);
    res.status(200).json(apiResponse);
    return;
  }

  private getUserById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.params || !req.params.id) {
      throw new AppError("Missing input parameter(s)", 400, ErrorCodes.BAD_REQUEST);
    }
    const idParam = req.params.id?.toString();
    const user = await this.userService.getUserById(idParam);
    const apiResponse = populateApiResponse(200, "Success", user, null);
    res.status(200).json(apiResponse);
  }

  private addUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.body || !req.body.name || !req.body.email) {
      throw new AppError("Missing request payload", 400, ErrorCodes.BAD_REQUEST);
    }
    const userInput: UserInput = {
      email: req.body.email,
      name: req.body.name
    };
    if (!userInput || !userInput.email || !userInput.name) {
      throw new AppError("Invalid request payload", 400, ErrorCodes.BAD_REQUEST);
    }

    const user = await this.userService.addUser(userInput);
    const apiResponse = populateApiResponse(200, "Success", user, null);
    res.status(200).json(apiResponse);
  }

  private updateUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.params || !req.params.id) {
      throw new AppError("Missing input parameter(s)", 400, ErrorCodes.BAD_REQUEST);
    }
    const idParam = req.params.id?.toString();

    if (!req.body || !req.body.name || !req.body.email || !req.body.id || req.body.id !== idParam) {
      throw new AppError("Missing request payload", 400, ErrorCodes.BAD_REQUEST);
    }
    
    const userToUpdate: User = {
      email: req.body.email,
      name: req.body.name,
      id: req.body.id,
    };

    const user = await this.userService.updateUser(idParam, userToUpdate);
    const apiResponse = populateApiResponse(200, "Success", user, null);
    res.status(200).json(apiResponse);
  }

  private removeUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.params || !req.params.id) {
      throw new AppError("Missing input parameter(s)", 400, ErrorCodes.BAD_REQUEST);
    }
    const idParam = req.params.id?.toString();
    await this.userService.removeUser(idParam);
    const apiResponse = populateApiResponse(204, "Success", null, null);
    res.status(204).json(apiResponse);
  }
}