import { Router, type Request, type Response } from "express";

import type { IUserService } from "../services/user.service.js";
import { populateApiResponse } from "../utils/utilities.js";
import type { User, UserInput } from "../models/user.models.js";


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
    this._router.get("/api/users", this.getAllUsers);
    this._router.get("/api/users/:id", this.getUserById);
    this._router.post("/api/users", this.addUser);
    this._router.put("/api/users/:id", this.updateUser);
    this._router.delete("/api/users/:id", this.removeUser);
  }

  private getAllUsers = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    console.log("HERE");
    const users = await this.userService.getAllUsers();
    const apiResponse = populateApiResponse(200, "Success", users);
    res.status(200).json(apiResponse);
    return;
  }

  private getUserById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.params || !req.params.id) {
      const errorResponse = populateApiResponse(400, "Error: Bad Request", undefined);
      res.status(400).json(errorResponse);
      return;
    }
    const idParam = req.params.id?.toString();
    const user = await this.userService.getUserById(idParam);
    const apiResponse = populateApiResponse(200, "Success", user);
    res.status(200).json(apiResponse);
  }

  private addUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.body) {
      const errorResponse = populateApiResponse(400, "Error: Bad Request", undefined);
      res.status(400).json(errorResponse);
      return;
    }

    const userInput: UserInput = JSON.parse(req.body);
    if (!userInput || !userInput.email || !userInput.name) {
      const errorResponse = populateApiResponse(400, "Error: Bad Request", undefined);
      res.status(400).json(errorResponse);
      return;
    }

    const user = await this.userService.addUser(userInput);
    const apiResponse = populateApiResponse(200, "Success", user);
    res.status(200).json(apiResponse);
  }

  private updateUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.params || !req.params.id) {
      const errorResponse = populateApiResponse(400, "Error: Bad Request", undefined);
      res.status(400).json(errorResponse);
      return;
    }
    const idParam = req.params.id?.toString();
    
    const existingUser: User = JSON.parse(req.body);
    if (!existingUser || !existingUser.email || !existingUser.name || !existingUser.id || existingUser.id !== idParam) {
      const errorResponse = populateApiResponse(400, "Error: Bad Request", undefined);
      res.status(400).json(errorResponse);
      return;
    }

    const user = await this.userService.updateUser(idParam, existingUser);
    const apiResponse = populateApiResponse(200, "Success", user);
    res.status(200).json(apiResponse);
  }

  private removeUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (!req.params || !req.params.id) {
      const errorResponse = populateApiResponse(400, "Error: Bad Request", undefined);
      res.status(400).json(errorResponse);
      return;
    }
    const idParam = req.params.id?.toString();
    const user = await this.userService.removeUser(idParam);
    const apiResponse = populateApiResponse(204, "Success", undefined);
    res.status(204).json(apiResponse);
  }
}