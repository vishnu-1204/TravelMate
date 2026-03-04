import { razorpay } from "../utils/razorpay";
import { Router, Request, Response } from "express";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/env";
import { getDb } from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { Resend } from "resend";
import { sendBookingConfirmation, sendFlightTicketEmail, recordEmailFailure } from "../services/email.service";
import { searchFlightOffers } from "../modules/packages/provider/amadeusProvider";
import { getPackageById } from "../modules/packages/service/packageService";
import { logger } from "../utils/logger";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

const router = Router();
const EMAIL_RETRY_LIMIT = 3;

type ItineraryDay = { day: number; title: string; activities: string[]; narrative?: string };
type ItineraryNight = { night: number; accommodation: string; meals: string };

type BookingEmailBody = {
  // Common Fields
  email?: string;
  travelerName?: string;
  fullName?: string; // For compatibility
  phone?: string;
  bookingReference?: string;
  bookingId?: string;
  paymentId?: string;
  userId?: string;
  
  // Package/Trip Info
  packageId?: string;
  packageTitle?: string;
  destination?: string;
  travelDate?: string;
  totalAmount?: number;
  travelers?: number;
  passengers?: number; // For compatibility
  travelCategory?: string; // For compatibility
  duration?: string;
  roomType?: string;
  
  // Transport
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  transportType?: 'flight' | 'bus' | 'train' | 'other';
  transportDetails?: string; // For compatibility
  
  // Detailed Content
  itinerary?: ItineraryDay[];
  itineraryDays?: ItineraryDay[]; // For compatibility
  itineraryNights?: ItineraryNight[]; // For compatibility
  activities?: string[]; // For compatibility
  included?: string[];
  excluded?: string[];
  checkIn?: string;
  checkOut?: string;
  emergencyContact?: string;
  travelGuidelines?: string[]; // For compatibility
  documentsToCarry?: string[]; // For compatibility
  importantNotes?: string[]; // For compatibility
};

type BookingRecord = {
  id: string;
  user_id: string;
  booking_reference: string | null;
  package_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  package_title: string;
  payment_id: string | null;
  payment_status: string;
  payment_verified: boolean;
  travelers: number;
  total_amount: number;
  booking_terms: Record<string, unknown> | null;
  email_sent: boolean | null;
  booking_status: string | null;
};

type AdminBookingRow = {
  booking_reference: string | null;
  email: string;
  total_amount: number;
  email_sent: boolean | null;
  created_at: string;
};

type EmailPayload = {
  fullName: string;
  email: string;
  phone: string;
  bookingReference: string;
  bookingId: string;
  paymentId: string;
  packageTitle: string;
  destination: string;
  travelDate: string;
  passengers: number;
  totalAmount: number;
  travelCategory: string;
  itineraryDays: ItineraryDay[];
  itineraryNights: ItineraryNight[];
  transportDetails: string;
  activities: string[];
  checkIn: string;
  checkOut: string;
  emergencyContact: string;
  travelGuidelines: string[];
  documentsToCarry: string[];
  importantNotes: string[];
  duration: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  included: string[];
  excluded: string[];
};

let cachedClient: SupabaseClient | null = null;
const hasSmtp = () => Boolean(config.smtpHost && config.smtpUser && config.smtpPass && config.smtpFrom);
const hasSupabase = () => Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const toList = (value: unknown, fallback: string[] = []) =>
  Array.isArray(value) ? value.map((v) => String(v || "").trim()).filter(Boolean) : fallback;
const isAdminRequest = (req: Request) => {
  if (!config.packageAdminToken) return false;
  return req.header("x-admin-token") === config.packageAdminToken;
};

const toItinerarySummary = (payload: EmailPayload) => {
  if (!payload.itineraryDays.length) return ["Detailed itinerary will be shared shortly."];
  return payload.itineraryDays.map((day) => {
    return `Day ${day.day}: ${day.title} - ${day.activities?.join(", ") || day.narrative || ""}`;
  });
};

const getSupabase = () => {
  if (!hasSupabase()) return null;
  if (!cachedClient) {
    cachedClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
};

const baseDefaults = {
  emergencyContact: config.supportPhone || "+91 9342180670",
  travelGuidelines: ["Arrive 45 minutes before departure.", "Follow local guidance and safety rules."],
  documentsToCarry: ["Government ID proof", "Booking confirmation copy"],
  importantNotes: ["Itinerary may shift due to weather or local conditions.", "Hotel timings follow property policy."],
};

const fromBooking = (booking: BookingRecord): EmailPayload => {
  const terms = (booking.booking_terms || {}) as Record<string, unknown>;
  const itinerary = (terms.itinerary || {}) as Record<string, unknown>;
  const travel = (terms.travelDetails || {}) as Record<string, unknown>;
  return {
    fullName: `${booking.first_name || ""} ${booking.last_name || ""}`.trim() || "Traveler",
    email: booking.email,
    phone: booking.phone || "-",
    bookingReference: booking.booking_reference || booking.id.slice(0, 8).toUpperCase(),
    bookingId: booking.id,
    paymentId: booking.payment_id || "-",
    packageTitle: booking.package_title,
    destination: String(terms.destination || "-"),
    travelDate: String(terms.travelDate || "-"),
    passengers: Number(booking.travelers || 1),
    totalAmount: Number(booking.total_amount || 0),
    travelCategory: String(terms.travelCategory || "General"),
    itineraryDays: Array.isArray(itinerary.days) ? (itinerary.days as ItineraryDay[]) : [],
    itineraryNights: Array.isArray(itinerary.nights) ? (itinerary.nights as ItineraryNight[]) : [],
    transportDetails: String(travel.transportDetails || "-"),
    activities: toList(itinerary.activities, []),
    checkIn: String(travel.checkIn || terms.travelDate || "-"),
    checkOut: String(travel.checkOut || "-"),
    emergencyContact: String(terms.emergencyContact || baseDefaults.emergencyContact),
    travelGuidelines: toList(terms.travelGuidelines, baseDefaults.travelGuidelines),
    documentsToCarry: toList(terms.documentsToCarry, baseDefaults.documentsToCarry),
    importantNotes: toList(terms.importantNotes, baseDefaults.importantNotes),
    duration: String(terms.duration || "-"),
    airline: String(terms.airline || "-"),
    departureTime: String(terms.departureTime || "-"),
    arrivalTime: String(terms.arrivalTime || "-"),
    included: toList(terms.included, []),
    excluded: toList(terms.excluded, []),
  };
};

const fetchBooking = async (bookingReference: string, userId?: string): Promise<BookingRecord | null> => {
  const db = getDb();
  let sql = `SELECT * FROM bookings WHERE booking_reference = ?`;
  const params: any[] = [bookingReference];
  
  if (userId) {
    sql += ` AND user_id = ?`;
    params.push(userId);
  }
  
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row: any) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      
      // Map SQLite row to BookingRecord type
      const record: BookingRecord = {
        ...row,
        payment_verified: !!row.payment_verified,
        email_sent: !!row.email_sent,
        booking_terms: row.booking_terms ? JSON.parse(row.booking_terms) : null
      };
      resolve(record);
    });
  });
};

const safeUpdate = async (bookingId: string, patch: Record<string, unknown>) => {
  const db = getDb();
  
  // Convert patch object to SQL UPDATE statement
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  
  const setClause = fields.map(f => `${f} = ?`).join(", ");
  const values = fields.map(f => {
    const val = patch[f];
    if (f === 'booking_terms' && val && typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });
  
  const sql = `UPDATE bookings SET ${setClause} WHERE id = ?`;
  values.push(bookingId);
  
  return new Promise<void>((resolve, reject) => {
    db.run(sql, values, function(err) {
      if (err) return reject(err);
      resolve();
    });
  });
};

const uploadPdfAndGetUrl = async (booking: BookingRecord, pdf: Buffer) => {
  // For local development without Supabase, we can save to a local public folder if it exists
  // Or just return null and let the email attachment handle it
  return null;
};

const sendWithRetry = async (payload: EmailPayload, pdf: Buffer) => {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= EMAIL_RETRY_LIMIT; attempt += 1) {
    try {
      await sendBookingConfirmation(
        { email: payload.email, name: payload.fullName },
        {
          bookingReference: payload.bookingReference,
          packageTitle: payload.packageTitle,
          destination: payload.destination,
          travelDate: payload.travelDate,
          totalAmount: payload.totalAmount,
          itinerarySummary: payload.itineraryDays.map(it => ({
            day: it.day,
            title: it.title,
            description: it.activities?.join(", ") || it.narrative || ""
          })),
          supportEmail: config.supportEmail,
          supportPhone: config.supportPhone,
          duration: payload.duration,
          airline: payload.airline,
          departureTime: payload.departureTime,
          arrivalTime: payload.arrivalTime,
          included: payload.included,
          excluded: payload.excluded,
        },
        {
          attachment: {
            filename: `TravelMate-Ticket-${payload.bookingReference}.pdf`,
            content: pdf,
            contentType: "application/pdf",
          },
        }
      );
      return { ok: true, attempts: attempt };
    } catch (err: any) {
      lastError = err as Error;
      if (attempt < EMAIL_RETRY_LIMIT) await sleep(attempt * 700);
    }
  }
      return { ok: false, attempts: EMAIL_RETRY_LIMIT, error: lastError?.message || "send failed" };
};

const DESTINATION_MAP: Record<string, { city: string; iata: string }> = {
  "kerala": { city: "Kochi", iata: "COK" },
  "goa": { city: "Goa", iata: "GOI" },
  "manali": { city: "Kullu", iata: "KUU" },
  "shimla": { city: "Chandigarh", iata: "IXC" },
  "kashmir": { city: "Srinagar", iata: "SXR" },
  "srinagar": { city: "Srinagar", iata: "SXR" },
  "ooty": { city: "Coimbatore", iata: "CJB" },
  "kodai": { city: "Madurai", iata: "IXM" },
  "kanyakumari": { city: "Trivandrum", iata: "TRV" },
  "jaipur": { city: "Jaipur", iata: "JAI" },
  "udaipur": { city: "Udaipur", iata: "UDR" },
  "jaisalmer": { city: "Jaisalmer", iata: "JSA" },
  "mumbai": { city: "Mumbai", iata: "BOM" },
  "delhi": { city: "New Delhi", iata: "DEL" },
  "bangalore": { city: "Bengaluru", iata: "BLR" },
  "dubai": { city: "Dubai", iata: "DXB" },
  "singapore": { city: "Singapore", iata: "SIN" },
  "bangkok": { city: "Bangkok", iata: "BKK" },
  "maldives": { city: "Male", iata: "MLE" },
  "bali": { city: "Denpasar", iata: "DPS" },
};

function getArrivalAirport(location: string) {
  const normalized = location.toLowerCase();
  for (const [key, info] of Object.entries(DESTINATION_MAP)) {
    if (normalized.includes(key)) return info;
  }
  // Safe Fallback
  return { 
    city: location.split(',')[0].trim(), 
    iata: location.substring(0, 3).toUpperCase() 
  };
}

const sendFlightWithRetry = async (payload: EmailPayload, pdf: Buffer) => {
  let lastError: Error | null = null;
  const arrival = getArrivalAirport(payload.destination);
  for (let attempt = 1; attempt <= EMAIL_RETRY_LIMIT; attempt += 1) {
    try {
      await sendFlightTicketEmail(
        { email: payload.email, name: payload.fullName },
        {
          passengerName: payload.fullName,
          flightNumber: payload.airline.includes('Air') ? `AI-${payload.bookingReference.slice(0, 4)}` : `6E-${payload.bookingReference.slice(0, 4)}`,
          departureCity: "Chennai",
          arrivalCity: arrival.city,
          departureDateTime: `${payload.travelDate} ${payload.departureTime}`,
          arrivalDateTime: `${payload.travelDate} ${payload.arrivalTime}`,
          airline: payload.airline,
          pnr: payload.bookingReference,
          supportEmail: config.supportEmail,
          supportPhone: config.supportPhone,
          registeredEmail: payload.email,
        },
        {
          attachment: {
            filename: `TravelMate-FlightTicket-${payload.bookingReference}.pdf`,
            content: pdf,
            contentType: "application/pdf",
          },
        }
      );
      return { ok: true, attempts: attempt };
    } catch (err: any) {
      lastError = err as Error;
      if (attempt < EMAIL_RETRY_LIMIT) await sleep(attempt * 700);
    }
  }
  return { ok: false, attempts: EMAIL_RETRY_LIMIT, error: lastError?.message || "send failed" };
};
const processStoredBooking = async (booking: BookingRecord, force = false) => {
  if (!config.resendApiKey || !config.resendFrom) return { ok: false, code: 500, message: "Resend not configured" };
  if (!validEmail(booking.email)) return { ok: false, code: 400, message: "Invalid booking email" };
  if (!(booking.payment_status === "paid" || booking.payment_status === "confirmed") || !booking.payment_verified) {
    return { ok: false, code: 409, message: "Payment not verified" };
  }
  if (booking.email_sent && !force) return { ok: true, code: 200, message: "already_sent" };

  const payload = fromBooking(booking);
  const sendingAt = new Date().toISOString();
  await safeUpdate(booking.id, {
    booking_terms: { ...(booking.booking_terms || {}), email: { sent: false, status: "sending", lastAttemptAt: sendingAt } },
    booking_status: booking.booking_status === "confirmed" ? "confirmed" : "processing",
    email_last_attempt_at: sendingAt,
  });

  const pdf = await generateTicketPdf(payload);
  const ticketPdfUrl = await uploadPdfAndGetUrl(booking, pdf);
  const sent = await sendWithRetry(payload, pdf);
  if (!sent.ok) {
    await safeUpdate(booking.id, {
      booking_terms: {
        ...(booking.booking_terms || {}),
        email: { sent: false, status: "failed", attempts: sent.attempts, lastAttemptAt: new Date().toISOString() },
        manualFollowUpRequired: true,
        manualFollowUpReason: "Manual Follow-up Required: Email dispatch failed",
        manualFollowUpLoggedAt: new Date().toISOString(),
      },
      email_sent: false,
      email_attempts: sent.attempts,
      email_last_error: sent.error,
      email_last_attempt_at: new Date().toISOString(),
      ...(ticketPdfUrl ? { ticket_pdf_url: ticketPdfUrl } : {}),
    });
    return { ok: false, code: 500, message: "failed_to_send" };
  }

  const sentAt = new Date().toISOString();
  await safeUpdate(booking.id, {
    booking_terms: { ...(booking.booking_terms || {}), email: { sent: true, status: "sent", sentAt, attempts: sent.attempts } },
    email_sent: true,
    email_attempts: sent.attempts,
    email_last_error: null,
    email_last_attempt_at: sentAt,
    email_sent_at: sentAt,
    booking_status: "confirmed",
    ...(ticketPdfUrl ? { ticket_pdf_url: ticketPdfUrl } : {}),
  });

  // Secondary Step: Fire Off The Flight E-Ticket Automatically (Non-Blocking)
  try {
    const flightPdf = await generateFlightTicketPdf(payload);
    await sendFlightWithRetry(payload, flightPdf);
    console.log(`Flight ticket emailed successfully for booking ${payload.bookingReference}`);
  } catch (flightErr) {
    console.warn(`Soft fail: Could not send flight ticket for booking ${payload.bookingReference}:`, flightErr);
  }

  return { ok: true, code: 200, message: "sent" };
};

/**
 * Robustly combines a travel date string and a departure time string into a Date object.
 * Handles Various formats: '2026-03-25', '25 March 2026', 'TBA', etc.
 */
function getExactDepartureDate(travelDateStr: string, departureTimeStr?: string | null): Date {
  if (!travelDateStr || travelDateStr === "TBA") {
    // If no date, return a date in the far future to prevent accidental "travel date passed" errors
    // though in practice, travelDate should be mandatory for cancellation.
    return dayjs().add(1, 'year').toDate();
  }

  let dt = dayjs(travelDateStr);
  
  // If travelDateStr is just '2026-03-25', it defaults to midnight.
  // Now add time if available
  if (departureTimeStr && departureTimeStr !== "TBA") {
    const match = departureTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const suffix = match[3]?.toUpperCase();

      if (suffix === 'PM' && hours < 12) hours += 12;
      if (suffix === 'AM' && hours === 12) hours = 0;

      dt = dt.hour(hours).minute(minutes).second(0).millisecond(0);
    }
  }

  return dt.toDate();
}

const sendBookingConfirmationHandler = async (req: Request, res: Response) => {
  const { bookingReference, userId, paymentId } = req.body as { bookingReference?: string; userId?: string; paymentId?: string };
  if (!bookingReference) return res.status(400).json({ message: "bookingReference is required" });
  try {
    const booking = await fetchBooking(bookingReference, userId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (paymentId && !booking.payment_id) {
      await safeUpdate(booking.id, { payment_id: paymentId });
      booking.payment_id = paymentId;
    }
    const result = await processStoredBooking(booking);
    if (!result.ok) return res.status(result.code).json({ message: "Booking confirmed. Confirmation email will be sent shortly.", status: "queued" });
    if (result.message === "already_sent") return res.status(200).json({ message: "Confirmation email already sent", status: "already_sent" });
    return res.status(200).json({ message: "Confirmation email sent", status: "sent" });
  } catch (error) {
    console.error("send-booking-confirmation failed:", error);
    return res.status(500).json({ message: "Booking confirmed. Confirmation email will be sent shortly.", status: "queued" });
  }
};

router.post("/create-order", async (req: Request, res: Response) => {
  const { amount = 500, currency = "INR", receipt } = req.body as { amount?: number; currency?: string; receipt?: string };
  
  if (!razorpay) {
    console.warn("[Razorpay] Not configured, using demo order simulation.");
    return res.status(200).json({
      id: `order_demo_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      status: "created",
      isDemo: true
    });
  }

  try {
    const paiseAmount = Math.round(amount * 100);
    const options = {
      amount: paiseAmount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error: any) {
    console.error("[Razorpay] Order creation failed:", error);
    return res.status(500).json({ message: "Failed to create Razorpay order", error: error.message });
  }
});

router.post("/create-razorpay-order", async (req: Request, res: Response) => {
  const { amount, currency = "INR", receipt } = req.body as { amount: number; currency?: string; receipt?: string };
  if (!amount) return res.status(400).json({ message: "Amount is required" });

  if (!razorpay) {
    // Demo Mode fallback if Razorpay is not configured
    console.warn("[Razorpay] Not configured, using demo order simulation.");
    return res.status(200).json({
      id: `order_demo_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      status: "created",
      isDemo: true
    });
  }

  try {
    const paiseAmount = Math.round(amount * 100);
    console.log(`[Razorpay] Creating order for amount: ${amount} (${paiseAmount} paise), currency: ${currency}`);
    
    if (!razorpay || typeof razorpay.orders === 'undefined') {
      console.error("[Razorpay] SDK instance corrupted or orders property missing.", {
        razorpayExists: !!razorpay,
        ordersExists: razorpay ? !!razorpay.orders : false
      });
      throw new Error("Razorpay SDK initialization failed internally.");
    }

    const options = {
      amount: paiseAmount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    console.log("[Razorpay] Request Options:", JSON.stringify(options));
    const order = await razorpay.orders.create(options);
    console.log(`[Razorpay] Order created successfully: ${order.id}`);
    return res.status(200).json(order);
  } catch (error: any) {
    console.error("[Razorpay] Order creation failed. Error details:", {
      message: error.message,
      code: error.code,
      description: error.description,
      metadata: error.metadata
    });
    return res.status(500).json({ 
      message: "Failed to create Razorpay order", 
      error: error.message,
      details: error.description || null
    });
  }
});

router.post("/verify-payment", authenticateToken, async (req: AuthRequest, res: Response) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingData
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification details" });
  }

  const secret = config.razorpayKeySecret;
  const isDemo = razorpay_order_id?.startsWith("order_demo_");

  if (!isDemo) {
    if (!secret || secret === "rzp_test_secret_placeholder") {
      console.warn("[Razorpay] Signature verification skipped (Secret missing/placeholder).");
    } else {
      const generated_signature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        console.error("[Razorpay] Signature mismatch!");
        return res.status(400).json({ message: "Invalid payment signature" });
      }
    }
  }

  try {
    const db = getDb();
    const userId = req.user?.id || bookingData.user_id;
    const userEmail = req.user?.email || bookingData.email;

    if (!userId) {
      return res.status(401).json({ message: "User identification failed" });
    }

    // Persist booking with confirmed status
    const fullBooking: any = {
      ...bookingData,
      user_id: userId,
      payment_id: razorpay_payment_id,
      payment_status: "paid",
      payment_verified: 1,
      booking_status: "confirmed",
      email_sent: 0
    };

    // Filter fields to match SQLite schema
    const validColumns = [
      "user_id", "booking_reference", "package_id", "package_title", "destination", 
      "duration", "travel_date", "travelers", "traveler_name", "first_name", 
      "last_name", "room_type", "email", "phone", "total_amount", "airline", 
      "departure_time", "payment_id", "payment_status", "payment_verified", 
      "booking_terms", "booking_status", "email_sent"
    ];

    const filteredBooking: any = {};
    validColumns.forEach(col => {
      if (fullBooking[col] !== undefined) filteredBooking[col] = fullBooking[col];
    });

    const fields = Object.keys(filteredBooking);
    const placeholders = fields.map(() => "?").join(", ");
    const columns = fields.join(", ");
    const values = fields.map(f => {
      const val = filteredBooking[f];
      if (f === "booking_terms" && val && typeof val === "object") return JSON.stringify(val);
      if (typeof val === "boolean") return val ? 1 : 0;
      return val;
    });

    const finalSql = `INSERT INTO bookings (${columns}) VALUES (${placeholders})`;

    return new Promise<void>((resolve, reject) => {
      db.run(finalSql, values, function (this: any, err: any) {
        if (err) {
          console.error("[Booking] Storage failed after payment:", err);
          return res.status(500).json({ message: "Payment verified but booking storage failed", error: err.message });
        }

        const newId = this.lastID;
        const bookingRef = fullBooking.booking_reference;
        
        // Trigger professional confirmation email dispatch
        fetchBooking(bookingRef).then(async (record) => {
          if (record) {
             console.log(`[Razorpay] Payment verified. Dispatching professional confirmation for ${bookingRef} to ${userEmail}`);
             try {
                // Ensure record has the payment_id for the email template
                record.payment_id = razorpay_payment_id;
                await processStoredBooking(record);
             } catch (emailErr) {
                console.error("[Email] Dispatch failed:", emailErr);
             }
          }
        }).catch(err => console.error("[Razorpay] Post-payment processing failure:", err));

        return res.status(200).json({
          success: true,
          message: "Payment verified and booking confirmed",
          bookingReference: bookingRef,
          bookingId: newId,
          paymentId: razorpay_payment_id
        });
      });
    });
  } catch (error: any) {
    console.error("Payment verification route execution failed:", error);
    return res.status(500).json({ message: "Failed to process payment verification", error: error.message });
  }
});

router.post("/process-dummy-payment", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { bookingData } = req.body;
  
  if (!bookingData) {
    return res.status(400).json({ message: "Booking data is required" });
  }

  const userId = req.user?.id || bookingData.user_id;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const db = getDb();

    // Augment booking data for dummy payment
    const fullBooking: any = {
      ...bookingData,
      user_id: userId,
      payment_status: "paid",
      payment_verified: 1, // SQLite INTEGER
      booking_status: "confirmed",
      email_sent: 0
    };

    // Filter fields to match SQLite schema
    const validColumns = [
      "user_id", "booking_reference", "package_id", "package_title", "destination", 
      "duration", "travel_date", "travelers", "traveler_name", "first_name", 
      "last_name", "room_type", "email", "phone", "total_amount", "airline", 
      "departure_time", "payment_id", "payment_status", "payment_verified", 
      "booking_terms", "booking_status", "email_sent"
    ];

    const filteredBooking: any = {};
    validColumns.forEach(cat => {
      if (fullBooking[cat] !== undefined) filteredBooking[cat] = fullBooking[cat];
    });

    // Ensure first_name/last_name are set for confirmation email logic if not present
    if (!filteredBooking.first_name && filteredBooking.traveler_name) {
      const names = filteredBooking.traveler_name.split(' ');
      filteredBooking.first_name = names[0];
      filteredBooking.last_name = names.slice(1).join(' ') || '-';
    }

    const fields = Object.keys(filteredBooking);
    const placeholders = fields.map(() => "?").join(", ");
    const columns = fields.join(", ");
    const values = fields.map(f => {
      const val = filteredBooking[f];
      if (f === "booking_terms" && val && typeof val === "object") return JSON.stringify(val);
      if (typeof val === "boolean") return val ? 1 : 0;
      return val;
    });

    const sql = `INSERT INTO bookings (${columns}) VALUES (${placeholders})`;

    return new Promise<void>((resolve, reject) => {
      db.run(sql, values, function (this: any, err: any) {
        if (err) {
          console.error("Dummy booking storage failed:", err);
          return res.status(500).json({ message: "Payment processed but booking storage failed", error: err.message });
        }

        const newId = this.lastID;
        const bookingRef = fullBooking.booking_reference;
        
        // Trigger confirmation email dispatch
        fetchBooking(bookingRef).then(record => {
          if (record) {
             console.log(`[DummyPayment] Triggering email for ${bookingRef}`);
             processStoredBooking(record);
          }
        }).catch(err => console.error("[DummyPayment] Delayed email processing failed:", err));

        return res.status(200).json({
          success: true,
          message: "Dummy payment processed and booking confirmed",
          bookingReference: bookingRef,
          bookingId: newId,
          paymentId: fullBooking.paymentId
        });
      });
    });
  } catch (error: any) {
    console.error("Dummy booking persistence failed:", error);
    return res.status(500).json({ message: "Failed to process dummy booking", error: error.message });
  }
});

router.post("/confirm-after-payment", sendBookingConfirmationHandler);
router.post("/send-booking-confirmation", sendBookingConfirmationHandler);

router.post("/confirm-booking", async (req: Request, res: Response) => {
  const { bookingId, bookingReference } = req.body as { bookingId?: string; bookingReference?: string };
  if (!bookingId && !bookingReference) return res.status(400).json({ message: "bookingId or bookingReference is required" });

  try {
    const db = getDb();
    let sql = `UPDATE bookings SET payment_status = 'paid', payment_verified = 1, booking_status = 'confirmed' WHERE `;
    const params: any[] = [];
    
    if (bookingId) {
      sql += `id = ?`;
      params.push(bookingId);
    } else {
      sql += `booking_reference = ?`;
      params.push(bookingReference);
    }

    return new Promise<void>((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          console.error("confirm-booking SQL failed:", err);
          return res.status(500).json({ message: err.message });
        }
        res.json({ success: true, updated: this.changes });
        resolve();
      });
    });
  } catch (error: any) {
    console.error("confirm-booking failed:", error);
    return res.status(500).json({ message: error.message || "Failed to confirm booking" });
  }
});

router.post("/create-booking", async (req: Request, res: Response) => {
  const body = req.body as { booking?: Record<string, any> };
  if (!body.booking) return res.status(400).json({ message: "booking payload is required" });

  try {
    const db = getDb();
    const booking = body.booking;

    const validColumns = [
      "user_id", "booking_reference", "package_id", "package_title", "destination", 
      "duration", "travel_date", "travelers", "traveler_name", "first_name", 
      "last_name", "room_type", "email", "phone", "total_amount", "airline", 
      "departure_time", "payment_id", "payment_status", "payment_verified", 
      "booking_terms", "booking_status", "email_sent"
    ];

    const filteredBooking: any = {};
    validColumns.forEach(cat => {
      if (booking[cat] !== undefined) filteredBooking[cat] = booking[cat];
    });

    const fields = Object.keys(filteredBooking);
    const placeholders = fields.map(() => "?").join(", ");
    const columns = fields.join(", ");
    const values = fields.map(f => {
      const val = filteredBooking[f];
      if (f === "booking_terms" && val && typeof val === "object") return JSON.stringify(val);
      if (typeof val === "boolean") return val ? 1 : 0;
      return val;
    });

    const sql = `INSERT INTO bookings (${columns}) VALUES (${placeholders})`;

    return new Promise<void>((resolve, reject) => {
      db.run(sql, values, function (this: any, err: any) {
        if (err) {
          console.error("create-booking SQLite failed:", err);
          return res.status(500).json({ message: err.message });
        }
        res.status(201).json({ message: "Booking saved", id: this.lastID });
        resolve();
      });
    });
  } catch (error: any) {
    console.error("create-booking catch failed:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.get("/user-bookings", async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ message: "userId is required" });

  try {
    const { getDb } = require("../db");
    const db = getDb();
    console.log(`[user-bookings] Fetched db instance for ${userId}`);
    const rows = await new Promise<any[]>((resolve, reject) => {
      console.log(`[user-bookings] Executing db.all for ${userId}`);
      db.all(
        `SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err: Error | null, rows: any[]) => {
          if (err) {
            console.error(`[user-bookings] DB query error:`, err);
            reject(err);
          } else {
            console.log(`[user-bookings] DB query success, rows: ${rows ? rows.length : 0}`);
            resolve(rows);
          }
        }
      );
    });
    console.log(`[user-bookings] Proceeding to map rows`);

    // Map local SQLite rows to match the expected frontend BookingRow format
    const localBookings = rows.map((row) => ({
      id: `local-${row.id}`,
      booking_reference: row.booking_reference,
      package_id: row.package_title, // Using title as fallback id for mapping
      package_title: row.package_title,
      travelers: row.travelers,
      total_amount: row.total_amount,
      payment_status: row.payment_status,
      booking_status: row.booking_status,
      payment_verified: row.payment_status === "paid" || row.payment_status === "confirmed",
      is_locked: true,
      locked_price_per_person: row.total_amount / (row.travelers || 1),
      booking_snapshots: [
        {
          snapshot: {
            destination: row.destination,
          },
          locked_transport: row.airline,
          locked_hotel: row.room_type,
        },
      ],
      booking_terms: {
        airline: row.airline,
        departureTime: row.departure_time,
        duration: row.duration,
      },
      created_at: row.created_at,
    }));

    return res.json({ bookings: localBookings });
  } catch (error: any) {
    console.error("[booking/user-bookings] Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to fetch user bookings" });
  }
});

router.post("/resend-confirmation", async (req: Request, res: Response) => {
  const { bookingReference, userId } = req.body as { bookingReference?: string; userId?: string };
  if (!bookingReference) return res.status(400).json({ message: "bookingReference is required" });
  try {
    const booking = await fetchBooking(bookingReference, userId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const result = await processStoredBooking(booking, true);
    if (!result.ok) return res.status(result.code).json({ message: "Failed to resend confirmation email" });
    return res.status(200).json({ message: "Confirmation email resent" });
  } catch (error) {
    console.error("resend-confirmation failed:", error);
    return res.status(500).json({ message: "Failed to resend confirmation email" });
  }
});



router.get("/details/:reference", async (req: Request, res: Response) => {
  const { reference } = req.params;
  const { userId } = req.query as { userId?: string };

  if (!userId) return res.status(401).json({ message: "userId is required to view booking details" });

  try {
    const { getDb } = require("../db");
    const db = getDb();

    const row = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT booking_reference, package_title, travel_date, departure_time, total_amount, booking_status FROM bookings WHERE booking_reference = ? AND user_id = ?`,
        [reference, userId],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!row) return res.status(404).json({ message: "Booking not found or unauthorized" });
    if (row.booking_status === 'cancelled') return res.status(400).json({ message: "Booking is already cancelled" });

    // Calculate Refund Eligibility
    // Calculate Refund Eligibility using exact departure time
    const travelDate = getExactDepartureDate(row.travel_date, row.departure_time);
    const now = dayjs();
    const travelDayjs = dayjs(travelDate);
    const diffInHours = travelDayjs.diff(now, 'hour', true);

    let refundAmount = 0;
    let refundable = false;

    if (diffInHours >= 48) {
        // Full Refund: If cancelling more than 48 hours before Travel Date
        refundAmount = row.total_amount;
        refundable = true;
    } else if (diffInHours > 0) {
        // Partial Refund (50%): If cancelling within 48 hours but before trip starts
        refundAmount = row.total_amount * 0.5;
        refundable = true;
    }
    // Else: No Refund if trip already started or passed

    return res.status(200).json({
      bookingReference: row.booking_reference,
      packageTitle: row.package_title,
      travelDate: row.travel_date,
      totalAmount: row.total_amount,
      refundAmount: refundAmount,
      isCancellable: refundable
    });
  } catch (error: any) {
    console.error("[booking/details] Error:", error);
    return res.status(500).json({ message: "Failed to fetch booking details" });
  }
});

router.post("/cancel", async (req: Request, res: Response) => {
  const { bookingReference, userId, cancellationReason } = req.body as { bookingReference?: string; userId?: string; cancellationReason?: string };
  
  if (!bookingReference || !userId || !cancellationReason) {
    return res.status(400).json({ message: "bookingReference, userId, and cancellationReason are required" });
  }

  try {
    const { getDb } = require("../db");
    const db = getDb();

    // Check if the booking exists and belongs to the user
    const row = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT * FROM bookings WHERE booking_reference = ? AND user_id = ?`,
        [bookingReference, userId],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!row) {
      return res.status(404).json({ message: "Booking not found or unauthorized" });
    }

    // Ensure we can only cancel 'confirmed' or 'paid' bookings (not ones already cancelled)
    if (row.booking_status === 'cancelled') {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    // Backend validation of travel date vs current date
    // Backend validation of travel date vs current date using exact departure time
    const travelDate = getExactDepartureDate(row.travel_date, row.departure_time);
    const now = dayjs();
    const travelDayjs = dayjs(travelDate);
    const diffInHours = travelDayjs.diff(now, 'hour', true);

    let refundAmount = 0;
    if (diffInHours >= 48) {
        refundAmount = row.total_amount;
    } else if (diffInHours > 0) {
        refundAmount = row.total_amount * 0.5;
    } else {
        return res.status(400).json({ message: "Cancellation not allowed. Travel date already started." });
    }

    // Update the booking status to cancelled with reason and timestamp
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE bookings SET booking_status = 'cancelled', payment_status = 'refunded', cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP, refund_amount = ? WHERE booking_reference = ? AND user_id = ?`,
        [cancellationReason, refundAmount, bookingReference, userId],
        function (this: any, err: Error | null) {
          if (err) {
            console.error("[booking/cancel] Update error:", err);
            reject(err);
          } else if (this.changes === 0) {
             reject(new Error("No rows updated"));
          } else {
             resolve();
          }
        }
      );
    });

    // Send Cancellation Email
    try {
      const { sendCancellationEmail } = require("../services/email.service");
      const user = await new Promise<any>((resolve) => {
         db.get(`SELECT email FROM users WHERE id = ?`, [userId], (err: any, u: any) => resolve(u));
      });
      if (user) {
        // Build BookingEmailDetails from row
        const bookingDetails = {
           packageTitle: row.package_title,
           destination: row.destination,
           duration: row.duration,
           travelers: row.travelers,
           totalAmount: row.total_amount,
           paymentStatus: 'refunded',
           airline: row.airline,
           departureTime: row.departure_time,
           bookingReference: row.booking_reference,
           travelDate: row.travel_date,
           checkIn: undefined,
           checkOut: undefined
        };
        await sendCancellationEmail({ email: user.email, name: row.first_name ? `${row.first_name} ${row.last_name || ''}` : undefined }, bookingDetails, cancellationReason, refundAmount);
      }
    } catch (emailErr) {
       console.error("[booking/cancel] Failed to send cancellation email:", emailErr);
       // We don't fail the request if just the email fails
    }

    return res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error: any) {
    console.error("[booking/cancel] Catch error:", error);
    return res.status(500).json({ message: error.message || "Failed to cancel booking" });
  }
});

router.get("/admin/recent-bookings", async (req: Request, res: Response) => {
  if (!isAdminRequest(req)) return res.status(401).json({ message: "Unauthorized admin request" });
  
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

  try {
    // 1. Fetch from SQLite
    const db = getDb();
    const localRows = await new Promise<any[]>((resolve, reject) => {
      db.all<any[]>(
        `SELECT booking_reference, email, total_amount, email_sent, created_at FROM bookings ORDER BY created_at DESC LIMIT ?`,
        [limit],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const localAdminRows: AdminBookingRow[] = localRows.map(row => ({
      booking_reference: row.booking_reference,
      email: row.email,
      total_amount: row.total_amount,
      email_sent: row.email_sent === 1,
      created_at: row.created_at
    }));

    // 2. Fetch from Supabase (if configured)
    let supabaseAdminRows: AdminBookingRow[] = [];
    const client = getSupabase();
    if (client) {
      const { data, error } = await client
        .from("bookings")
        .select("booking_reference,email,total_amount,email_sent,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (!error && data) {
        supabaseAdminRows = data as AdminBookingRow[];
      }
    }

    // Combine and sort
    const combined = [...localAdminRows, ...supabaseAdminRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return res.status(200).json({ bookings: combined });
  } catch (error: any) {
    console.error("[admin/recent-bookings] Failed:", error.message);
    return res.status(500).json({ message: error.message || "Failed to fetch recent bookings" });
  }
});

router.post("/razorpay-webhook", async (req: Request, res: Response) => {
  const signature = (req.headers["x-razorpay-signature"] as string | undefined) || "";
  const secret = config.razorpayWebhookSecret;
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  if (secret) {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!signature || expected !== signature) return res.status(401).json({ message: "Invalid webhook signature" });
  }

  if (!razorpay) {
    return res.status(500).json({ message: "Razorpay is not configured on the server" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    return res.status(400).json({ message: "Invalid webhook payload" });
  }

  const event = String(payload.event || "");
  if (!["payment.captured", "order.paid"].includes(event)) return res.status(200).json({ message: "Webhook ignored" });
  const paymentEntity = (((payload.payload as Record<string, unknown>)?.payment as Record<string, unknown>)?.entity || {}) as Record<string, unknown>;
  const notes = (paymentEntity.notes || {}) as Record<string, unknown>;
  const bookingReference = String(notes.booking_reference || notes.bookingReference || "");
  if (!bookingReference) return res.status(202).json({ message: "Webhook received without booking reference" });
  try {
    const booking = await fetchBooking(bookingReference);
    if (!booking) return res.status(404).json({ message: "Booking not found for reference" });
    await safeUpdate(booking.id, {
      payment_status: "paid",
      payment_verified: true,
      booking_status: "confirmed",
      payment_id: String(paymentEntity.id || booking.payment_id || ""),
    });
    const refreshed = await fetchBooking(bookingReference);
    if (!refreshed) return res.status(404).json({ message: "Booking not found" });
    const result = await processStoredBooking(refreshed);
    if (!result.ok && result.message !== "already_sent") return res.status(202).json({ message: "Payment captured, email queued" });
    return res.status(200).json({ message: "Webhook processed", status: result.message });
  } catch (error) {
    console.error("razorpay-webhook failed:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
});

router.get("/download-ticket/:bookingReference", async (req: Request, res: Response) => {
  const bookingReference = String(req.params.bookingReference || "");
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;

  try {
    const booking = await fetchBooking(bookingReference, userId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const payload = fromBooking(booking);
    
    // Check if it's a group tour - if so, block PDF download as per isolation rules
    if (booking.package_id) {
      const pkg = await getPackageById(booking.package_id);
      if (pkg?.isGroupTour) {
        return res.status(403).json({ message: "Itinerary PDFs are not available for group tours via this endpoint." });
      }
    }

    const pdf = await generateTicketPdf(payload);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=TravelMate-Ticket-${bookingReference}.pdf`);
    return res.send(pdf);
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate ticket PDF" });
  }
});

router.get("/flight-search", async (req: Request, res: Response) => {
  const origin = (req.query.origin as string) || config.packageOriginIata || "DEL";
  const destination = req.query.destination as string;
  const departureDate = req.query.departureDate as string;

  if (!destination || !departureDate) {
    return res.status(400).json({ message: "Destination and Departure Date are required" });
  }

  try {
    const flight = await searchFlightOffers(origin, destination, departureDate);
    if (!flight) {
      return res.status(404).json({ message: "No flights found" });
    }
    return res.json(flight);
  } catch (error) {
    console.error("flight-search failed:", error);
    return res.status(500).json({ message: "Failed to search for flights" });
  }
});

router.post("/confirmation-email", async (req: Request, res: Response) => {
  const body = req.body as BookingEmailBody;
  if (!body.email || !body.bookingReference || !body.packageTitle || !body.travelDate || !body.passengers || !body.totalAmount) {
    return res.status(400).json({ message: "Missing required booking email details" });
  }
  if (!validEmail(body.email)) return res.status(400).json({ message: "Invalid email address" });
  if (!config.resendApiKey || !config.resendFrom) return res.status(500).json({ message: "Email service is not configured on server" });
  try {
    const payload: EmailPayload = {
      fullName: body.fullName || "Traveler",
      email: body.email,
      phone: body.phone || "-",
      bookingReference: body.bookingReference,
      bookingId: body.bookingId || body.bookingReference,
      paymentId: body.paymentId || "-",
      packageTitle: body.packageTitle,
      destination: body.destination || "-",
      travelDate: body.travelDate,
      passengers: body.passengers,
      totalAmount: body.totalAmount,
      travelCategory: body.travelCategory || "-",
      itineraryDays: body.itineraryDays || [],
      itineraryNights: body.itineraryNights || [],
      transportDetails: body.transportDetails || "-",
      activities: body.activities || [],
      checkIn: body.checkIn || body.travelDate,
      checkOut: body.checkOut || "-",
      emergencyContact: body.emergencyContact || baseDefaults.emergencyContact,
      travelGuidelines: body.travelGuidelines?.length ? body.travelGuidelines : baseDefaults.travelGuidelines,
      documentsToCarry: body.documentsToCarry?.length ? body.documentsToCarry : baseDefaults.documentsToCarry,
      importantNotes: body.importantNotes?.length ? body.importantNotes : baseDefaults.importantNotes,
      duration: body.duration || "-",
      airline: body.airline || "-",
      departureTime: body.departureTime || "-",
      arrivalTime: body.arrivalTime || "-",
      included: body.included || [],
      excluded: body.excluded || [],
    };

    // Guard against group tours
    if (body.packageId) {
      const pkg = await getPackageById(body.packageId);
      if (pkg?.isGroupTour) {
        return res.status(403).json({ message: "Confirmation emails are not supported for group tours." });
      }
    }

    const pdf = await generateTicketPdf(payload);
    const sent = await sendWithRetry(payload, pdf);
    if (!sent.ok) return res.status(500).json({ message: "Failed to send confirmation email" });
    return res.status(200).json({ message: "Confirmation email sent" });
  } catch (error) {
    console.error("confirmation-email failed:", error);
    return res.status(500).json({ message: "Failed to send confirmation email" });
  }
});

function generateTicketPdf(data: EmailPayload) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const leftM = 50;
    const rightM = pageW - 50;

    // ────── HEADER ──────
    doc.rect(0, 0, pageW, 110).fill("#0f172a");
    doc.fontSize(26).fillColor("#ffffff").text("TRAVELMATE", 0, 35, { align: "center" });
    doc.fontSize(9).fillColor("#94a3b8").text("Your Journey Begins With Us", { align: "center" });
    doc.fontSize(8).fillColor("#64748b").text(
      `${config.supportEmail || "support@travelmate.com"}  |  ${config.supportPhone || "+91 9342180670"}`,
      0, 75, { align: "center" }
    );

    let y = 130;

    // ────── TITLE ──────
    doc.fontSize(18).fillColor("#0f172a").text("Booking Ticket", leftM, y);
    y += 25;
    doc.moveTo(leftM, y).lineTo(rightM, y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    y += 15;

    // ────── TRAVELER DETAILS ──────
    doc.fontSize(13).fillColor("#1e40af").text("Traveler Details", leftM, y);
    y += 20;

    const drawRow = (label: string, value: string, yPos: number) => {
      doc.fontSize(9).fillColor("#64748b").text(label, leftM + 10, yPos);
      doc.fontSize(10).fillColor("#0f172a").text(value || "-", leftM + 130, yPos);
      return yPos + 18;
    };

    y = drawRow("Name", data.fullName, y);
    y = drawRow("Email", data.email, y);
    y = drawRow("Phone", data.phone, y);
    y += 10;

    // ────── BOOKING DETAILS ──────
    doc.fontSize(13).fillColor("#1e40af").text("Booking Details", leftM, y);
    y += 20;
    y = drawRow("Booking ID", data.bookingReference, y);
    y = drawRow("Package", data.packageTitle, y);
    y = drawRow("Destination", data.destination, y);
    y = drawRow("Travel Date", data.travelDate, y);
    y = drawRow("Duration", data.duration, y);
    y = drawRow("Travelers", String(data.passengers), y);
    y = drawRow("Total Amount", `INR ${Number(data.totalAmount).toLocaleString("en-IN")}`, y);
    y = drawRow("Payment Status", "Paid", y);
    y += 20;

    doc.moveTo(leftM, y).lineTo(rightM, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    y += 15;

    // ────── FOOTER NOTE ──────
    doc.fontSize(10).fillColor("#475569").text(
      "Please carry a valid government-issued photo ID (Aadhaar/Passport) during your trip. Reach the departure point at least 30 minutes before time.",
      leftM, y, { width: rightM - leftM, align: "center" }
    );

    // ────── FOOTER ──────
    const footerY = doc.page.height - 60;
    doc.rect(0, footerY - 10, pageW, 70).fill("#f8fafc");
    doc.moveTo(0, footerY - 10).lineTo(pageW, footerY - 10).strokeColor("#e2e8f0").stroke();
    doc.fontSize(10).fillColor("#0f172a").text(
      "Thank you for choosing TravelMate!",
      0, footerY,
      { align: "center" }
    );
    doc.fontSize(8).fillColor("#64748b").text(
      `TravelMate  |  ${config.supportEmail || "support@travelmate.com"}  |  ${config.supportPhone || "+91 9342180670"}`,
      0, footerY + 16,
      { align: "center" }
    );
    doc.fontSize(7).fillColor("#94a3b8").text(
      `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
      0, footerY + 30,
      { align: "center" }
    );

    doc.end();
  });
}

export function generateFlightTicketPdf(data: EmailPayload) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Landscape A4 dimensions: 841.89 x 595.28
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    
    // Background
    doc.rect(0, 0, pageW, pageH).fill("#f8fafc");

    // Main Ticket Card
    const cardM = 40;
    const cardW = pageW - cardM * 2;
    const cardH = pageH - cardM * 2;
    
    doc.rect(cardM, cardM, cardW, cardH).fill("#ffffff").lineWidth(1).strokeColor("#e2e8f0").stroke();

    // Airline Header Strip
    doc.rect(cardM, cardM, cardW, 60).fill("#1e40af");
    doc.rect(cardM + cardW - 180, cardM, 180, 60).fill("#1e3a8a"); // Stub header

    // Brand
    doc.fontSize(22).fillColor("#ffffff").text("TRAVELMATE", cardM + 20, cardM + 18);
    doc.fontSize(10).fillColor("#bfdbfe").text("BOARDING PASS / E-TICKET", cardM + 200, cardM + 25);
    
    // Stub Brand
    doc.fontSize(14).fillColor("#ffffff").text("E-TICKET", cardM + cardW - 160, cardM + 22);

    // ─── MAIN TICKET BODY ───
    const bodyY = cardM + 80;
    const arrival = getArrivalAirport(data.destination);
    
    // Passenger Row
    doc.fontSize(9).fillColor("#64748b").text("NAME OF PASSENGER", cardM + 20, bodyY);
    doc.fontSize(14).fillColor("#0f172a").text(data.fullName.toUpperCase(), cardM + 20, bodyY + 12);

    doc.fontSize(9).fillColor("#64748b").text("CARRIER", cardM + 300, bodyY);
    doc.fontSize(14).fillColor("#0f172a").text(data.airline.toUpperCase(), cardM + 300, bodyY + 12);

    // Flight Info Row
    const row2Y = bodyY + 45;
    doc.fontSize(9).fillColor("#64748b").text("FROM", cardM + 20, row2Y);
    doc.fontSize(16).fillColor("#0f172a").text("MAA", cardM + 20, row2Y + 12);
    doc.fontSize(10).fillColor("#475569").text("Chennai", cardM + 20, row2Y + 30);

    doc.fontSize(18).fillColor("#94a3b8").text("✈", cardM + 120, row2Y + 12);

    doc.fontSize(9).fillColor("#64748b").text("TO", cardM + 180, row2Y);
    doc.fontSize(16).fillColor("#0f172a").text(arrival.iata, cardM + 180, row2Y + 12);
    doc.fontSize(10).fillColor("#475569").text(arrival.city, cardM + 180, row2Y + 30);

    doc.fontSize(9).fillColor("#64748b").text("DATE", cardM + 300, row2Y);
    doc.fontSize(12).fillColor("#0f172a").text(data.travelDate, cardM + 300, row2Y + 12);

    doc.fontSize(9).fillColor("#64748b").text("TIME", cardM + 420, row2Y);
    doc.fontSize(12).fillColor("#0f172a").text(data.departureTime, cardM + 420, row2Y + 12);

    // Book/PNR Row
    const row3Y = row2Y + 65;
    doc.fontSize(9).fillColor("#64748b").text("PNR / BOOKING REF", cardM + 20, row3Y);
    doc.fontSize(14).fillColor("#1e40af").text(data.bookingReference, cardM + 20, row3Y + 12);

    doc.fontSize(9).fillColor("#64748b").text("TRAVELERS", cardM + 180, row3Y);
    doc.fontSize(12).fillColor("#0f172a").text(String(data.passengers), cardM + 180, row3Y + 12);
    
    // Perforation Line
    const stubX = cardM + cardW - 180;
    doc.moveTo(stubX, cardM + 60)
       .lineTo(stubX, cardM + cardH)
       .dash(5, { space: 5 })
       .strokeColor("#cbd5e1")
       .stroke();
    doc.undash();

    // ─── STUB (Right Side) ───
    const stubY = cardM + 80;
    const stubL = stubX + 15;
    
    doc.fontSize(7).fillColor("#64748b").text("NAME", stubL, stubY);
    doc.fontSize(10).fillColor("#0f172a").text(data.fullName.toUpperCase(), stubL, stubY + 10);

    doc.fontSize(7).fillColor("#64748b").text("FROM", stubL, stubY + 35);
    doc.fontSize(10).fillColor("#0f172a").text("MAA", stubL, stubY + 45);

    doc.fontSize(7).fillColor("#64748b").text("TO", stubL + 60, stubY + 35);
    doc.fontSize(10).fillColor("#0f172a").text(arrival.iata, stubL + 60, stubY + 45);

    doc.fontSize(7).fillColor("#64748b").text("DATE", stubL, stubY + 70);
    doc.fontSize(10).fillColor("#0f172a").text(data.travelDate, stubL, stubY + 80);

    doc.fontSize(7).fillColor("#64748b").text("TIME", stubL + 60, stubY + 70);
    doc.fontSize(10).fillColor("#0f172a").text(data.departureTime, stubL + 60, stubY + 80);

    doc.fontSize(7).fillColor("#64748b").text("PNR", stubL, stubY + 105);
    doc.fontSize(12).fillColor("#1e40af").text(data.bookingReference, stubL, stubY + 115);

    doc.fontSize(7).fillColor("#64748b").text("CARRIER", stubL, stubY + 140);
    doc.fontSize(9).fillColor("#0f172a").text(data.airline.toUpperCase(), stubL, stubY + 150);

    doc.end();
  });
}

// ─── SQLite-based booking endpoint with JWT protection ───
router.post("/book", authenticateToken, async (req: AuthRequest, res: Response) => {
  const body = req.body as BookingEmailBody;
  const authUser = req.user!;

  try {
    const db = getDb();

    // 1. Fetch the user's latest name and email from SQLite to ensure accuracy
    // In our users table, we track 'email' and potentially other fields.
    // Let's assume the user's name is either provided in the registration or we use a fallback.
    const user = await new Promise<any>((resolve, reject) => {
      db.get("SELECT email FROM users WHERE id = ?", [authUser.id], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found in database." });
    }

    // Validate essential booking fields
    if (!body.packageTitle || !body.totalAmount || !body.bookingReference) {
      return res.status(400).json({ message: "Missing required fields: packageTitle, totalAmount, bookingReference" });
    }

    // 2. Fetch package details for Group Tour validation
    let resolvedPkg: Awaited<ReturnType<typeof getPackageById>> = null;
    if (body.packageId) {
      resolvedPkg = await getPackageById(body.packageId);
      if (resolvedPkg && resolvedPkg.isGroupTour) {
        if (!body.travelDate) {
          return res.status(400).json({ message: "Travel date is required for group tours." });
        }

        const departure = resolvedPkg.groupDepartures?.find(d => d.date === body.travelDate);
        if (!departure) {
          return res.status(400).json({ message: `No group departure available for the selected date: ${body.travelDate}` });
        }

        const requestedTravelers = body.travelers || 1;
        const remainingSpots = departure.maxCapacity - departure.currentBookings;
        if (requestedTravelers > remainingSpots) {
          return res.status(400).json({ 
            message: `Not enough spots remaining. Only ${remainingSpots} spots available for this departure.`,
            remainingSpots
          });
        }
        
        // Note: In a real app, we'd update currentBookings here or in a transaction.
        // For this MVP, we'll proceed as if it's reserved and update later or manually.
      }
    }

    // Insert into local SQLite bookings table linked to authUser.id
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO bookings
          (user_id, booking_reference, package_id, package_title, destination, duration,
           travel_date, travelers, traveler_name, room_type, email, phone,
           total_amount, airline, departure_time, payment_status, booking_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'confirmed')`,
        [
          String(authUser.id),
          body.bookingReference,
          body.packageId || null,
          body.packageTitle,
          body.destination || null,
          body.duration || null,
          body.travelDate || null,
          body.travelers || 1,
          body.travelerName || null,
          body.roomType || null,
          body.email || user.email, // Prioritize the traveler's provided email, fallback to registered
          body.phone || null,
          body.totalAmount,
          body.airline || null,
          body.departureTime || null,
        ],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    logger(`[booking/book] Saved booking ${body.bookingReference} to SQLite`);

    // 3. Update Group Tour capacity — ONLY for group tours
    if (resolvedPkg?.isGroupTour && body.packageId && body.travelDate) {
      const { updateGroupBookings } = require("../modules/packages/service/packageService");
      try {
        await updateGroupBookings(body.packageId, body.travelDate, body.travelers || 1);
        logger(`[booking/book] Updated group capacity for ${body.packageId} on ${body.travelDate}`);
      } catch (updateErr: any) {
        logger(`[booking/book] Warning: Failed to update group capacity:`, updateErr.message);
        // We don't fail the whole booking if just the capacity cache update fails, 
        // but we log it as a warning since the main booking is already saved in SQLite.
      }
    }

    // Send confirmation email asynchronously
    const hasEmailConfig = (config.resendApiKey && config.resendFrom) || (config.smtpUser && config.smtpPass);
    if (hasEmailConfig) {
      setImmediate(async () => {
        logger(`[booking/book] Starting async email process for ${body.bookingReference}`);
        try {
          const { getDb } = require("../db");
          const db = getDb();
          
          // 1. Fetch Detailed Itinerary from SQLite
          let detailedItinerary: { day: number; title: string; description: string }[] = [];
          if (body.packageId) {
            try {
              detailedItinerary = await new Promise<any[]>((resolve, reject) => {
                db.all(
                  "SELECT day_number as day, activity_title as title, description FROM itineraries WHERE package_id = ? ORDER BY day_number ASC",
                  [body.packageId],
                  (err: Error | null, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                  }
                );
              });
              logger(`[booking/book] Fetched ${detailedItinerary.length} itinerary items for ${body.packageId}`);
            } catch (dbErr: any) {
              logger(`[booking/book] Failed to fetch itinerary:`, dbErr.message);
            }
          }

          // 2. Construct full payload for PDF
          const payload: EmailPayload = {
            fullName: body.travelerName || "Traveler",
            email: user.email,
            phone: body.phone || "-",
            bookingReference: body.bookingReference!,
            bookingId: body.bookingReference!, 
            paymentId: "PAID",
            packageTitle: body.packageTitle!,
            destination: body.destination || "-",
            travelDate: body.travelDate || "TBA",
            passengers: body.travelers || 1,
            totalAmount: body.totalAmount!,
            travelCategory: "General",
            itineraryDays: detailedItinerary.map(it => ({
               day: it.day,
               title: it.title,
               activities: [it.description]
            })),
            itineraryNights: [],
            transportDetails: body.airline ? `Flight: ${body.airline}` : "-",
            activities: [],
            checkIn: body.travelDate || "-",
            checkOut: "-",
            emergencyContact: baseDefaults.emergencyContact,
            travelGuidelines: baseDefaults.travelGuidelines,
            documentsToCarry: baseDefaults.documentsToCarry,
            importantNotes: baseDefaults.importantNotes,
            duration: body.duration || "-",
            airline: body.airline || "-",
            departureTime: body.departureTime || "-",
            arrivalTime: "-",
            included: body.included || [],
            excluded: body.excluded || [],
          };

          const pdf = await generateTicketPdf(payload);

          const durationDays = parseInt(body.duration || "0") || 0;
          const travelDate = body.travelDate ? new Date(body.travelDate) : new Date();
          const checkOutDate = new Date(travelDate);
          checkOutDate.setDate(checkOutDate.getDate() + (durationDays > 0 ? durationDays - 1 : 0));

          const emailUser = { email: body.email || user.email, name: body.travelerName || "Traveler" };
          const emailData = {
            bookingReference: body.bookingReference!,
            packageTitle: body.packageTitle!,
            destination: body.destination,
            travelDate: body.travelDate || "TBA",
            totalAmount: body.totalAmount!,
            duration: body.duration,
            airline: body.airline,
            departureTime: body.departureTime,
            arrivalTime: body.arrivalTime,
            checkIn: body.travelDate,
            checkOut: body.checkOut || checkOutDate.toISOString().split('T')[0],
            transportType: (body.airline?.toLowerCase().includes('coach') ? 'bus' : 'flight') as 'flight' | 'bus' | 'train' | 'other',
            supportEmail: config.supportEmail,
            supportPhone: config.supportPhone,
            itinerarySummary: detailedItinerary,
            included: body.included,
            excluded: body.excluded
          };

          // 3. Send Comprehensive Confirmation Email
          try {
            await sendBookingConfirmation(
              emailUser,
              emailData,
              {
                attachment: {
                  filename: `TravelMate-Ticket-${payload.bookingReference}.pdf`,
                  content: pdf,
                  contentType: "application/pdf",
                },
              }
            );

            // Mark email as sent in SQLite
            await new Promise<void>((resolve, reject) => {
              db.run(
                `UPDATE bookings SET email_sent = 1 WHERE booking_reference = ?`,
                [body.bookingReference],
                (err: Error | null) => (err ? reject(err) : resolve())
              );
            });
            logger(`[booking/book] Consolidated confirmation email successfully dispatched for ${body.bookingReference}`);
          } catch (sendErr: any) {
            logger(`[booking/book] All email retries failed for ${body.bookingReference}. Recording failure in DB.`);
            // Record failure for background recovery
            // We store the PDF content as base64 in the payload_json
            await recordEmailFailure(
              body.bookingReference!,
              user.email,
              { 
                user: emailUser, 
                booking: emailData,
                attachment: {
                  filename: `TravelMate-Ticket-${payload.bookingReference}.pdf`,
                  content: pdf.toString('base64'),
                  contentType: "application/pdf"
                }
              },
              sendErr.message
            );
          }
        } catch (emailErr: any) {
          logger(`[booking/book] Fatal error in async email process for ${body.bookingReference}:`, emailErr.message);
        }
      });
    } else {
      logger(`[booking/book] Skipping confirmation email for ${body.bookingReference}: No valid email configuration (Resend/SMTP) found.`);
    }

    return res.status(201).json({
      success: true,
      bookingReference: body.bookingReference,
      message: "Booking saved. Confirmation email is being sent.",
    });
  } catch (error: any) {
    logger("[booking/book] Error:", error.message);

    if (/UNIQUE constraint/i.test(error.message)) {
      return res.status(409).json({ message: "Booking reference already exists" });
    }
    return res.status(500).json({ message: error.message || "Failed to save booking" });
  }
});

router.post("/simulate-payment", async (req: Request, res: Response) => {
  const { package: packageTitle, amount, email, bookingId, customerName } = req.body;
  
  if (!packageTitle || !amount || !email || !bookingId || !customerName) {
    return res.status(400).json({ message: "Missing required fields: package, amount, email, bookingId, customerName" });
  }

  try {
    const db = getDb();
    
    // Try to find user_id by email to link to an actual account if possible
    const userRow = await new Promise<any>((resolve) => {
      db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => resolve(row));
    });
    
    const userId = userRow ? String(userRow.id) : "SIMULATED_USER";

    // Insert into local SQLite bookings table
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO bookings
          (user_id, booking_reference, package_title, email, traveler_name, total_amount, payment_status, booking_status, payment_verified)
         VALUES (?, ?, ?, ?, ?, ?, 'paid', 'confirmed', 1)`,
        [userId, bookingId, packageTitle, email, customerName, amount],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    logger(`[booking/simulate-payment] Saved simulated booking ${bookingId} for ${email}`);

    // Trigger confirmation email asynchronously
    const hasEmailConfig = (config.resendApiKey && config.resendFrom) || (config.smtpUser && config.smtpPass);
    if (hasEmailConfig) {
      setImmediate(async () => {
        logger(`[booking/simulate-payment] Starting async email process for ${bookingId}`);
        try {
          const payload: EmailPayload = {
            fullName: customerName,
            email: email,
            phone: "-",
            bookingReference: bookingId,
            bookingId: bookingId,
            paymentId: "SIMULATED_PAYMENT",
            packageTitle: packageTitle,
            destination: packageTitle,
            travelDate: "TBA",
            passengers: 1,
            totalAmount: Number(amount),
            travelCategory: "Simulation",
            itineraryDays: [],
            itineraryNights: [],
            transportDetails: "-",
            activities: [],
            checkIn: "-",
            checkOut: "-",
            emergencyContact: config.supportPhone || "+91 9342180670",
            travelGuidelines: ["This is a simulated booking for demonstration purposes."],
            documentsToCarry: ["Government ID", "Simulated Booking Receipt"],
            importantNotes: ["Payment was processed via simulation mode."],
            duration: "-",
            airline: "-",
            departureTime: "-",
            arrivalTime: "-",
            included: [],
            excluded: [],
          };

          const pdf = await generateTicketPdf(payload);
          
          await sendBookingConfirmation(
            { email, name: customerName },
            {
              bookingReference: bookingId,
              packageTitle: packageTitle,
              travelDate: "TBA",
              totalAmount: Number(amount),
              supportEmail: config.supportEmail,
              supportPhone: config.supportPhone,
              duration: "-",
              airline: "-",
              departureTime: "-",
              arrivalTime: "-",
              itinerarySummary: [],
              included: [],
              excluded: [],
            },
            {
              attachment: {
                filename: `TravelMate-Ticket-SIM-${bookingId}.pdf`,
                content: pdf,
                contentType: "application/pdf",
              },
            }
          );

          // Mark email as sent in SQLite
          db.run(`UPDATE bookings SET email_sent = 1 WHERE booking_reference = ?`, [bookingId]);
          logger(`[booking/simulate-payment] Confirmation email successfully dispatched for ${bookingId}`);
        } catch (emailErr: any) {
          logger(`[booking/simulate-payment] Simulation email failed for ${bookingId}:`, emailErr.message);
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment successful (Simulated)",
      bookingId
    });
  } catch (error: any) {
    logger("[booking/simulate-payment] Error:", error.message);
    return res.status(500).json({ message: "Failed to process simulated payment", error: error.message });
  }
});

export default router;
