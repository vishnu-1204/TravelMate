const BACKEND_URL = 'http://localhost:3001';

async function runTests() {
  console.log('--- Starting Authentication Flow Tests (Using Native Fetch) ---');

  const testEmail = `TestUser_${Math.floor(Math.random() * 1000)}@Example.com`;
  const testPassword = 'Password123';

  // 1. Register with mixed-case email
  console.log(`\n1. Registering: ${testEmail}`);
  const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const regData = await regRes.json();
  console.log(`Status: ${regRes.status}`, regData);

  // 2. Login with lowercase email (should work)
  const loginEmailLower = testEmail.toLowerCase();
  console.log(`\n2. Login with lowercase: ${loginEmailLower}`);
  const loginRes1 = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loginEmailLower, password: testPassword })
  });
  const loginData1 = await loginRes1.json();
  console.log(`Status: ${loginRes1.status}`, loginData1);

  // 3. Login with wrong password
  console.log(`\n3. Login with WRONG password`);
  const loginRes2 = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loginEmailLower, password: 'WrongPassword' })
  });
  const loginData2 = await loginRes2.json();
  console.log(`Status: ${loginRes2.status}`, loginData2);
  if (loginData2.message === 'Incorrect password') {
    console.log('✅ Specific error "Incorrect password" verified.');
  }

  // 4. Login with non-existent email
  console.log(`\n4. Login with non-existent email`);
  const loginRes3 = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@travelmate.com', password: 'Any' })
  });
  const loginData3 = await loginRes3.json();
  console.log(`Status: ${loginRes3.status}`, loginData3);
  if (loginData3.message === 'User not registered') {
    console.log('✅ Specific error "User not registered" verified.');
  }

  console.log('\n--- Tests Completed ---');
}

runTests().catch(err => {
  console.error('Test script failed:', err);
});
