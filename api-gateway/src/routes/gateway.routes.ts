import { Router, type Request, type Response } from "express";
import proxy from "express-http-proxy";

export class GatewayRoutes {

  private readonly _router: Router;

  constructor() {
    this._router = Router();
    this.registerRoutes();
  }

  getApiGatewayRoutes = (): Router => {
    return this._router;
  }

  private getAllUsers = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    console.log("Gateway - getAllUsers reached");
    return;
  }

  private registerRoutes = (): void => {
    const usersInternalApiHost: string = process.env.USERS_INTERNAL_API_HOST ?? "";
    const usersInternalApiBasePath: string = process.env.USERS_INTERNAL_API_BASE_PATH ?? "";

    this._router.use(
      "/",
      proxy(usersInternalApiHost, {
        proxyReqPathResolver: (req) => {
          const path = req.url === "/" ? "" : req.url;
          const targetPath = `${usersInternalApiBasePath}${path}`;
          return targetPath;
        }
      })
    );

  }
}
