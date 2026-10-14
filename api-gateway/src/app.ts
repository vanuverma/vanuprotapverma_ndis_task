import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';

import { errorHandler } from './middlewares/error-handler.middleware.js';
import { ErrorCodes } from './utils/constants.js';
import { GatewayRoutes } from './routes/gateway.routes.js';
import type { ProxyRouteOptions } from './models/index.models.js';
import proxy, { type ProxyOptions } from 'express-http-proxy';
import { verifyJwt } from './middlewares/auth.middleware.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors());
  app.use(express.json());


  // routes
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      message: 'API GATEWAY is healthy'
    });
  });

  // users endpoints
  app.use("/api/users", verifyJwt, new GatewayRoutes().getApiGatewayRoutes());

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
