import 'dotenv/config';
import './db';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import usersRouter from './routes/users';
import tripsRouter from './routes/trips';
import requestsRouter from './routes/requests';
import reviewsRouter from './routes/reviews';
import priceRouter from './routes/price';
import matchesRouter from './routes/matches';
import demoRouter from './routes/demo';
import tipsRouter from './routes/tips';
import voiceRouter from './routes/voice';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', usersRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/price', priceRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/tips', tipsRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/demo', demoRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CarryTON backend running on port ${PORT}`);
});
