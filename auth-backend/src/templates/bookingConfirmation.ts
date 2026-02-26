export type BookingEmailDetails = {
  firstName: string;
  email: string;
  packageTitle: string;
  duration: string;
  price: string;
  bookingReference: string;
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
};

export const getBookingConfirmationTemplate = (details: BookingEmailDetails) => {
  const isColdDestination = details.packageTitle.toLowerCase().includes('himachal') || 
                           details.packageTitle.toLowerCase().includes('kasol') || 
                           details.packageTitle.toLowerCase().includes('dharamshala') ||
                           details.packageTitle.toLowerCase().includes('manali');
  
  const isBeachOrWater = details.packageTitle.toLowerCase().includes('kerala') || 
                         details.packageTitle.toLowerCase().includes('goa') || 
                         details.packageTitle.toLowerCase().includes('beach');

  const transportHeader = details.transportType === 'flight' ? 'Flight Tickets' : 'Transport Details';
  const transportIcon = details.transportType === 'flight' ? '✈️' : '🚌';
  const heroImage = details.heroImage || `https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=800&q=80`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed - TravelMate</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }
    .hero {
      position: relative;
      height: 240px;
      background-image: url('${heroImage}');
      background-size: cover;
      background-position: center;
    }
    .hero-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(15, 23, 42, 0.8));
      padding: 40px 30px 20px;
      color: #ffffff;
    }
    .hero-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .subtext {
      color: #64748b;
      margin-bottom: 24px;
    }
    .summary-card {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: table;
      width: 100%;
    }
    .summary-item {
      display: table-cell;
      width: 33%;
      text-align: center;
      padding: 10px;
    }
    .summary-icon {
      font-size: 24px;
      margin-bottom: 8px;
      display: block;
    }
    .summary-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .summary-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      display: block;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 32px 0 16px;
      display: flex;
      align-items: center;
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #e2e8f0;
      margin-left: 12px;
    }
    .itinerary-item {
      position: relative;
      padding-left: 24px;
      margin-bottom: 20px;
      border-left: 2px solid #3b82f6;
    }
    .itinerary-item::before {
      content: "";
      position: absolute;
      left: -6px;
      top: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #3b82f6;
    }
    .itinerary-day {
      font-size: 11px;
      font-weight: 800;
      color: #3b82f6;
      text-transform: uppercase;
    }
    .itinerary-title {
      font-size: 15px;
      font-weight: 700;
      margin: 2px 0 4px;
    }
    .itinerary-desc {
      font-size: 13px;
      color: #64748b;
    }
    .pack-tips {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 24px 0;
    }
    .pack-tips h4 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #1e40af;
    }
    .pack-tips p {
      margin: 0;
      font-size: 13px;
      color: #1e40af;
    }
    .action-row {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2);
    }
    .footer {
      background: #f8fafc;
      padding: 40px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-links {
      margin-bottom: 20px;
    }
    .footer-links a {
      margin: 0 10px;
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
    }
    .support-box {
      font-size: 13px;
      color: #64748b;
      margin-top: 20px;
    }
    .referral {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px dashed #cbd5e1;
      font-weight: 600;
      color: #0f172a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="hero-overlay">
        <h1 class="hero-title">Pack your bags, ${details.firstName}! 🌏</h1>
      </div>
    </div>
    <div class="content">
      <div class="greeting">Your trip to ${details.packageTitle} is confirmed.</div>
      <p class="subtext">Get ready for an unforgettable journey. We've handled the details; you just focus on the adventure.</p>
      
      <div class="summary-card">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-icon">📍</span>
            <span class="summary-label">Destination</span>
            <span class="summary-value">${details.packageTitle}</span>
          </div>
          <div class="summary-item">
            <span class="summary-icon">📅</span>
            <span class="summary-label">Duration</span>
            <span class="summary-value">${details.duration}</span>
          </div>
          <div class="summary-item">
            <span class="summary-icon">💳</span>
            <span class="summary-label">Total Amount</span>
            <span class="summary-value">${details.price}</span>
          </div>
        </div>
      </div>

      <div class="section-title">📅 Official Schedule</div>
      <p style="font-size: 14px; margin-top: -8px; margin-bottom: 16px;">
        <strong>Check-in:</strong> ${details.checkIn || details.departureTime.split(' ')[0] || 'TBA'} <br>
        <strong>Check-out:</strong> ${details.checkOut || 'TBA'}
      </p>

      <div class="section-title">${transportIcon} ${transportHeader}</div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
        <div style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Booking ID: ${details.bookingReference}</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">${details.airline}</div>
        <div style="display: flex; justify-content: space-between;">
           <div>
             <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Departure</div>
             <div style="font-size: 14px; font-weight: 600;">${details.departureTime}</div>
           </div>
           <div>
             <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Arrival</div>
             <div style="font-size: 14px; font-weight: 600;">${details.arrivalTime}</div>
           </div>
        </div>
      </div>

      ${isColdDestination ? `
      <div class="pack-tips">
        <h4>🧤 Pro Packer Tip</h4>
        <p>You're heading to the mountains! Don't forget to pack your woolens, extra socks, and comfortable trekking shoes.</p>
      </div>
      ` : isBeachOrWater ? `
      <div class="pack-tips">
        <h4>☀️ Pro Packer Tip</h4>
        <p>Sun, sand, and water! Don't forget your sunscreen, a hat, and comfortable breathable clothes for your coastal escape.</p>
      </div>
      ` : ''}

      <div class="section-title">📜 Trip Itinerary</div>
      ${details.itinerary.map(day => `
        <div class="itinerary-item">
          <div class="itinerary-day">Day ${day.day}</div>
          <div class="itinerary-title">${day.title}</div>
          <div class="itinerary-desc">${day.description}</div>
        </div>
      `).join('')}

      <div class="action-row">
        <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Trip+to+${encodeURIComponent(details.packageTitle)}&dates=${encodeURIComponent(details.checkIn || '')}/${encodeURIComponent(details.checkOut || '')}&details=Booking+Ref:+${details.bookingReference}" class="btn">Add to Google Calendar</a>
      </div>

      <div class="section-title">✅ Included highlights</div>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569;">
        ${details.included.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('') || '<li>3-Star Hotel Stay</li><li>Daily Breakfast & Dinner</li><li>Professional Tour Guide</li>'}
      </ul>
    </div>

    <div class="footer">
      <div class="footer-links">
        <a href="#">Manage Booking</a>
        <a href="#">Support Center</a>
        <a href="#">Social Media</a>
      </div>
      <p style="font-size: 12px; margin: 0;">&copy; 2026 TravelMate. All rights reserved.</p>
      <div class="support-box">
        <strong>Need help?</strong> Call our 24/7 helpline: ${details.emergencyContact || '+91 9342180670'}
      </div>
      <div class="referral">
        🎁 Share the adventure! Refer a friend and get 10% off your next booking.
      </div>
    </div>
  </div>
</body>
</html>
`;
};
