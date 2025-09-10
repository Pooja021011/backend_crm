import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const spec = {
  openapi: '3.0.1',
  info: {
    title: 'Real Estate CRM API',
    version: '0.1.0'
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/auth/login': { post: { summary: 'Login' } },
    '/users': { get: { summary: 'List users' }, post: { summary: 'Create user' } },
    '/settings/pipelines': { get: { summary: 'List pipelines with stages' } },
    '/leads': { get: { summary: 'List leads' }, post: { summary: 'Create lead' } },
    '/leads/{id}': { get: { summary: 'Get lead' }, patch: { summary: 'Update lead' } },
    '/leads/{id}/stage': { post: { summary: 'Change stage' } },
    '/leads/{id}/tasks': { get: { summary: 'List tasks' }, post: { summary: 'Create task' } },
    '/leads/{id}/tasks/{taskId}': { patch: { summary: 'Update task' }, delete: { summary: 'Delete task' } },
    '/search/suggestions': { get: { summary: 'Search suggestions' } },
    '/files/{fileId}/download': { get: { summary: 'Download file' } },
  },
};

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

