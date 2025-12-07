module.exports = {
  apps: [{
    name: 'wechat-bot',
    script: 'src/index.ts',
    interpreter: 'npx tsx',
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: '8080'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
