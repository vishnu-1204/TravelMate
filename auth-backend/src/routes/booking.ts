import { Router, Request, Response } from "express";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/env";
import { sendBookingConfirmation } from "../services/email.service";
import { searchFlightOffers } from "../modules/packages/provider/amadeusProvider";

const router = Router();
const EMAIL_RETRY_LIMIT = 3;

type ItineraryDay = { day: number; title: string; activities: string[]; narrative?: string };
type ItineraryNight = { night: number; accommodation: string; meals: string };

type BookingEmailBody = {
  email?: string;
  fullName?: string;
  phone?: string;
  bookingReference?: string;
  bookingId?: string;
  paymentId?: string;
  packageTitle?: string;
  destination?: string;
  travelDate?: string;
  passengers?: number;
  totalAmount?: number;
  travelCategory?: string;
  itineraryDays?: ItineraryDay[];
  itineraryNights?: ItineraryNight[];
  transportDetails?: string;
  activities?: string[];
  checkIn?: string;
  checkOut?: string;
  emergencyContact?: string;
  travelGuidelines?: string[];
  documentsToCarry?: string[];
  importantNotes?: string[];
  duration?: string;
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  included?: string[];
  excluded?: string[];
};

type BookingRecord = {
  id: string;
  user_id: string;
  booking_reference: string | null;
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
    const detail = day.activities?.length ? day.activities.join(", ") : day.narrative || "";
    return `Day ${day.day}: ${day.title}${detail ? ` - ${detail}` : ""}`;
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
          itinerarySummary: toItinerarySummary(payload),
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
    } catch (error) {
      lastError = error as Error;
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
  const client = getSupabase();
  if (!client) return res.status(500).json({ message: "Supabase service role config missing" });

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const { data, error } = await client
    .from("bookings")
    .select("booking_reference,email,total_amount,email_sent,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ message: error.message });
  return res.status(200).json({ bookings: (data || []) as AdminBookingRow[] });
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

    // Header Background
    doc.rect(0, 0, doc.page.width, 120).fill("#0f172a");

    // Brand Title
    doc.fontSize(24).fillColor("#ffffff").text("TRAVELMATE", 0, 45, { align: "center", lineGap: 5 });
    doc.fontSize(10).fillColor("#94a3b8").text("YOUR JOURNEY BEGINS WITH US", { align: "center" });

    doc.fillColor("#000000"); // Reset color
    let yPos = 150;

    // Main Ticket Section
    doc.fontSize(18).fillColor("#0f172a").text("Travel Confirmation Ticket", 50, yPos);
    doc.moveDown(0.5);
    yPos = doc.y;

    doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor("#e2e8f0").stroke();
    doc.moveDown(1);
    yPos = doc.y;

    // Passenger & Booking Info (2 columns)
    const col1 = 50;
    const col2 = 300;

    doc.fontSize(10).fillColor("#64748b");
    doc.text("PASSENGER NAME", col1, yPos);
    doc.text("BOOKING REFERENCE", col2, yPos);
    doc.moveDown(0.2);
    
    doc.fontSize(12).fillColor("#0f172a");
    doc.text(data.fullName.toUpperCase(), col1, doc.y);
    doc.text(data.bookingReference, col2, doc.y - 15); // Adjust Y because of moveDown
    doc.moveDown(1);
    yPos = doc.y;

    doc.fontSize(10).fillColor("#64748b");
    doc.text("PACKAGE", col1, yPos);
    doc.text("TRAVEL DATE", col2, yPos);
    doc.moveDown(0.2);

    doc.fontSize(12).fillColor("#0f172a");
    doc.text(data.packageTitle, col1, doc.y);
    doc.text(data.travelDate, col2, doc.y - 15);
    doc.moveDown(1.5);
    yPos = doc.y;

    // Flight Details Box
    doc.rect(50, yPos, 495, 80).fill("#f8fafc").strokeColor("#cbd5e1").stroke();
    
    doc.fontSize(11).fillColor("#0f172a").text("Flight Information", 65, yPos + 10);
    doc.fontSize(9).fillColor("#64748b").text("AIRLINE", 65, yPos + 30);
    doc.text("DEPARTURE", 200, yPos + 30);
    doc.text("ARRIVAL", 350, yPos + 30);
    doc.text("DURATION", 470, yPos + 30);

    doc.fontSize(10).fillColor("#0f172a").text(data.airline, 65, yPos + 45);
    doc.text(data.departureTime, 200, yPos + 45);
    doc.text(data.arrivalTime, 350, yPos + 45);
    doc.text(data.duration, 470, yPos + 45);

    doc.moveDown(5);
    yPos = doc.y;

    // Inclusions & Exclusions
    doc.fontSize(14).fillColor("#0f172a").text("Inclusions", 50, yPos);
    doc.text("Exclusions", 300, yPos);
    doc.moveDown(0.5);
    
    const incPos = doc.y;
    doc.fontSize(9).fillColor("#334155");
    data.included.slice(0, 6).forEach((item) => doc.text(`- ${item}`, 50));
    
    doc.y = incPos;
    data.excluded.slice(0, 6).forEach((item) => doc.text(`- ${item}`, 300));

    doc.moveDown(2);
    yPos = doc.y;

    // Itinerary Section
    doc.fontSize(14).fillColor("#0f172a").text("Trip Itinerary Overview", 50, yPos);
    doc.moveDown(0.5);
    
    doc.fontSize(10).fillColor("#334155");
    if (data.itineraryDays.length === 0) {
      doc.text("- Detailed itinerary will be shared via email.");
    } else {
      data.itineraryDays.slice(0, 8).forEach((day) => { // Limit to fit page or handle page breaks
        doc.fillColor("#3b82f6").text(`Day ${day.day}: `, { continued: true });
        doc.fillColor("#0f172a").text(day.title);
        
        if (day.narrative) {
          doc.fontSize(9).fillColor("#64748b").text(day.narrative.slice(0, 150) + "...", { indent: 15 });
        }
        doc.moveDown(0.3);
      });
    }

    // Footer
    doc.fontSize(8).fillColor("#94a3b8").text(
      `Support: ${config.supportEmail} | ${config.supportPhone} | Generated on ${new Date().toLocaleDateString()}`,
      50,
      doc.page.height - 50,
      { align: "center" }
    );

    doc.end();
  });
}

export default router;
