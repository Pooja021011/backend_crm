// Augment Express Request with user
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; roles: string[] };
    id?: string;
  }
}

