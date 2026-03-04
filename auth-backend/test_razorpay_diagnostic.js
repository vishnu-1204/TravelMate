
const Razorpay = require('razorpay');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const diagPath = path.resolve(__dirname, 'diag_internal_v2.txt');
const envPath = path.resolve(__dirname, '.env');

const logOutput = (msg) => {
    const time = new Date().toISOString();
    const line = `[${time}] ${msg}\n`;
    fs.appendFileSync(diagPath, line);
    console.log(msg);
};

logOutput('--- START DIAGNOSTIC ---');
logOutput(`Current Working Directory: ${process.cwd()}`);
logOutput(`Env Path resolved to: ${envPath}`);

if (!fs.existsSync(envPath)) {
    logOutput('CRITICAL: .env file NOT FOUND at ' + envPath);
} else {
    logOutput('.env file found.');
}

dotenv.config({ path: envPath });

const key_id = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim();
const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

logOutput(`Key ID: ${key_id ? `${key_id.substring(0, 8)}...` : 'MISSING'}`);
logOutput(`Key Secret: ${key_secret ? `${key_secret.substring(0, 4)}...` : 'MISSING'}`);

if (!key_id || !key_secret) {
    logOutput('CRITICAL: Razorpay keys are missing or incomplete.');
    process.exit(1);
}

const rzp = new Razorpay({
    key_id: key_id,
    key_secret: key_secret
});

async function testOrder() {
    try {
        logOutput('Attempting to create a test order...');
        const order = await rzp.orders.create({
            amount: 100, // 1 INR in paise
            currency: 'INR',
            receipt: 'test_receipt_' + Date.now()
        });
        logOutput(`SUCCESS: Order created! ID: ${order.id}`);
    } catch (error) {
        logOutput('FAILURE: Error creating order.');
        logOutput(`Status Code: ${error.statusCode}`);
        logOutput(`Full Error Object: ${JSON.stringify(error, null, 2)}`);
    }
}

testOrder();
