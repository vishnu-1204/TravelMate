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
};

export const getBookingConfirmationTemplate = (details: BookingEmailDetails) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed - TravelMate</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f7f9;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin: 30px 0 15px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .data-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #f0f4f8;
    }
    .data-table td:first-child {
      font-weight: 600;
      color: #64748b;
      width: 40%;
    }
    .itinerary-item {
      margin-bottom: 20px;
      padding-left: 15px;
      border-left: 3px solid #3b82f6;
    }
    .itinerary-day {
      font-weight: 600;
      color: #3b82f6;
      font-size: 14px;
      text-transform: uppercase;
    }
    .itinerary-title {
      font-weight: 600;
      color: #0f172a;
      margin: 4px 0;
    }
    .itinerary-desc {
      font-size: 14px;
      color: #64748b;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
    }
    .btn {
      display: inline-block;
      padding: 12px 25px;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        width: 100%;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TRAVELMATE</h1>
      <p style="margin-top: 10px; opacity: 0.8;">Your Adventure Awaits</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${details.firstName},</div>
      <p>Exciting news! Your booking for <strong>${details.packageTitle}</strong> has been confirmed. Get ready for an unforgettable journey.</p>
      
      <div class="section-title">Package Details</div>
      <table class="data-table">
        <tr>
          <td>Destination</td>
          <td>${details.packageTitle}</td>
        </tr>
        <tr>
          <td>Duration</td>
          <td>${details.duration}</td>
        </tr>
        <tr>
          <td>Amount Paid</td>
          <td>${details.price}</td>
        </tr>
      </table>

      <div class="section-title">Flight Tickets</div>
      <table class="data-table">
        <tr>
          <td>Booking Reference</td>
          <td><span style="color: #3b82f6; font-family: monospace; font-size: 16px;">${details.bookingReference}</span></td>
        </tr>
        <tr>
          <td>Airline</td>
          <td>${details.airline}</td>
        </tr>
        <tr>
          <td>Departure</td>
          <td>${details.departureTime}</td>
        </tr>
        <tr>
          <td>Arrival</td>
          <td>${details.arrivalTime}</td>
        </tr>
      </table>

      <div class="section-title">Trip Itinerary</div>
      ${details.itinerary.map(day => `
        <div class="itinerary-item">
          <div class="itinerary-day">Day ${day.day}</div>
          <div class="itinerary-title">${day.title}</div>
          <div class="itinerary-desc">${day.description}</div>
        </div>
      `).join('')}

      <div style="text-align: center;">
        <a href="#" class="btn">View Booking Details</a>
      </div>

      <div class="section-title">Inclusions & Exclusions</div>
      <table class="data-table">
        <tr>
          <td style="vertical-align: top;"><strong>What's Included</strong></td>
          <td>
            <ul style="margin: 0; padding-left: 20px;">
              ${details.included.map(item => `<li>${item}</li>`).join('') || '<li>Standard package inclusions</li>'}
            </ul>
          </td>
        </tr>
        <tr>
          <td style="vertical-align: top;"><strong>What's Excluded</strong></td>
          <td>
            <ul style="margin: 0; padding-left: 20px;">
              ${details.excluded.map(item => `<li>${item}</li>`).join('') || '<li>Personal expenses, tips, etc.</li>'}
            </ul>
          </td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p>&copy; 2026 TravelMate Travel Platform. All rights reserved.</p>
      <p>Sent to: ${details.email}</p>
      <p>Questions? Contact our support at info@travelmate.in</p>
    </div>
  </div>
</body>
</html>
`;
