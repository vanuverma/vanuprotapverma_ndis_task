import { resolve } from "node:dns";
import type { User, UserInput } from "../models/user.models.js";
import { uuidv7 } from "uuidv7";

export interface IUserStore {
  create(user: UserInput): Promise<User>;
  update(id: string, user: User): Promise<User | undefined>;
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User | undefined>;
  remove(id: string): Promise<void>;
}

export class UserStore implements IUserStore {
  private _users: Map<string, User> = new Map();

  constructor() {
    const uId = uuidv7();
    this._users.set(uId, {
      createdAtUtc: this.getUtcTimeStamp(),
      updatedAtUtc: this.getUtcTimeStamp(),
      id: uId,
      email: 'seed.user@sample.com',
      name: 'seed user'
    })
  }

  async create(user: UserInput): Promise<User> {
    const uId: string = uuidv7();
    const userToCreate: User = {
      createdAtUtc: this.getUtcTimeStamp(),
      updatedAtUtc: this.getUtcTimeStamp(),
      id: uId,
      email: user.email,
      name: user.name
    };

    this._users.set(uId, userToCreate);
    console.log(this._users);
    return Promise.resolve(userToCreate);
  }

  async getAll(): Promise<User[]> {
    return Promise.resolve(Array.fromAsync(this._users.values()));
  }

  async update(id: string, user: User): Promise<User | undefined> {
    const updatedUser: User = {
      ...user,
      id: id,
      updatedAtUtc: this.getUtcTimeStamp()
    };

    // user not found
    if (!this._users.has(id)) {
      return Promise.resolve(undefined);
    }

    this._users.set(id, updatedUser);
    console.log(updatedUser);
    return Promise.resolve(updatedUser);
  }

  async getById(id: string): Promise<User | undefined> {
    const user: User | undefined = this._users.get(id);
    return Promise.resolve(user);
  }

  async remove(id: string): Promise<void> {
    if (!id) {
      return Promise.reject('Invalid input parameter(s)');
    }

    if (this._users.has(id)) {
      this._users.delete(id);
    }

    return Promise.resolve();
  }

  getUtcTimeStamp(): string {
    return new Date().toUTCString();
  }
}
