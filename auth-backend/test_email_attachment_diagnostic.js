const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const dotenv = require('dotenv');
const PDFDocument = require('pdfkit');

dotenv.config();

async function generatePdf() {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.text('Diagnostic Test PDF');
        doc.end();
    });
}

async function test() {
    console.log('--- Email Attachment Diagnostic START ---');
    
    if (process.env.RESEND_API_KEY) {
        console.log('\nTesting Resend API with Attachment...');
        const resend = new Resend(process.env.RESEND_API_KEY);
        try {
            const pdfBuffer = await generatePdf();
            console.log('Generated PDF Buffer Size:', pdfBuffer.length, 'bytes');
            
            const { data, error } = await resend.emails.send({
                from: process.env.RESEND_FROM || 'onboarding@resend.dev',
                to: 'delivered@resend.dev',
                subject: 'Test Email with Attachment',
                html: '<h1>Test Attachment</h1>',
                attachments: [
                    {
                        filename: 'test.pdf',
                        content: pdfBuffer,
                    }
                ]
            });
            
            if (error) {
                console.error('❌ Resend API Failed:', error.message);
                console.error('Error Details:', JSON.stringify(error, null, 2));
            } else {
                console.log('✅ Resend API SUCCESS:', data);
            }
        } catch (err) {
            console.error('❌ Resend SDK Error:', err.message);
        }
    }
    console.log('\n--- Email Attachment Diagnostic END ---');
}

test();
