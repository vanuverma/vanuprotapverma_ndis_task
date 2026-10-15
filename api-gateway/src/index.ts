import "dotenv/config";
import { createApp } from "./app.js";
import apiGatewayLogger from "./utils/logger.js";

const app = createApp();
const PORT: number = parseInt(process.env.PORT ?? "3000", 10);

// validate env variables
if (
  !process.env.LOG_LEVEL ||
  !process.env.USERS_INTERNAL_API_HOST ||
  !process.env.USERS_INTERNAL_API_BASE_PATH ||
  !process.env.AUTH0_ISSUER ||
  !process.env.AUTH0_CLIENT_ID ||
  !process.env.AUTH0_AUDIENCE ||
  !process.env.AUTH0_JWKS_URL
) {
  apiGatewayLogger.error("Missing one or more environment variable values");
}

app.listen(PORT, () => {
  console.log(`[API Gateway] Running on port: ${PORT}`);
});
