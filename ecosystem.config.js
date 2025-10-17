module.exports = {
  apps: [{
    name: "SOC-PORTAL",
    script: "npm",
    args: "start",
    cwd: "/home/soc_portal",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    
    // CRITICAL: Environment variables for production
    env: {
      NODE_ENV: "production",
      PORT: 5001,
      HOST: "0.0.0.0",
      NEXTAUTH_URL: "http://167.88.38.114:8080",
      NEXTAUTH_SECRET: "your-secret-key-change-this-in-production",
      // Add any other environment variables you need
    },
    
    env_production: {
      NODE_ENV: "production",
      PORT: 5001,
      HOST: "0.0.0.0", 
      NEXTAUTH_URL: "http://167.88.38.114:8080",
      NEXTAUTH_SECRET: "your-secret-key-change-this-in-production",
    },
    
    log_file: "/home/soc_portal/pm2_logs/combined.log",
    out_file: "/home/soc_portal/pm2_logs/out.log",
    error_file: "/home/soc_portal/pm2_logs/err.log",
    time: true,
    combine_logs: true,
    merge_logs: true
  }]
};