// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'soc_portal',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 5001',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './pm2_logs/err.log',
      out_file: './pm2_logs/out.log',
      log_file: './pm2_logs/combined.log',
      time: true
    }
  ]
};