import type { User, UserInput } from "../models/user.models.js";
import type { IUserStore } from "../store/user.store.js";


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

  constructor(private userStore: IUserStore) {}

  addUser(user: UserInput): Promise<User> {
    if (!user || !user.email || !user.name) {
      throw new Error('Invalid input parameter(s).');
    }
    return this.userStore.create(user);
  }

  updateUser(id: string, user: User): Promise<User | undefined> {
    if (!id || !user || !user.email || !user.name) {
      return Promise.reject('Invalid input parameter(s)');
    }
    return this.userStore.update(id, user);
  }

  getAllUsers(): Promise<User[]> {
    return this.userStore.getAll();
  }

  getUserById(id: string): Promise<User | undefined> {
    if (!id) {
      return Promise.reject('Invalid input parameter(s)');
    }
    return this.userStore.getById(id);
  }

  removeUser(id: string): Promise<void> {
    if (!id) {
      return Promise.reject('Invalid input parameter(s)');
    }
    return this.userStore.remove(id);
  }
}