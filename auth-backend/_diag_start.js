const { spawnSync } = require('child_process');
const fs = require('fs');

const result = spawnSync('node', ['dist/server.js'], {
  cwd: __dirname,
  timeout: 6000,
  env: { ...process.env, PORT: '3001' },
});

const report = [
  `exit: ${result.status}`,
  `signal: ${result.signal}`,
  `stdout: ${(result.stdout || '').toString('utf8').slice(0, 3000)}`,
  `stderr: ${(result.stderr || '').toString('utf8').slice(0, 3000)}`,
].join('\n---\n');

fs.writeFileSync(__dirname + '/_diag_report.txt', report, 'utf8');
