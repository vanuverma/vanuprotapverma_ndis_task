import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();
const PORT: number = parseInt(process.env.PORT ?? '4000', 10);

app.listen(PORT, () => {
  console.log(`[USER API] Running on port: ${PORT}`);
});
