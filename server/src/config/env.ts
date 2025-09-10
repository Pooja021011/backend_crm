export const env = {
  PORT: Number(process.env.PORT || 4000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'changeme',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'changeme',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

