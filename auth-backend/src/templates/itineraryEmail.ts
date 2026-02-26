export type ItineraryDetails = {
  firstName: string;
  packageTitle: string;
  bookingReference: string;
  itinerary: { day: number; title: string; description: string }[];
  hotelName?: string;
  checkInTime?: string;
};

export const getItineraryEmailTemplate = (details: ItineraryDetails) => {
  const isHighAltitude = details.packageTitle.toLowerCase().includes('dharamshala') || 
                         details.packageTitle.toLowerCase().includes('kasol') ||
                         details.packageTitle.toLowerCase().includes('manali') ||
                         details.packageTitle.toLowerCase().includes('leh');

  const timelineHtml = details.itinerary.map(item => `
    <div class="timeline-item">
      <div class="day-badge">Day ${item.day}</div>
      <div class="timeline-content">
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-desc">${item.description}</div>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Detailed Itinerary - TravelMate</title>
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #0f172a;
      color: #ffffff;
      padding: 40px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.8;
      font-size: 14px;
    }
    .content {
      padding: 32px;
    }
    .intro {
      margin-bottom: 32px;
    }
    .intro h2 {
      font-size: 20px;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .intro p {
      color: #64748b;
    }
    .hotel-info {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hotel-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .hotel-value {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .timeline {
      margin-bottom: 32px;
    }
    .timeline-item {
      display: flex;
      margin-bottom: 24px;
    }
    .day-badge {
      min-width: 60px;
      height: 32px;
      background: #3b82f6;
      color: white;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      margin-right: 16px;
      flex-shrink: 0;
    }
    .timeline-content {
      padding-top: 4px;
    }
    .timeline-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .timeline-desc {
      font-size: 14px;
      color: #64748b;
    }
    .altitude-warning {
      background: #fff7ed;
      border-left: 4px solid #f97316;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 32px 0;
    }
    .altitude-warning h4 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #9a3412;
    }
    .altitude-warning p {
      margin: 0;
      font-size: 13px;
      color: #9a3412;
    }
    .footer {
      background: #f8fafc;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>The Wait is Over! 🗺️</h1>
      <p>Your Adventure Strategy for ${details.packageTitle}</p>
    </div>
    <div class="content">
      <div class="intro">
        <h2>Hey ${details.firstName},</h2>
        <p>As promised, here is your day-by-day plan. While the first email confirmed you're going, this one shows you exactly how much fun you're going to have!</p>
      </div>

      <div class="hotel-info">
        <div>
          <div class="hotel-label">Primary Stay</div>
          <div class="hotel-value">${details.hotelName || 'Premium TravelMate Partner'}</div>
        </div>
        <div>
          <div class="hotel-label">Check-in</div>
          <div class="hotel-value">${details.checkInTime || '12:00 PM'}</div>
        </div>
      </div>

      ${isHighAltitude ? `
      <div class="altitude-warning">
        <h4>⛰️ High Altitude Travel Tip</h4>
        <p>You're heading to a high-altitude zone (${details.packageTitle.split(' ').pop()}). Remember to stay hydrated, avoid strenuous activity on Day 1, and carry basic AMS medication if needed.</p>
      </div>
      ` : ''}

      <div class="timeline">
        ${timelineHtml}
      </div>

      <p style="text-align: center; color: #64748b; font-size: 14px;">
        Ref: ${details.bookingReference}
      </p>
    </div>
    <div class="footer">
      © 2026 TravelMate Solutions. All rights reserved.<br>
      This is an automated itinerary summary.
    </div>
  </div>
</body>
</html>
  `;
};
