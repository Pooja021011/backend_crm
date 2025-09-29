module.exports = {
  apps: [
    {
      name: 'real-estate-backend',
      script: 'npm',
      args: 'run dev',
      cwd: './server',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      log_file: './server/logs/combined.log',
      out_file: './server/logs/out.log',
      error_file: './server/logs/error.log',
      time: true
    },
    {
      name: 'real-estate-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      env: {
        NODE_ENV: 'development',
        VITE_API_BASE_URL: 'http://localhost:4000/api/v1'
      },
      watch: false,
      ignore_watch: ['node_modules', 'dist', '.vite'],
      log_file: './logs/frontend-combined.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-error.log',
      time: true,
      max_memory_restart: '500M'
    }
  ]
};
