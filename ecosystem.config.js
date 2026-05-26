/**
 * PM2 Ecosystem Configuration
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'projectflow-api',
      script: './backend/src/server.js',
      instances: 'max',          // Use all CPU cores
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Auto-restart on memory leak (512MB threshold)
      max_memory_restart: '512M',
      // Restart delay
      restart_delay: 4000,
      // Exponential backoff restart
      exp_backoff_restart_delay: 100,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 8000,
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/projectflow.git',
      path: '/var/www/projectflow',
      'pre-deploy-local': '',
      'post-deploy': [
        'cd backend && npm ci --only=production',
        'cd ../frontend && npm ci && npm run build',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save',
      ].join(' && '),
      'pre-setup': '',
    },
  },
}
