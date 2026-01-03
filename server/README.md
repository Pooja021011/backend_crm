# Real Estate CRM - Backend (MVC)

This is the Node.js (TypeScript) Express backend following MVC structure.

Quick start

1) Prerequisites
- Node.js >= 20
- PostgreSQL 14+

2) Configure environment
- Copy .env.example to .env and set values

3) Install deps
- npm install

4) Generate Prisma client
- npm run prisma:generate

5) Run migrations (dev) and seed
- npm run prisma:migrate -- --name init
- npm run seed

6) Start the server (dev)
- npm run dev

API docs
- Swagger UI at http://localhost:4000/api/docs

Default seed
- Roles: ADMIN, MANAGER, ACQ, DISP, TC
- Admin user from env ADMIN_EMAIL/ADMIN_PASSWORD or admin@example.com / Admin@123

Twilio callbacks (important for production)
- Set `PUBLIC_BASE_URL` to your **HTTPS domain** (example: `https://realestate.withai.agency`)
- This is used to generate absolute webhook/callback URLs in TwiML and Twilio Voice API calls
- If `PUBLIC_BASE_URL` is not set, the server falls back to `APP_BASE_URL` or infers from request headers when possible

