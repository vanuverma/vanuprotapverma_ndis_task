import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { UserRoutes } from './routes/user.routes.js';
import { UserService } from './services/user.service.js';
import { UserStore } from './store/user.store.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { ErrorCodes } from './utils/constants.js';
import { requireVerifiedUser } from './middlewares/verify-user.middleware.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

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

  // using /internal just to differentiate the URL from gateway url
  app.use('/api/internal/users', requireVerifiedUser, userRoutes.getUserRoutes());

  // unknown routes
  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      message: "Route not found",
      data: null,
      error: {
        code: ErrorCodes.ROUTE_NOT_FOUND,
      },
    });
  });

  // global error handler middleware
  app.use(errorHandler);

  return app;
}
