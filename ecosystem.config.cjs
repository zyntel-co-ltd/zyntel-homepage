/**
 * PM2 ecosystem config for Zyntel Dashboard production.
 * Usage: pm2 start ecosystem.config.cjs
 * Reload (zero-downtime): pm2 reload ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'zyntel-api',
      script: 'dist/src/server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '5000',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '5000',
      },
      max_memory_restart: '500M',
      // Reload with 0 downtime (start new before killing old)
      listen_timeout: 8000,
      kill_timeout: 5000,
    },
  ],
};
