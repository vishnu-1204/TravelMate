import { Resend } from "resend";
import { config } from "../config/env";
import { getBookingConfirmationTemplate, type BookingEmailDetails as TemplateDetails } from "../templates/bookingConfirmation";

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
  itinerarySummary?: string[];
  supportEmail?: string;
  supportPhone?: string;
  duration?: string;
  // Flight details for Resend transition
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  included?: string[];
  excluded?: string[];
};

export type Attachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

const appTitle = "TravelMate"; // Branded title
const resend = new Resend(config.resendApiKey);

const hasResendConfig = () => Boolean(config.resendApiKey && config.resendFrom);

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
 * Standard layout for simple transactional emails (Welcome, Verification, Test).
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
  if (!hasResendConfig()) throw new Error("Resend is not configured");
  const name = user.name?.trim() || "Traveler";
  const html = layout(
    "Welcome to TravelMate",
    `<p style="margin:0 0 12px;color:#334155;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;color:#334155;">Your account is ready. You can now explore packages, book trips, and track your journeys in one place.</p>
     <p style="margin:0;color:#334155;">We are glad to have you with us.</p>`
  );
  
  await resend.emails.send({
    from: config.resendFrom,
    to: user.email,
    subject: "Welcome to TravelMate",
    html,
  });
};

export const sendVerificationEmail = async (user: EmailUser, token: string) => {
  if (!hasResendConfig()) throw new Error("Resend is not configured");
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

  await resend.emails.send({
    from: config.resendFrom,
    to: user.email,
    subject: "Verify your TravelMate account",
    html,
  });
};

export const sendBookingConfirmation = async (
  user: EmailUser,
  booking: BookingEmailDetails,
  options?: { attachment?: Attachment }
) => {
  if (!hasResendConfig()) throw new Error("Resend is not configured");
  
  const templateDetails: TemplateDetails = {
    firstName: user.name?.split(' ')[0] || "Traveler",
    email: user.email,
    packageTitle: booking.packageTitle,
    duration: booking.duration || "TBA", // Duration might need to be passed explicitly or inferred
    price: `INR ${Number(booking.totalAmount).toLocaleString("en-IN")}`,
    bookingReference: booking.bookingReference,
    airline: booking.airline || "TBA",
    departureTime: booking.departureTime || "TBA",
    arrivalTime: booking.arrivalTime || "TBA",
    itinerary: (booking.itinerarySummary || []).map((desc, idx) => ({
      day: idx + 1,
      title: desc.split(":")[0] || `Day ${idx + 1}`,
      description: desc.split(":")[1]?.trim() || desc
    })),
    included: booking.included || [],
    excluded: booking.excluded || []
  };

  const html = getBookingConfirmationTemplate(templateDetails);

  await resend.emails.send({
    from: config.resendFrom,
    to: user.email,
    subject: `Your Adventure is Confirmed! - ${booking.bookingReference}`,
    html,
    attachments: options?.attachment ? [{ content: options.attachment.content, filename: options.attachment.filename }] : undefined,
  });
};

export const sendTestEmail = async (to: string) => {
  if (!hasResendConfig()) throw new Error("Resend is not configured");
  const html = layout(
    "Vanakam da mapla",
    `<p style="margin:0 0 10px;color:#334155;">Vanakam da mapla</p>
     <p style="margin:0;color:#334155;">Provider: Resend SDK</p>`
  );
  
  await resend.emails.send({
    from: config.resendFrom,
    to,
    subject: "TravelMate Email Test",
    html,
  });
};
