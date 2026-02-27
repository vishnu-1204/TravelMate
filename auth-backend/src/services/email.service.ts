import { Resend } from "resend";
import nodemailer from "nodemailer";
import { config } from "../config/env";
import { getBookingConfirmationTemplate, type BookingEmailDetails as TemplateDetails } from "../templates/bookingConfirmation";
import { getDb } from "../db";

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

export const sendWelcomeEmail = async (user: EmailUser) => {
  const name = user.name?.trim() || "Traveler";
  const html = layout(
    "Welcome to TravelMate",
    `<p style="margin:0 0 12px;color:#334155;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;color:#334155;">Your account is ready. You can now explore packages, book trips, and track your journeys in one place.</p>
     <p style="margin:0;color:#334155;">We are glad to have you with us.</p>`
  );

  if (hasResendConfig()) {
    try {
      const { error } = await resend.emails.send({ from: config.resendFrom, to: user.email, subject: "Welcome to TravelMate", html });
      if (!error) return;
    } catch (e) {}
  }
  if (hasSmtpConfig()) {
    await transporter.sendMail({ from: config.smtpFrom || config.smtpUser, to: user.email, subject: "Welcome to TravelMate", html });
  }
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

  if (hasResendConfig()) {
    try {
      const { error } = await resend.emails.send({ from: config.resendFrom, to: user.email, subject: "Verify your TravelMate account", html });
      if (!error) return;
    } catch (e) {}
  }
  if (hasSmtpConfig()) {
    await transporter.sendMail({ from: config.smtpFrom || config.smtpUser, to: user.email, subject: "Verify your TravelMate account", html });
  }
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

  if (hasResendConfig()) {
    try {
      const { error } = await resend.emails.send({ from: config.resendFrom, to: user.email, subject: "Reset your TravelMate password", html });
      if (!error) return;
    } catch (e) {}
  }
  if (hasSmtpConfig()) {
    await transporter.sendMail({ from: config.smtpFrom || config.smtpUser, to: user.email, subject: "Reset your TravelMate password", html });
  }
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

  const html = getBookingConfirmationTemplate(templateDetails);

  if (hasResendConfig()) {
    try {
      const { data, error } = await resend.emails.send({
        from: config.resendFrom,
        to: user.email,
        subject: `Booking Confirmation - ${booking.bookingReference}`,
        html,
        attachments: options?.attachment ? [{ content: options.attachment.content, filename: options.attachment.filename }] : undefined,
      });
      if (!error) return data;
      console.warn(`Resend failed, trying fallback: ${error.message}`);
    } catch (err: any) {
      console.warn(`Resend error, trying fallback: ${err.message}`);
    }
  }

  if (hasSmtpConfig()) {
    return await transporter.sendMail({
      from: config.smtpFrom || config.smtpUser,
      to: user.email,
      subject: `Booking Confirmation - ${booking.bookingReference}`,
      html,
      attachments: options?.attachment ? [{ content: options.attachment.content, filename: options.attachment.filename }] : undefined,
    });
  }

  throw new Error("No email provider configured or all failed");
};

export const sendTestEmail = async (to: string) => {
  const html = layout(
    "TravelMate Email Diagnostic",
    `<p style="margin:0 0 10px;color:#334155;">Hello,</p>
     <p style="margin:0 0 10px;color:#334155;">This is a diagnostic email from your TravelMate backend to verify connectivity.</p>
     <p style="margin:0;color:#334155;">Note: This may have been sent via SMTP fallback if Resend failed.</p>`
  );

  if (hasResendConfig()) {
    try {
      const { data, error } = await resend.emails.send({
        from: config.resendFrom,
        to,
        subject: "TravelMate Diagnostic (Resend)",
        html,
      });
      if (!error) return data;
      console.warn(`Resend test failed: ${error.message}`);
    } catch (err: any) {
      console.warn(`Resend test error: ${err.message}`);
    }
  }

  if (hasSmtpConfig()) {
    return await transporter.sendMail({
      from: config.smtpFrom || config.smtpUser,
      to,
      subject: "TravelMate Diagnostic (SMTP)",
      html,
    });
  }

  throw new Error("All email providers failed");
};
