import { sendWelcomeEmail, sendVerificationEmail } from "../services/email.service";
import { config } from "../config/env";

async function testRegistrationEmails() {
  const testEmail = "travelmate713@gmail.com";
  const testToken = "test-token-12345";

  console.log("--- Testing Registration Emails ---");
  console.log("Target Email:", testEmail);
  console.log("Resend From:", config.resendFrom);
  console.log("SMTP From:", config.smtpFrom || config.smtpUser);

  try {
    console.log("\n1. Sending Welcome Email...");
    await sendWelcomeEmail({ email: testEmail, name: "Test User" });
    console.log("✅ Welcome Email process completed (check logs for Resend fallback).");

    console.log("\n2. Sending Verification Email...");
    await sendVerificationEmail({ email: testEmail, name: "Test User" }, testToken);
    console.log("✅ Verification Email process completed.");

  } catch (error: any) {
    console.error("\n❌ Fatal Error during test:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  }
}

testRegistrationEmails().then(() => {
  console.log("\n--- Test Finished ---");
  process.exit(0);
}).catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
