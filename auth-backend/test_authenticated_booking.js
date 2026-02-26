const BACKEND_URL = 'http://localhost:3001';

async function runTests() {
  console.log('--- Starting Authenticated Booking Flow Tests ---');

  // 1. Setup: Register and Login to get a token
  const testEmail = `booker_${Math.floor(Math.random() * 1000)}@example.com`;
  const password = 'Password123';

  console.log(`\n1. Creating test user: ${testEmail}`);
  const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password })
  });
  const regData = await regRes.json();
  const token = regData.token;

  if (!token) {
    throw new Error('Failed to get auth token');
  }
  console.log('✅ User registered and token received.');

  // 2. Perform Authenticated Booking
  console.log('\n2. Attempting authenticated booking...');
  const bookingRef = `AUTH-TEST-${Math.random().toString(36).substring(7).toUpperCase()}`;
  
  const bookingRes = await fetch(`${BACKEND_URL}/api/booking/book`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      bookingReference: bookingRef,
      packageId: 'pkg-kasol-01',
      packageTitle: 'High Altitude Kasol Expedition',
      destination: 'Kasol',
      duration: '3 Days / 2 Nights',
      travelDate: '2026-03-10',
      travelers: 1,
      travelerName: 'Auth Tester',
      roomType: 'Double',
      phone: '9876543210',
      totalAmount: 15000,
      departureTime: '06:30 AM'
    })
  });

  const bookingData = await bookingRes.json();
  console.log(`Status: ${bookingRes.status}`, bookingData);

  if (bookingRes.ok) {
    console.log('✅ Booking request successful!');
    console.log('Check server logs to verify:');
    console.log(`- Booking ${bookingRef} linked to User ID: ${regData.user.id}`);
    console.log(`- Confirmation email sent to: ${testEmail}`);
  } else {
    console.error('❌ Booking failed:', bookingData);
  }

  // 3. Test Unauthorized Access (Missing Token)
  console.log('\n3. Testing unauthorized access (missing token)...');
  const failRes = await fetch(`${BACKEND_URL}/api/booking/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageTitle: 'Should Fail' })
  });
  console.log(`Status: ${failRes.status} (Expected 401)`);
  const failData = await failRes.json();
  if (failRes.status === 401) {
    console.log('✅ Unauthorized access correctly blocked.');
  }

  console.log('\n--- Tests Completed ---');
}

runTests().catch(err => {
  console.error('Test script failed:', err);
});
