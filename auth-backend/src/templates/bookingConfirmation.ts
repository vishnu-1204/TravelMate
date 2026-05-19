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
  payment_id?: string;
  guideName?: string;
  guidePhone?: string;
};

export const getBookingConfirmationTemplate = (details: BookingEmailDetails) => {
  const travelDate = details.travelDate || 'TBA';
  const travelers = details.travelers || 1;
  const destination = details.destination || details.packageTitle;
  const supportEmail = details.supportEmail || 'travelmate713@gmail.com';
  const supportPhone = details.supportPhone || '+91 9342180670';
  const guideName = details.guideName || 'Rahul Sharma';
  const guidePhone = details.guidePhone || '+91 98765 43210';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed - TravelMate</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .hero { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
    .hero h1 { margin: 0; font-size: 28px; letter-spacing: -0.5px; }
    .status-badge { display: inline-block; background: #22c55e; color: #ffffff; padding: 6px 16px; border-radius: 99px; font-weight: 600; font-size: 13px; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 40px; }
    .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .message { color: #475569; margin-bottom: 30px; }
    .summary { background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
    .summary-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 16px; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-size: 14px; }
    .value { font-weight: 600; color: #0f172a; font-size: 14px; text-align: right; }
    .ref-code { font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
    .next-steps { border-left: 4px solid #3b82f6; padding-left: 20px; margin-bottom: 30px; }
    .next-steps h3 { margin: 0 0 10px; font-size: 16px; color: #0f172a; }
    .footer { background: #f8fafc; padding: 30px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .footer a { color: #3b82f6; text-decoration: none; }
    .thank-you { font-style: italic; color: #64748b; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>Booking Confirmed! 🎉</h1>
      <div class="status-badge">Payment Verified</div>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${details.firstName},</p>
      <p class="message">Thank you for choosing <strong>TravelMate</strong> for your upcoming journey. We are pleased to confirm that your booking for <strong>${details.packageTitle}</strong> to ${destination} has been successfully processed.</p>
      
      <div class="summary">
        <span class="summary-title">Booking Details</span>
        <div class="row"><span class="label">Reference ID</span><span class="value"><span class="ref-code">${details.bookingReference}</span></span></div>
        <div class="row"><span class="label">Payment ID</span><span class="value">${details.payment_id || 'N/A'}</span></div>
        <div class="row"><span class="label">Destination</span><span class="value">${destination}</span></div>
        <div class="row"><span class="label">Travel Date</span><span class="value">${travelDate}</span></div>
        <div class="row"><span class="label">Travelers</span><span class="value">${travelers}</span></div>
        <div class="row"><span class="label">Amount Paid</span><span class="value" style="color: #16a34a;">${details.price}</span></div>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 30px; color: #1e3a8a;">
        <h3 style="margin: 0 0 12px; font-size: 16px; color: #1e3a8a; display: flex; align-items: center; gap: 8px;">
          <span>🧑‍✈️</span> Your Dedicated Tour Guide
        </h3>
        <p style="margin: 0 0 8px; font-size: 14px; color: #1e293b;">
          <strong>Guide Name:</strong> ${guideName}
        </p>
        <p style="margin: 0; font-size: 14px; color: #1e293b;">
          <strong>Phone / WhatsApp:</strong> <a href="https://wa.me/${guidePhone.replace(/[^0-9]/g, '')}" style="color: #2563eb; font-weight: 600; text-decoration: none;">${guidePhone}</a>
        </p>
      </div>
      
      <div class="next-steps">
        <h3>What happens next?</h3>
        <p style="margin: 0; font-size: 14px; color: #475569;">Our travel experts are now finalizing your arrangements. A detailed itinerary and travel guide will be shared with you shortly. Your official booking ticket is attached to this email.</p>
      </div>

      <p class="thank-you">We are honored to be part of your travel story. Thank you for trusting us with your journey!</p>
    </div>
    
    <div class="footer">
      <p>Need assistance? Contact our 24/7 support at <br/> 
      <a href="mailto:${supportEmail}">${supportEmail}</a> or <strong>${supportPhone}</strong></p>
      <p style="margin-top: 20px;">&copy; 2026 TravelMate. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};
