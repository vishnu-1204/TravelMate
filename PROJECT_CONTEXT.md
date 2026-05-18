# TravelMate Project Context

## 🚀 Project Overview
TravelMate is a premium, high-end travel booking platform focused on:
- Seamless transactional flows.
- Real-time flight data integration (Amadeus API).
- Professional documentation (Dynamic PDF tickets).
- Luxury user experience with clean, high-end aesthetics.

## 🛠️ Core Tech Stack
- **Backend:** Node.js (auth-backend) with TypeScript.
- **Frontend:** React (TypeScript), specifically utilizing `Payment.tsx` and `MyBookings.tsx`.
- **Database/Auth:** Turso Cloud (for reviews, booking tables, and profiles).
- **Flight Data:** Amadeus Self-Service API via `amadeusProvider.ts`.
- **Email Service:** Resend SDK with React-based HTML templates.
- **Documentation:** `pdfkit` for branded, rich-data ticket generation.

## 📂 Key System Logic
| Feature | Implementation Detail |
| :--- | :--- |
| **Flight Search** | Real-time queries via `searchFlightOffers` in `amadeusProvider.ts`. Handles city-to-IATA mapping. |
| **Transactional Email** | Responsive premium templates in `templates/bookingConfirmation.ts`. |
| **PDF Generation** | Dark-themed "TRAVELMATE" wordmark, flight box layouts, and inclusion lists. |
| **Smart Checkout** | "Use My Profile" for 90% faster booking; auto-saves traveler data to Turso Cloud. |
| **Reviews** | Verified Purchase logic linked to confirmed booking status. |

## 🎨 Design & Coding Standards
- **UI/UX:** "Clean Box" layouts for data (e.g., flight timings). Branding: "Premium/Dark Stylized."
- **Currency:** Strictly use the Indian Rupee symbol (₹) for all pricing.
- **Data Integrity:** Dynamic traveler names, flight duration, and airline-specific metadata in all communications.
- **Error Handling:** External API calls must include connectivity verification (e.g., `test-flight-search.ts`).

## 🛠️ Development Directives
- **Context Awareness:** Reference existing components like `ReviewCard` and `ReviewForm` for social proof modifications.
- **API Security:** `GET /api/booking/download-ticket/:reference` is the primary endpoint for PDF generation.
- **Consistency:** Adhere to established TypeScript patterns in `auth-backend` and `src` directories.
