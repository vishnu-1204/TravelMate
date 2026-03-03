import { Resend } from "resend";
import nodemailer from "nodemailer";
import { config } from "../config/env";
import { getBookingConfirmationTemplate, type BookingEmailDetails as TemplateDetails } from "../templates/bookingConfirmation";
import { getFlightTicketTemplate, type FlightTicketEmailDetails } from "../templates/flightTicket";
import { getDb } from "../db";
import { logger } from "../utils/logger";

export type EmailUser = {
  email: string;
  name?: string;
};

export type BookingEmailDetails = {
  bookingReference: string;
  packageTitle: string;
  destination?: string;
  travelDate: string;
  totalAmount: number;
  travelers?: number;
  paymentStatus?: string;
  itinerarySummary?: { day: number; title: string; description: string }[];
  supportEmail?: string;
  supportPhone?: string;
  duration?: string;
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  included?: string[];
  excluded?: string[];
  checkIn?: string;
  checkOut?: string;
  transportType?: 'flight' | 'bus' | 'train' | 'other';
};

export type Attachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

const appTitle = "TravelMate";
const resend = new Resend(config.resendApiKey);

// SMTP Transporter (Fallback)
const transporter = nodemailer.createTransport({
  host: config.smtpHost || "smtp.gmail.com",
  port: config.smtpPort || 587,
  secure: config.smtpPort === 465,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

const hasResendConfig = () => Boolean(config.resendApiKey && config.resendFrom);
const hasSmtpConfig = () => Boolean(config.smtpUser && config.smtpPass);

/**
 * Escapes HTML characters to prevent XSS in email content.
 */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Standard layout for simple transactional emails.
 */
const layout = (title: string, body: string) => `
<div class="tm-wrap" style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,sans-serif;color:#111827;">
  <div class="tm-card" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
    <div style="padding:18px 22px;background:#0f172a;color:#ffffff;">
      <h1 style="margin:0;font-size:20px;">${appTitle}</h1>
      <p style="margin:6px 0 0;font-size:12px;opacity:0.9;">Your journey begins with us</p>
    </div>
    <div class="tm-content" style="padding:24px;">
      <h2 class="tm-title" style="margin:0 0 14px;font-size:22px;color:#0f172a;">${title}</h2>
      ${body}
      <p style="margin:22px 0 0;font-size:13px;color:#475569;">Need help? ${escapeHtml(config.supportEmail)} | ${escapeHtml(config.supportPhone)}</p>
    </div>
  </div>
</div>`;

const verifyUrl = (token: string) => `${config.backendUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;

/**
 * Helper to send email with retry logic and dual-provider fallback.
 */
async function sendWithRetry(
  tag: string,
  to: string,
  subject: string,
  html: string,
  options?: { attachments?: any[] }
) {
  const maxRetries = 2; // Reduced from 3
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger(`[${tag}] Attempt ${attempt}/${maxRetries} to ${to}`);

      // Try SMTP first (if it failed before with auth error, we might want to skip, but for now we try once)
      if (hasSmtpConfig()) {
        try {
          // Add a connection timeout to the transporter if possible or just race it
          const result = await Promise.race([
            transporter.sendMail({
              from: config.smtpFrom || config.smtpUser,
              to,
              subject,
              html,
              attachments: options?.attachments,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("SMTP Timeout")), 6000))
          ]);
          logger(`[${tag}] SUCCESS via SMTP on attempt ${attempt}`);
          return result;
        } catch (smtpErr: any) {
          logger(`[${tag}] SMTP failed (Attempt ${attempt}): ${smtpErr.message}`);
          lastError = smtpErr;
          // If it's an Auth error (535), don't bother retrying SMTP or waiting
          if (smtpErr.message.includes('535') || smtpErr.message.includes('Username and Password not accepted')) {
             logger(`[${tag}] Permanent Auth Error detected. Skipping SMTP retries.`);
             // We don't return here, we let it fall through to Resend
          }
        }
      }

      // Try Resend
      if (hasResendConfig()) {
        try {
          const { data, error } = await resend.emails.send({
            from: config.resendFrom,
            to,
            subject,
            html,
            attachments: options?.attachments,
          });
          if (!error) {
            logger(`[${tag}] SUCCESS via Resend on attempt ${attempt}`);
            return data;
          }
          logger(`[${tag}] Resend failed (Attempt ${attempt}): ${error.message}`);
          lastError = error;
        } catch (resendErr: any) {
          logger(`[${tag}] Resend error (Attempt ${attempt}): ${resendErr.message}`);
          lastError = resendErr;
        }
      }

      if (attempt < maxRetries) {
        // Shorter delay for retries
        const delay = 1000; 
        logger(`[${tag}] Waiting ${delay}ms before next retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (outerErr: any) {
      logger(`[${tag}] Unexpected attempt error (Attempt ${attempt}): ${outerErr.message}`);
      lastError = outerErr;
    }
  }

  throw lastError || new Error(`All attempts failed for ${tag}`);
}

export const sendWelcomeEmail = async (user: EmailUser) => {
  const name = user.name?.trim() || "Traveler";
  const html = layout(
    "Welcome to TravelMate",
    `<p style="margin:0 0 12px;color:#334155;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;color:#334155;">Your account is ready. You can now explore packages, book trips, and track your journeys in one place.</p>
     <p style="margin:0;color:#334155;">We are glad to have you with us.</p>`
  );
  return sendWithRetry("email/welcome", user.email, "Welcome to TravelMate", html);
};

export const sendVerificationEmail = async (user: EmailUser, token: string) => {
  const name = user.name?.trim() || "Traveler";
  const link = verifyUrl(token);
  const html = layout(
    "Verify your email",
    `<p style="margin:0 0 12px;color:#334155;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 16px;color:#334155;">Please verify your email address to secure your TravelMate account.</p>
     <p style="margin:0 0 18px;">
       <a href="${escapeHtml(link)}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;">Verify Email</a>
     </p>
     <p style="margin:0;color:#64748b;font-size:12px;word-break:break-all;">If the button does not work, use this link: ${escapeHtml(link)}</p>`
  );
  return sendWithRetry("email/verify", user.email, "Verify your TravelMate account", html);
};

export const sendPasswordResetEmail = async (user: EmailUser, resetLink: string) => {
  const name = user.name?.trim() || "Traveler";
  const html = layout(
    "Reset Your Password",
    `<p style="margin:0 0 12px;color:#334155;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 16px;color:#334155;">We received a request to reset your TravelMate account password. Click the button below to create a new password.</p>
     <p style="margin:0 0 18px;">
       <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Reset Password</a>
     </p>
     <p style="margin:0 0 12px;color:#64748b;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
     <p style="margin:0;color:#64748b;font-size:12px;word-break:break-all;">If the button does not work, copy this link: ${escapeHtml(resetLink)}</p>`
  );
  return sendWithRetry("email/reset", user.email, "Reset your TravelMate password", html);
};

const getHeroImage = (dest: string) => {
  const d = dest.toLowerCase();
  if (d.includes('himachal') || d.includes('kasol')) return 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80';
  if (d.includes('dharamshala')) return 'https://images.unsplash.com/photo-1591181165239-01f114170e5c?auto=format&fit=crop&w=800&q=80';
  if (d.includes('manali')) return 'https://images.unsplash.com/photo-1593134257782-e89567b7718a?auto=format&fit=crop&w=800&q=80';
  if (d.includes('kerala')) return 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80';
  if (d.includes('goa') || d.includes('beach')) return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=800&q=80';
};

export const sendBookingConfirmation = async (
  user: EmailUser,
  booking: BookingEmailDetails,
  options?: { attachment?: Attachment }
) => {
  const templateDetails: TemplateDetails = {
    firstName: user.name?.split(' ')[0] || "Traveler",
    email: user.email,
    packageTitle: booking.packageTitle,
    destination: booking.destination,
    duration: booking.duration || "TBA",
    price: `INR ${Number(booking.totalAmount).toLocaleString("en-IN")}`,
    bookingReference: booking.bookingReference,
    travelDate: booking.travelDate || "TBA",
    travelers: booking.travelers,
    paymentStatus: booking.paymentStatus || "Paid",
    airline: booking.airline || "TBA",
    departureTime: booking.departureTime || "TBA",
    arrivalTime: booking.arrivalTime || "TBA",
    itinerary: booking.itinerarySummary || [],
    included: booking.included || [],
    excluded: booking.excluded || [],
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    transportType: booking.transportType || (booking.airline?.toLowerCase().includes('coach') ? 'bus' : 'flight'),
    heroImage: getHeroImage(booking.destination || booking.packageTitle),
    emergencyContact: config.supportPhone,
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
  };

  try {
    const html = getBookingConfirmationTemplate(templateDetails);

    return sendWithRetry(`email/booking-${booking.bookingReference}`, user.email, `Booking Confirmed: ${booking.packageTitle}`, html, options?.attachment ? {
      attachments: [{ content: options.attachment.content, filename: options.attachment.filename }]
    } : undefined);
  } catch (err: any) {
    logger(`[email/booking] Error structuring template: ${err.message}`);
    throw err;
  }
};

export const sendCancellationEmail = async (
  user: EmailUser,
  booking: BookingEmailDetails,
  cancellationReason: string,
  refundAmount?: number
) => {
  const templateDetails: TemplateDetails = {
    firstName: user.name?.split(' ')[0] || "Traveler",
    email: user.email,
    packageTitle: booking.packageTitle,
    destination: booking.destination,
    duration: booking.duration || "TBA",
    price: `INR ${Number(booking.totalAmount).toLocaleString("en-IN")}`,
    bookingReference: booking.bookingReference,
    travelDate: booking.travelDate || "TBA",
    travelers: booking.travelers,
    paymentStatus: "Refunded",
    airline: booking.airline || "TBA",
    departureTime: booking.departureTime || "TBA",
    arrivalTime: booking.arrivalTime || "TBA",
    itinerary: booking.itinerarySummary || [],
    included: [],
    excluded: [],
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    transportType: booking.transportType || (booking.airline?.toLowerCase().includes('coach') ? 'bus' : 'flight'),
    heroImage: getHeroImage(booking.destination || booking.packageTitle),
    emergencyContact: config.supportPhone,
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
  };

  try {
    const html = layout(
      `Booking Cancelled - ${booking.bookingReference}`,
      `
      <div style="text-align:center;padding:10px 0 20px;">
        <h2 style="color:#ef4444;margin:0;font-size:24px;">Booking Cancelled</h2>
        <p style="color:#64748b;margin:8px 0 0;font-size:16px;">Reference: <strong>${templateDetails.bookingReference}</strong></p>
      </div>
      
      <p style="color:#334155;font-size:16px;line-height:1.5;margin-bottom:20px;">Hi ${templateDetails.firstName},</p>
      <p style="color:#334155;font-size:16px;line-height:1.5;margin-bottom:24px;">Your booking for <strong>${templateDetails.packageTitle}</strong> has been successfully cancelled as per your request.</p>
      
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 16px;color:#0f172a;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">Cancellation Overview</h3>
        
        <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
          <tr>
            <td style="color:#64748b;padding:6px 0;width:140px;">Travel Date</td>
            <td style="color:#0f172a;font-weight:600;padding:6px 0;">${templateDetails.travelDate}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0;">Amount Paid</td>
            <td style="color:#0f172a;font-weight:600;padding:6px 0;">${templateDetails.price}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0;">Refund Amount</td>
            <td style="color:#22c55e;font-weight:600;padding:6px 0;">${templateDetails.refundPrice}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0;vertical-align:top;">Your Reason</td>
            <td style="color:#0f172a;font-weight:600;padding:6px 0;">${escapeHtml(cancellationReason)}</td>
          </tr>
        </table>
      </div>

      <div style="background:#fdf4ff;border:1px solid #fbcfe8;border-radius:12px;padding:20px;margin-bottom:32px;">
        <h3 style="margin:0 0 12px;color:#86198f;font-size:16px;display:flex;align-items:center;">Refund Information</h3>
        <p style="color:#701a75;font-size:14px;margin:0;line-height:1.5;">Your refund of <strong>${templateDetails.refundPrice}</strong> will be processed within 5-7 business days. (Note: Since this is a test environment, no actual funds will be transferred).</p>
      </div>
      
      <div style="border-top:2px dashed #e2e8f0;padding-top:24px;margin-top:10px;">
        <h3 style="margin:0 0 12px;color:#0f172a;font-size:16px;">Need Further Support?</h3>
        <p style="color:#475569;font-size:14px;margin:0 0 8px;">We hope to travel with you in the future! If you have any further questions or challenges with your refund, do not hesitate to reach us:</p>
        <p style="margin:0 0 6px;color:#334155;font-size:14px;">Email: <a href="mailto:${templateDetails.supportEmail}" style="color:#0284c7;text-decoration:none;font-weight:500;">${templateDetails.supportEmail}</a></p>
        <p style="margin:0;color:#334155;font-size:14px;">Phone: <strong>${templateDetails.supportPhone}</strong></p>
      </div>
      `
    );

    return sendWithRetry(`email/cancel-${booking.bookingReference}`, user.email, `Booking Cancelled: ${booking.packageTitle}`, html);
  } catch (err: any) {
    logger(`[email/cancel] Error structuring template: ${err.message}`);
    throw err;
  }
};

export const sendFlightTicketEmail = async (
  user: EmailUser,
  details: FlightTicketEmailDetails,
  options?: { attachment?: Attachment }
) => {
  const html = getFlightTicketTemplate(details);

  return sendWithRetry(
    "email/flight-ticket",
    user.email,
    `Your Flight E-Ticket - ${details.pnr}`,
    html,
    options?.attachment ? {
      attachments: [{ content: options.attachment.content, filename: options.attachment.filename }]
    } : undefined
  );
};

/**
 * Records a failed email attempt in the database for later recovery.
 */
export const recordEmailFailure = async (bookingRef: string, email: string, payload: any, errorMessage: string) => {
  const db = getDb();
  return new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO booking_email_failures (booking_reference, email, payload_json, error_message, last_attempt, attempts) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
      [bookingRef, email, JSON.stringify(payload), errorMessage],
      (err) => {
        if (err) {
          logger(`[email/recovery] CRITICAL: Failed to record email failure in DB: ${err.message}`);
          reject(err);
        } else {
          logger(`[email/recovery] Recorded failure for ${bookingRef} in DB.`);
          resolve();
        }
      }
    );
  });
};

/**
 * Retries all pending failed emails from the database.
 */
export const retryFailedEmailsList = async () => {
  const db = getDb();
  logger(`[email/recovery] Checking for failed emails to retry...`);
  
  try {
    const failures = await new Promise<any[]>((resolve, reject) => {
      db.all(`SELECT * FROM booking_email_failures WHERE status = 'pending' AND attempts < 5`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (failures.length === 0) {
      logger(`[email/recovery] No pending failures found.`);
      return;
    }

    logger(`[email/recovery] Found ${failures.length} pending failures. Processing...`);

    for (const fail of failures) {
      try {
        const payload = JSON.parse(fail.payload_json);
        // Extract attachment if it was stored (Note: we might need to store attachment if it's dynamic, 
        // but usually we regenerate it or store only metadata. For now, assuming payload has enough for sendBookingConfirmation)
        
        // Re-generate PDF if it's missing from payload but needed? 
        // In our current flow, booking.ts generates PDF and passes it. 
        // To be truly robust, failure table should store enough to RE-GENERATE or the buffer itself.
        // Storing Buffer as base64 in JSON is okay for small tickets.
        
        const attachment = payload.attachment ? {
          filename: payload.attachment.filename,
          content: Buffer.from(payload.attachment.content, 'base64'),
          contentType: payload.attachment.contentType
        } : undefined;

        await sendBookingConfirmation(
          { email: fail.email, name: payload.user.name },
          payload.booking,
          attachment ? { attachment } : undefined
        );

        // Success! Update status
        await new Promise<void>((resolve, reject) => {
          db.run(
            `UPDATE booking_email_failures SET status = 'sent', attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP WHERE id = ?`,
            [fail.id],
            (err) => (err ? reject(err) : resolve())
          );
        });
        
        // Also update main bookings table
        await new Promise<void>((resolve, reject) => {
          db.run(
            `UPDATE bookings SET email_sent = 1 WHERE booking_reference = ?`,
            [fail.booking_reference],
            (err) => (err ? reject(err) : resolve())
          );
        });

        logger(`[email/recovery] Successfully recovered email for ${fail.booking_reference}`);
      } catch (retryErr: any) {
        logger(`[email/recovery] Retry failed for ${fail.booking_reference}: ${retryErr.message}`);
        await new Promise<void>((resolve) => {
          db.run(
            `UPDATE booking_email_failures SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP, error_message = ? WHERE id = ?`,
            [retryErr.message, fail.id],
            () => resolve()
          );
        });
      }
    }
  } catch (err: any) {
    logger(`[email/recovery] Error during recovery process: ${err.message}`);
  }
};

export const sendTestEmail = async (to: string) => {
  const html = layout(
    "TravelMate Email Diagnostic",
    `<p style="margin:0 0 10px;color:#334155;">Hello,</p>
     <p style="margin:0 0 10px;color:#334155;">This is a diagnostic email from your TravelMate backend to verify connectivity.</p>
     <p style="margin:0;color:#334155;">Note: This may have been sent via SMTP fallback if Resend failed.</p>`
  );
  return sendWithRetry("email/test", to, "TravelMate Email Diagnostic", html);
};

export const sendContactEmail = async (details: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}) => {
  const adminEmail = config.supportEmail || "admin@travelmate.com";
  const html = layout(
    "New Contact Message Received",
    `<div style="color:#334155;line-height:1.6;">
      <p><strong>From:</strong> ${escapeHtml(details.name)} (${escapeHtml(details.email)})</p>
      <p><strong>Phone:</strong> ${escapeHtml(details.phone || "Not provided")}</p>
      <p><strong>Subject:</strong> ${escapeHtml(details.subject || "No Subject")}</p>
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:16px 0;" />
      <p style="white-space:pre-wrap;">${escapeHtml(details.message)}</p>
    </div>`
  );
  return sendWithRetry("email/contact-admin", adminEmail, `Contact: ${details.subject || "New Message"}`, html);
};

export const sendContactAutoReply = async (details: { name: string; email: string }) => {
  const html = layout(
    "Thank you for contacting TravelMate",
    `<p style="margin:0 0 12px;color:#334155;">Hi ${escapeHtml(details.name)},</p>
     <p style="margin:0 0 12px;color:#334155;">Thank you for reaching out to us. We have received your message and our team will get back to you as soon as possible.</p>
     <p style="margin:0;color:#334155;">Best regards,<br/>The TravelMate Team</p>`
  );
  return sendWithRetry("email/contact-autoreply", details.email, "We've received your message", html);
};
