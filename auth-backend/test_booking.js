
const http = require('http');

const data = JSON.stringify({
  bookingReference: 'TM-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
  packageTitle: 'Verification Test Package',
  destination: 'Automated Test Land',
  duration: '1 Day',
  travelDate: '2026-12-25',
  travelers: 2,
  travelerName: 'Verification Bot',
  email: 'vishnuvijay0708@gmail.com', // Use an email from the config
  phone: '1234567890',
  totalAmount: 9999,
  airline: 'Test Air',
  departureTime: '10:00 AM'
});

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/booking/book',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', responseData);
    process.exit(res.statusCode === 201 ? 0 : 1);
  });
});

req.on('error', (e) => {
  console.error(`PROBLEM WITH REQUEST: ${e.message}`);
  process.exit(1);
});

req.write(data);
req.end();
