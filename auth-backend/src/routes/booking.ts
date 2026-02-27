import { Router, Request, Response } from "express";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/env";
import { getDb } from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { Resend } from "resend";
import { sendBookingConfirmation } from "../services/email.service";
import { searchFlightOffers } from "../modules/packages/provider/amadeusProvider";
import { getPackageById } from "../modules/packages/service/packageService";
import { logger } from "../server";

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

const fetchBooking = async (bookingReference: string, userId?: string) => {
  const client = getSupabase();
  if (!client) throw new Error("Supabase service role config missing");
  let query = client
    .from("bookings")
    .select("id,user_id,booking_reference,first_name,last_name,email,phone,package_title,payment_id,payment_status,payment_verified,travelers,total_amount,booking_terms,email_sent,booking_status")
    .eq("booking_reference", bookingReference)
    .limit(1);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return (data || null) as BookingRecord | null;
};

const safeUpdate = async (bookingId: string, patch: Record<string, unknown>) => {
  const client = getSupabase();
  if (!client) throw new Error("Supabase service role config missing");
  const { error } = await client.from("bookings").update(patch).eq("id", bookingId);
  if (error && /email_sent|booking_status|ticket_pdf_url|email_|schema cache/i.test(error.message)) {
    const fallback = await client.from("bookings").update({ booking_terms: patch.booking_terms }).eq("id", bookingId);
    if (fallback.error) throw new Error(fallback.error.message);
    return;
  }
  if (error) throw new Error(error.message);
};

const uploadPdfAndGetUrl = async (booking: BookingRecord, pdf: Buffer) => {
  const client = getSupabase();
  if (!client || !config.bookingTicketsBucket) return null;
  const path = `${booking.user_id}/${booking.booking_reference || booking.id}.pdf`;
  const { error } = await client.storage.from(config.bookingTicketsBucket).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    console.error("ticket upload failed:", error.message);
    return null;
  }
  const { data } = client.storage.from(config.bookingTicketsBucket).getPublicUrl(path);
  return data.publicUrl || null;
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
  return { ok: true, code: 200, message: "sent" };
};

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

router.post("/confirm-after-payment", sendBookingConfirmationHandler);
router.post("/send-booking-confirmation", sendBookingConfirmationHandler);

router.post("/confirm-booking", async (req: Request, res: Response) => {
  const { bookingId, bookingReference } = req.body as { bookingId?: string; bookingReference?: string };
  if (!bookingId && !bookingReference) return res.status(400).json({ message: "bookingId or bookingReference is required" });

  try {
    const client = getSupabase();
    if (!client) throw new Error("Supabase config missing");

    let query = client.from("bookings").update({
      payment_status: "paid",
      payment_verified: true,
      booking_status: "confirmed",
    });

    if (bookingId) {
      query = query.eq("id", bookingId);
    } else if (bookingReference) {
      query = query.eq("booking_reference", bookingReference);
    }

    const { error } = await query;
    if (error) throw error;

    return res.json({ success: true });
  } catch (error: any) {
    console.error("confirm-booking failed:", error);
    return res.status(500).json({ message: error.message || "Failed to confirm booking" });
  }
});

router.post("/create-booking", async (req: Request, res: Response) => {
  const body = req.body as { booking?: Record<string, unknown> };
  if (!body.booking) return res.status(400).json({ message: "booking payload is required" });

  const client = getSupabase();
  if (!client) return res.status(500).json({ message: "Supabase service role config missing" });

  let { error } = await client.from("bookings").insert(body.booking);

  if (
    error &&
    /booking_terms|locked_price_per_person|locked_total_amount|is_locked|email_sent|booking_status|ticket_pdf_url|schema cache/i.test(
      error.message
    )
  ) {
    const legacyPayload = {
      user_id: body.booking.user_id as string,
      package_id: body.booking.package_id as string,
      package_title: body.booking.package_title as string,
      travelers: body.booking.travelers as number,
      first_name: body.booking.first_name as string,
      last_name: body.booking.last_name as string,
      email: body.booking.email as string,
      phone: body.booking.phone as string,
      total_amount: body.booking.total_amount as number,
      payment_status: body.booking.payment_status as string,
      payment_verified: body.booking.payment_verified as boolean,
      payment_id: body.booking.payment_id as string,
      booking_reference: body.booking.booking_reference as string,
    };
    const retry = await client.from("bookings").insert(legacyPayload);
    error = retry.error;
  }

  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json({ message: "Booking saved" });
});

router.get("/user-bookings", async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ message: "userId is required" });

  try {
    const { getDb } = require("../db");
    const db = getDb();
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Map local SQLite rows to match the expected frontend BookingRow format
    const localBookings = rows.map((row) => ({
      id: `local-${row.id}`,
      booking_reference: row.booking_reference,
      package_id: row.package_title, // Using title as fallback id for mapping
      package_title: row.package_title,
      travelers: row.travelers,
      total_amount: row.total_amount,
      payment_status: row.payment_status,
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
          user.email, // Use registered email
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

    // Send confirmation email asynchronously (only for normal tours)
    const hasEmailConfig = (config.resendApiKey && config.resendFrom) || (config.smtpUser && config.smtpPass);
    if (hasEmailConfig && !resolvedPkg?.isGroupTour) {
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

          // 3. Send Comprehensive Confirmation Email
          await sendBookingConfirmation(
            { email: user.email, name: body.travelerName || "Traveler" },
            {
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
              transportType: body.airline?.toLowerCase().includes('coach') ? 'bus' : 'flight',
              supportEmail: config.supportEmail,
              supportPhone: config.supportPhone,
              itinerarySummary: detailedItinerary,
              included: body.included,
              excluded: body.excluded
            },
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
              (err: Error | null) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          logger(`[booking/book] Consolidated confirmation email successfully dispatched for ${body.bookingReference}`);
        } catch (emailErr: any) {
          logger(`[booking/book] Email delivery FAILED for ${body.bookingReference}:`, emailErr.message);
        }
      });
    } else if (resolvedPkg?.isGroupTour) {
      logger(`[booking/book] Skipping automated confirmation email/PDF for Group Tour: ${body.bookingReference}`);
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

export default router;
