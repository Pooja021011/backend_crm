import 'dotenv/config';
import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';

const server = http.createServer(app);

server.listen(env.PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://0.0.0.0:${env.PORT}`);
});

