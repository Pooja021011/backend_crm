import 'dotenv/config';
import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { schedulerService } from './services/schedulerService.js';

const server = http.createServer(app);

server.listen(env.PORT, '0.0.0.0', async () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  
  // Initialize scheduler for automated tasks
  try {
    await schedulerService.init();
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  schedulerService.stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

