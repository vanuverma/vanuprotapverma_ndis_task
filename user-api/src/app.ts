import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { UserRoutes } from './routes/user.routes.js';
import { UserService } from './services/user.service.js';
import { UserStore } from './store/user.store.js';

export function createApp() {
  const app = express();

  // middlewares
  app.use(cors());
  app.use(express.json());

  // dependencies
  const userStore = new UserStore();
  const userService = new UserService(userStore);
  const userRoutes = new UserRoutes(userService);

  // routes
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      message: 'USER API is healthy'
    });
  });

  app.use('/users', userRoutes.getUserRoutes());

  return app;
}
