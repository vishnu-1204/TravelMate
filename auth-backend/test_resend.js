
const { Resend } = require('resend');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testMail() {
  console.log('Using API Key:', process.env.RESEND_API_KEY ? 'FOUND' : 'MISSING');
  console.log('Sending from:', process.env.RESEND_FROM);
  
  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: 'vishnuvijay0708@gmail.com',
      subject: 'TravelMate Diagnostic Test',
      html: '<strong>Resend is working!</strong>'
    });
    console.log('SUCCESS Response:', data);
  } catch (error) {
    console.error('ERROR Response:', error);
  }
}

testMail();
