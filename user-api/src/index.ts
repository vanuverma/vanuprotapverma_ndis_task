import 'dotenv/config';
import express, { type Request, type Response } from 'express';

const app = express();

const PORT: number = parseInt(process.env.PORT ?? '4000', 10);

app.get('/health', (req: Request, res: Response) => {
    res.json({
        message: 'USER API is healthy'
    });
});

const apiServer = app.listen(PORT, () => {
    console.log(`[USER API] Running on port: ${PORT}`);
});
