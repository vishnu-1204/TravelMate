const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minimal server is running');
});

const PORT = 3005;
server.listen(PORT, () => {
  const msg = `Server listening on port ${PORT}`;
  console.log(msg);
  fs.writeFileSync('minimal_server.log', msg);
});
