const fs = require('fs');
const http = require('http');

let output = '';
const log = (msg) => {
    console.log(msg);
    output += msg + '\n';
};

log('--- PING DIAGNOSTIC START ---');
log('Time: ' + new Date().toISOString());

const ping = (url) => {
    return new Promise((resolve) => {
        log(`Pinging ${url}...`);
        const req = http.get(url, (res) => {
            log(`Response from ${url}: STATUS ${res.statusCode}`);
            res.on('data', () => {});
            res.on('end', () => resolve());
        });
        req.on('error', (err) => {
            log(`Error pinging ${url}: ${err.message}`);
            resolve();
        });
        req.end();
    });
};

async function run() {
    await ping('http://localhost:3000');
    await ping('http://127.0.0.1:3000');
    log('--- PING DIAGNOSTIC END ---');
    fs.writeFileSync('diag_results.txt', output);
}

run();
