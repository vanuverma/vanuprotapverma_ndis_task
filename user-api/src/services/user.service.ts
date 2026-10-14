import type { User, UserInput } from "../models/index.models.js";
import type { IUserStore } from "../store/user.store.js";
import { AppError } from "../utils/app-error.util.js";
import { ErrorCodes } from "../utils/constants.js";

export interface IUserService {
  addUser(user: UserInput): Promise<User>;
  updateUser(id: string, user: User): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  removeUser(id: string): Promise<void>;
}

/**
 * This service is not doing anything critical, 
 * it is here as a placeholder for critical business logics in future
 */
export class UserService implements IUserService {

  constructor(private userStore: IUserStore) { }

  async addUser(user: UserInput): Promise<User> {
    if (!user || !user.email || !user.name) {
      throw new AppError('Invalid input parameter(s).', 400, ErrorCodes.BAD_REQUEST);
    }
    const existingUser = await this.userStore.getByEmail(user.email);
    // ensuring email uniqueness
    if (existingUser) {
      throw new AppError('Invalid input parameter(s).', 400, ErrorCodes.BAD_REQUEST);
    }
    return this.userStore.create(user);
  }

  async updateUser(id: string, user: User): Promise<User | undefined> {
    if (!id || !user || !user.email || !user.name || !user.id) {
      throw new AppError('Invalid input parameter(s).', 400, ErrorCodes.BAD_REQUEST);
    }

    const existingUser = await this.userStore.getById(id);
    if (!existingUser) {
      throw new AppError('User not found.', 400, ErrorCodes.USER_NOT_FOUND);
    }
    return this.userStore.update(id, user);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userStore.getAll();
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (!id) {
      throw new AppError('Invalid input parameter(s).', 400, ErrorCodes.BAD_REQUEST);
    }
    const existingUser = await this.userStore.getById(id);
    if (!existingUser) {
      throw new AppError('User not found.', 400, ErrorCodes.USER_NOT_FOUND);
    }
    return existingUser;
  }

  async removeUser(id: string): Promise<void> {
    if (!id) {
      throw new AppError('Invalid input parameter(s).', 400, ErrorCodes.BAD_REQUEST);
    }

    const existingUser = this.userStore.getById(id);
    if (!existingUser) {
      throw new AppError('User not found', 400, ErrorCodes.USER_NOT_FOUND);
    }
    return this.userStore.remove(id);
  }
}