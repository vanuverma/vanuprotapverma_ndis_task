import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();
const PORT: number = parseInt(process.env.PORT ?? '3000', 10);

// check env vars


app.listen(PORT, () => {
  console.log(`[API Gateway] Running on port: ${PORT}`);
});
