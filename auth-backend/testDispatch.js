const http = require('http');

const data = JSON.stringify({
  booking: {
    user_id: "test_user_id",
    bookingReference: `TM-${Date.now()}`,
    packageId: "test_package_id",
    packageTitle: "Email Dispatch Test",
    destination: "Test Destination",
    duration: "4 Days",
    travelDate: new Date().toISOString().split('T')[0],
    travelers: 1,
    travelerName: "Test User",
    first_name: "Test",
    last_name: "User",
    email: "vishnuvijay0708@gmail.com",
    phone: "+91 1234567890",
    totalAmount: 1000,
    payment_status: "paid",
    payment_verified: true,
    payment_id: "test_payment_123",
    booking_status: "confirmed",
    airline: "Test Flight"
  }
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/booking/book',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log("Sending check to /api/booking/book...");
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (error) => console.error(error));
req.write(data);
req.end();
