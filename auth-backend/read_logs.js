
const fs = require('fs');
const path = require('path');

const logPath = path.resolve(__dirname, 'persistent_server.log');

try {
    if (!fs.existsSync(logPath)) {
        console.log('Log file does not exist:', logPath);
        process.exit(0);
    }

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    const lastLines = lines.slice(-100);
    console.log('--- LAST 100 LOG LINES ---');
    console.log(lastLines.join('\n'));
    console.log('--- END OF LOGS ---');
} catch (error) {
    console.error('Error reading log file:', error.message);
}
