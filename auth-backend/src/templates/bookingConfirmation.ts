export type BookingEmailDetails = {
  firstName: string;
  email: string;
  packageTitle: string;
  destination?: string;
  duration: string;
  price: string;
  refundPrice?: string;
  bookingReference: string;
  travelDate: string;
  travelers?: number;
  paymentStatus?: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  itinerary: { day: number; title: string; description: string }[];
  included: string[];
  excluded: string[];
  checkIn?: string;
  checkOut?: string;
  heroImage?: string;
  transportType?: 'flight' | 'bus' | 'train' | 'other';
  emergencyContact?: string;
  supportEmail?: string;
  supportPhone?: string;
};

export const getBookingConfirmationTemplate = (details: BookingEmailDetails) => {
  const travelDate = details.travelDate || 'TBA';
  const travelers = details.travelers || 1;
  const destination = details.destination || details.packageTitle;
  const supportEmail = details.supportEmail || 'travelmate713@gmail.com';
  const supportPhone = details.supportPhone || '+91 9342180670';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed - TravelMate</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #0f172a; margin: 0; }
    .status-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 99px; font-weight: bold; font-size: 14px; margin-top: 10px; }
    .summary { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 10px 0; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { font-weight: 700; color: #0f172a; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
    .button { display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmed! 🎉</h1>
      <div class="status-badge">Payment Successful</div>
    </div>
    
    <p>Dear ${details.firstName},</p>
    <p>Thank you for booking with <strong>TravelMate</strong>. Your journey to ${destination} is confirmed! Your booking ticket is attached to this email as a PDF.</p>
    
    <div class="summary">
      <div class="row"><span class="label">Booking Ref:</span><span class="value">${details.bookingReference}</span></div>
      <div class="row"><span class="label">Package:</span><span class="value">${details.packageTitle}</span></div>
      <div class="row"><span class="label">Date:</span><span class="value">${travelDate}</span></div>
      <div class="row"><span class="label">Travelers:</span><span class="value">${travelers}</span></div>
      <div class="row"><span class="label">Paid:</span><span class="value">${details.price}</span></div>
    </div>
    
    <p>We look forward to hosting you. Our team will contact you shortly with further details.</p>
    
    <div class="footer">
      <p>Questions? Contact us at ${supportEmail} or ${supportPhone}</p>
      <p>&copy; 2026 TravelMate Solutions. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};
