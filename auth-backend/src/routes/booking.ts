import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { config } from "../config/env";

const router = Router();

type ItineraryDay = {
  day: number;
  title: string;
  activities: string[];
  narrative?: string;
};

type ItineraryNight = {
  night: number;
  accommodation: string;
  meals: string;
};

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
};

router.post("/confirmation-email", async (req: Request, res: Response) => {
  const {
    email,
    fullName,
    phone,
    bookingReference,
    bookingId,
    paymentId,
    packageTitle,
    destination,
    travelDate,
    passengers,
    totalAmount,
    travelCategory,
    itineraryDays = [],
    itineraryNights = [],
    transportDetails,
    activities = [],
    checkIn,
    checkOut,
    emergencyContact,
    travelGuidelines = [],
    documentsToCarry = [],
    importantNotes = [],
  } = req.body as BookingEmailBody;

  if (!email || !bookingReference || !packageTitle || !travelDate || !passengers || !totalAmount) {
    return res.status(400).json({ message: "Missing required booking email details" });
  }

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.smtpFrom) {
    return res.status(500).json({ message: "SMTP is not configured on server" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    const pdfBuffer = await generateTicketPdf({
      fullName: fullName || "Traveler",
      bookingReference,
      bookingId: bookingId || bookingReference,
      paymentId: paymentId || "-",
      packageTitle,
      destination: destination || "-",
      travelDate,
      passengers,
      totalAmount,
      travelCategory: travelCategory || "-",
      itineraryDays,
      itineraryNights,
      transportDetails: transportDetails || "-",
      activities,
      checkIn: checkIn || travelDate,
      checkOut: checkOut || "-",
      emergencyContact: emergencyContact || "+91 9342180670",
      travelGuidelines:
        travelGuidelines.length > 0
          ? travelGuidelines
          : [
              "Arrive at your departure point 45 minutes early.",
              "Keep your phone reachable during the trip.",
            ],
      documentsToCarry:
        documentsToCarry.length > 0
          ? documentsToCarry
          : ["Government ID proof", "Booking confirmation copy"],
      importantNotes:
        importantNotes.length > 0
          ? importantNotes
          : [
              "Itinerary may change based on weather and local conditions.",
              "Hotel check-in/check-out follows property policy.",
            ],
    });

    await transporter.sendMail({
      from: config.smtpFrom,
      to: email,
      subject: `TravelMate Booking Confirmed - ${bookingReference}`,
      html: buildEmailHtml({
        fullName: fullName || "Traveler",
        email,
        phone: phone || "-",
        bookingReference,
        bookingId: bookingId || bookingReference,
        paymentId: paymentId || "-",
        packageTitle,
        destination: destination || "-",
        travelDate,
        passengers,
        totalAmount,
        travelCategory: travelCategory || "-",
        itineraryDays,
        itineraryNights,
        transportDetails: transportDetails || "-",
        activities,
        checkIn: checkIn || travelDate,
        checkOut: checkOut || "-",
        emergencyContact: emergencyContact || "+91 9342180670",
        travelGuidelines,
        documentsToCarry,
        importantNotes,
      }),
      attachments: [
        {
          filename: `TravelMate-Ticket-${bookingReference}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return res.status(200).json({ message: "Confirmation email sent" });
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
    return res.status(500).json({ message: "Failed to send confirmation email" });
  }
});

function buildEmailHtml(data: {
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
}) {
  const itineraryRows =
    data.itineraryDays.length > 0
      ? data.itineraryDays
          .map((day) => {
            const act = day.activities?.length ? day.activities.join(", ") : day.narrative || "Guided experience";
            return `<tr>
              <td style="padding:8px;border:1px solid #e5e7eb;">Day ${day.day}</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(day.title)}</td>
              <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(act)}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="3" style="padding:8px;border:1px solid #e5e7eb;">Itinerary will be shared by our team shortly.</td></tr>`;

  const nightRows =
    data.itineraryNights.length > 0
      ? data.itineraryNights
          .map(
            (night) => `<tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">Night ${night.night}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(night.accommodation)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(night.meals)}</td>
        </tr>`
          )
          .join("")
      : "";

  return `
    <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">
        <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
          <h2 style="margin:0;font-size:22px;color:#0f172a;">TravelMate</h2>
          <p style="margin:6px 0 0;color:#475569;font-size:13px;">Your journey begins with us</p>
        </div>

        <div style="padding:24px;">
          <h3 style="margin:0 0 10px;font-size:20px;color:#0f172a;">Booking Confirmed</h3>
          <p style="margin:0 0 16px;color:#334155;">Hi ${escapeHtml(data.fullName)}, your package booking is confirmed. Thank you for choosing TravelMate.</p>

          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Booking ID</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.bookingId)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Booking Ref</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.bookingReference)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Payment ID</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.paymentId)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Package</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.packageTitle)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Destination</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.destination)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Travel Category</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.travelCategory)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Travel Date</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.travelDate)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Travelers</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.passengers}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Total Paid</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">INR ${Number(data.totalAmount).toLocaleString()}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.email)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.phone)}</td></tr>
          </table>

          <h4 style="margin:20px 0 8px;color:#0f172a;">Itinerary</h4>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr>
              <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">Day</th>
              <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">Plan</th>
              <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">Experiences</th>
            </tr>
            ${itineraryRows}
          </table>

          ${
            nightRows
              ? `<h4 style="margin:20px 0 8px;color:#0f172a;">Hotel & Meals</h4>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr>
              <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">Night</th>
              <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">Hotel</th>
              <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">Meals</th>
            </tr>
            ${nightRows}
          </table>`
              : ""
          }

          <h4 style="margin:20px 0 8px;color:#0f172a;">Travel Details</h4>
          <p style="margin:0;color:#334155;font-size:14px;">Transportation: ${escapeHtml(data.transportDetails)}</p>
          <p style="margin:6px 0 0;color:#334155;font-size:14px;">Check-in: ${escapeHtml(data.checkIn)} | Check-out: ${escapeHtml(data.checkOut)}</p>
          <p style="margin:6px 0 0;color:#334155;font-size:14px;">Key activities: ${escapeHtml(data.activities.join(", ") || "As per package plan")}</p>

          <h4 style="margin:20px 0 8px;color:#0f172a;">Documents To Carry</h4>
          <ul style="margin:0 0 0 18px;padding:0;color:#334155;">
            ${(data.documentsToCarry.length ? data.documentsToCarry : ["Government ID proof", "Booking confirmation"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>

          <h4 style="margin:20px 0 8px;color:#0f172a;">Travel Guidelines</h4>
          <ul style="margin:0 0 0 18px;padding:0;color:#334155;">
            ${(data.travelGuidelines.length ? data.travelGuidelines : ["Reach departure point early", "Follow guide instructions"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>

          <h4 style="margin:20px 0 8px;color:#0f172a;">Important Notes</h4>
          <ul style="margin:0 0 0 18px;padding:0;color:#334155;">
            ${(data.importantNotes.length ? data.importantNotes : ["Itinerary timings may vary based on conditions"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>

          <div style="margin-top:20px;padding-top:14px;border-top:1px solid #e5e7eb;color:#475569;font-size:13px;">
            <p style="margin:0 0 6px;"><strong>Support:</strong> mail@travelmate.in | +91 9342180670</p>
            <p style="margin:0 0 6px;"><strong>Emergency Contact:</strong> ${escapeHtml(data.emergencyContact)}</p>
            <p style="margin:0 0 6px;"><strong>Website:</strong> <a href="${config.frontendUrl}" style="color:#0f172a;">${config.frontendUrl}</a></p>
            <p style="margin:0;">Follow us: Instagram | YouTube | LinkedIn</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateTicketPdf(data: {
  fullName: string;
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
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ensurePage = (neededHeight = 20) => {
      if (doc.y + neededHeight > doc.page.height - 50) {
        doc.addPage();
      }
    };

    doc.fontSize(22).fillColor("#0f172a").text("TravelMate Ticket", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#475569").text("Thank you for choosing TravelMate. Your journey begins with us.", {
      align: "center",
    });
    doc.moveDown(1);

    doc.fontSize(12).fillColor("#111827");
    doc.text(`Booking ID: ${data.bookingId}`);
    doc.text(`Booking Reference: ${data.bookingReference}`);
    doc.text(`Payment ID: ${data.paymentId}`);
    doc.text(`Passenger: ${data.fullName}`);
    doc.text(`Package: ${data.packageTitle}`);
    doc.text(`Destination: ${data.destination}`);
    doc.text(`Travel Category: ${data.travelCategory}`);
    doc.text(`Travel Date: ${data.travelDate}`);
    doc.text(`Travelers: ${data.passengers}`);
    doc.text(`Amount Paid: INR ${Number(data.totalAmount).toLocaleString()}`);
    doc.moveDown(0.4);
    doc.text(`Transport: ${data.transportDetails}`);
    doc.text(`Check-in: ${data.checkIn}`);
    doc.text(`Check-out: ${data.checkOut}`);
    doc.text(`Emergency Contact: ${data.emergencyContact}`);

    doc.moveDown();
    doc.fontSize(15).fillColor("#0f172a").text("Day-wise Itinerary");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#111827");
    if (data.itineraryDays.length === 0) {
      doc.text("Detailed itinerary will be shared by the TravelMate team shortly.");
    } else {
      data.itineraryDays.forEach((day) => {
        ensurePage(50);
        doc.fontSize(12).fillColor("#0f172a").text(`Day ${day.day}: ${day.title}`);
        doc.fontSize(10).fillColor("#374151");
        if (day.activities?.length) {
          day.activities.forEach((activity) => {
            ensurePage(16);
            doc.text(`• ${activity}`);
          });
        } else if (day.narrative) {
          doc.text(day.narrative);
        } else {
          doc.text("Activities as per arrival and local schedule.");
        }
        doc.moveDown(0.3);
      });
    }

    if (data.itineraryNights.length > 0) {
      ensurePage(40);
      doc.moveDown();
      doc.fontSize(15).fillColor("#0f172a").text("Hotel & Meals");
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor("#374151");
      data.itineraryNights.forEach((night) => {
        ensurePage(16);
        doc.text(`Night ${night.night}: ${night.accommodation} | Meals: ${night.meals}`);
      });
    }

    const renderList = (title: string, items: string[], fallback: string[]) => {
      ensurePage(40);
      doc.moveDown();
      doc.fontSize(14).fillColor("#0f172a").text(title);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#374151");
      const list = items.length ? items : fallback;
      list.forEach((item) => {
        ensurePage(16);
        doc.text(`• ${item}`);
      });
    };

    renderList("Documents To Carry", data.documentsToCarry, ["Government ID proof", "Booking confirmation copy"]);
    renderList("Travel Guidelines", data.travelGuidelines, ["Arrive early", "Follow guide instructions"]);
    renderList("Important Notes", data.importantNotes, ["Timings may vary due to local conditions"]);

    ensurePage(30);
    doc.moveDown();
    doc.fontSize(9).fillColor("#6b7280");
    doc.text("TravelMate Support: mail@travelmate.in | +91 9342180670");
    doc.text(`Website: ${config.frontendUrl}`);
    doc.text("Generated automatically by TravelMate.");

    doc.end();
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default router;
