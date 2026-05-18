import { sendBookingConfirmation } from '../services/email.service';

async function testEmail() {
  try {
    console.log("Testing Resend/SMTP...");
    const res = await sendBookingConfirmation(
      { email: 'vishnuvijay0708@gmail.com', name: 'Vishnu' },
      {
        bookingReference: 'TM-TEST123',
        packageTitle: 'Diagnostic Test',
        destination: 'System Check',
        duration: '1 Day',
        travelDate: '2026-03-10',
        totalAmount: 999,
        paymentStatus: 'Paid',
        airline: 'Test Air',
        departureTime: '10:00 AM',
        arrivalTime: '11:00 AM',
        itinerarySummary: [{ day: 1, title: 'Test Day', description: 'Testing' }],
        checkIn: '2026-03-10',
        checkOut: '2026-03-11',
      }
    );
    console.log("Send SUCCESS:", res);
  } catch (err: any) {
    console.error("Send FAILED:", err.message);
  }
}

testEmail();
