import { sendBookingConfirmation } from "../services/email.service";
import { config } from "../config/env";

async function testEmail() {
  console.log("Testing email configuration...");
  console.log("Config:", {
    resendApiKey: config.resendApiKey ? "PRESENT" : "MISSING",
    resendFrom: config.resendFrom,
    smtpUser: config.smtpUser,
    smtpFrom: config.smtpFrom,
    supportEmail: config.supportEmail
  });

  const user = {
    email: "travelmate713@gmail.com", // Send to yourself for testing
    name: "Test User"
  };

  const booking = {
    bookingReference: "TEST-123456",
    packageTitle: "Test Adventure",
    destination: "Test City",
    travelDate: "2026-12-25",
    totalAmount: 1000,
    travelers: 2,
    itinerarySummary: [{ day: 1, title: "Day 1", description: "Test activity" }],
    airline: "Test Air",
    departureTime: "10:00 AM",
    arrivalTime: "12:00 PM",
    included: ["Breakfast"],
    excluded: ["Lunch"]
  };

  try {
    console.log("Attempting to send booking confirmation...");
    const result = await sendBookingConfirmation(user, booking as any);
    console.log("Email sent successfully!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("Email failed!");
    console.error("Error:", error.message);
    if (error.stack) console.error(error.stack);
  }
}

testEmail().then(() => process.exit(0)).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
