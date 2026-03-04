const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    console.log('--- Email Diagnostic START ---');
    console.log('Time:', new Date().toISOString());
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
    console.log('SMTP_USER:', process.env.SMTP_USER || 'Missing');
    
    // Test SMTP
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.log('\nTesting SMTP (smtp.gmail.com:587)...');
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            connectionTimeout: 10000,
        });

        try {
            await transporter.verify();
            console.log('✅ SMTP Connection Successful');
        } catch (err) {
            console.error('❌ SMTP Connection Failed:', err.message);
        }
    }

    // Test Resend
    if (process.env.RESEND_API_KEY) {
        console.log('\nTesting Resend API...');
        const resend = new Resend(process.env.RESEND_API_KEY);
        try {
            const { data, error } = await resend.emails.send({
                from: process.env.RESEND_FROM || 'onboarding@resend.dev',
                to: 'delivered@resend.dev',
                subject: 'Test Email',
                html: '<h1>Test</h1>'
            });
            if (error) {
                console.error('❌ Resend API Failed:', error.message);
            } else {
                console.log('✅ Resend API SUCCESS:', data);
            }
        } catch (err) {
            console.error('❌ Resend SDK Error:', err.message);
        }
    }
    console.log('\n--- Email Diagnostic END ---');
}

test();
