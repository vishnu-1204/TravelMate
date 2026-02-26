async function testDelayedBooking() {
  const bookingData = {
    email: "vishnu@example.com",
    travelerName: "Vishnu Test",
    bookingReference: "TM-DELAY-TEST-" + Math.random().toString(36).substring(7).toUpperCase(),
    packageId: "pkg-kasol-01",
    packageTitle: "High Altitude Kasol Expedition",
    destination: "Kasol",
    totalAmount: 15000,
    duration: "3 Days / 2 Nights",
    travelDate: "2026-05-20",
    travelers: 2,
    phone: "9876543210"
  };

  try {
    console.log("Sending booking request...");
    const response = await fetch('http://localhost:3001/api/booking/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    const data = await response.json();
    console.log("STATUS:", response.status);
    console.log("RESPONSE:", data);
    console.log("\n--- Observation Started ---");
    console.log("1. Check your logs for 'Confirmation email successfully dispatched'.");
    console.log("2. Wait 30 seconds...");
    console.log("3. Look for 'Delayed Itinerary email triggered' in logs.");
  } catch (error) {
    console.error("Booking FAILED:", error.message);
  }
}

testDelayedBooking();
