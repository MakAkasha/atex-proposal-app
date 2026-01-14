module.exports = {
  apps: [{
    name: 'atex-q-system',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    autorestart: true,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    }
  }]
};