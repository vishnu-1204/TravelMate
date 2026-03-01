export type FlightTicketEmailDetails = {
  passengerName: string;
  flightNumber: string;
  departureCity: string;
  arrivalCity: string;
  departureDateTime: string;
  arrivalDateTime: string;
  airline: string;
  pnr: string;
  supportEmail?: string;
  supportPhone?: string;
  registeredEmail: string;
};

export const getFlightTicketTemplate = (details: FlightTicketEmailDetails) => {
  const supportEmail = details.supportEmail || "travelmate713@gmail.com";
  const supportPhone = details.supportPhone || "+91 9342180670";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Flight Ticket - TravelMate</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #0f172a; margin: 0; }
    .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 99px; font-weight: bold; font-size: 14px; margin-top: 10px; }
    .summary { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 10px 0; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { font-weight: 700; color: #0f172a; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
    .button { display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px; }
    .airline-brand { font-size: 18px; color: #1e40af; font-weight: bold; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Flight Details ✈️</h1>
      <div class="status-badge">E-Ticket Attached</div>
    </div>
    
    <p>Dear ${details.passengerName},</p>
    <p>Following up on your recent booking confirmation, we are pleased to share your confirmed flight details for your upcoming trip. Your official <strong>Flight E-Ticket</strong> is attached to this email as a PDF document.</p>
    <p>Please ensure you carry a printed or digital copy of the attached ticket along with a valid government-issued photo ID to the airport.</p>
    
    <div class="summary">
      <div class="airline-brand">${details.airline}</div>
      <div class="row"><span class="label">Passenger Name:</span><span class="value">${details.passengerName}</span></div>
      <div class="row"><span class="label">Flight Number:</span><span class="value">${details.flightNumber}</span></div>
      <div class="row"><span class="label">Booking Ref (PNR):</span><span class="value">${details.pnr}</span></div>
      <div class="row"><span class="label">Departure:</span><span class="value">${details.departureCity} <br> <span style="font-weight:normal; font-size:12px;">${details.departureDateTime}</span></span></div>
      <div class="row"><span class="label">Arrival:</span><span class="value">${details.arrivalCity} <br> <span style="font-weight:normal; font-size:12px;">${details.arrivalDateTime}</span></span></div>
    </div>
    
    <p><strong>Note:</strong> We recommend arriving at the airport at least 2 hours before domestic departures and 3 hours before international departures. Baggage drop counters usually close 45-60 minutes prior to departure.</p>
    
    <div class="footer">
      <p>Need help or wish to make changes? Contact us at ${supportEmail} or ${supportPhone}</p>
      <p>This email was sent to ${details.registeredEmail}</p>
      <p>&copy; ${new Date().getFullYear()} TravelMate Solutions. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};
