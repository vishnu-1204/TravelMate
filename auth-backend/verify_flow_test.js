const fs = require('fs');
const BACKEND_URL = 'http://localhost:3003';

async function verifyFlow() {
  const testEmail = `verify_test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';
  let log = "";
  const logger = (msg) => { console.log(msg); log += msg + "\n"; };

  logger(`\n--- Testing Verification-Free Flow for ${testEmail} ---`);

  try {
    // 1. Register
    logger('1. Registering new user...');
    const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const regData = await regRes.json();
    logger(`Status: ${regRes.status} ${JSON.stringify(regData)}`);

    if (regRes.status !== 201) {
      logger('Registration failed');
    } else {
      // 2. Login immediately
      logger('\n2. Attempting login without verification...');
      const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword })
      });
      const loginData = await loginRes.json();
      logger(`Status: ${loginRes.status} ${JSON.stringify(loginData)}`);

      if (loginRes.status === 200) {
        logger('\n✅ SUCCESS: Logged in without manual verification!');
      } else {
        logger('\n❌ FAILURE: Login failed!');
        logger('Message: ' + loginData.message);
      }
    }
  } catch (err) {
    logger('\n❌ Error during test: ' + err.message);
  }

  fs.writeFileSync('temp_out.txt', log);
}

verifyFlow();
