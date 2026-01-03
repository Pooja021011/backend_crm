import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { setupSwagger } from './docs/swagger.js';

export const app = express();

// Allow correct protocol/host reconstruction behind a reverse proxy (nginx, Azure, etc.)
// This is important for generating absolute HTTPS callback URLs (e.g., Twilio webhooks).
app.set('trust proxy', 1);

// app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(requestId);
// app.use(pinoHttp({ logger })); // Temporarily disabled due to type mismatch

// setupSwagger(app);

app.use('/api/v1', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

