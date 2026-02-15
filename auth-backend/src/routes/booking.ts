import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { config } from "../config/env";

const router = Router();

type BookingEmailBody = {
  email?: string;
  fullName?: string;
  bookingReference?: string;
  packageTitle?: string;
  destination?: string;
  travelDate?: string;
  passengers?: number;
  totalAmount?: number;
};

router.post("/confirmation-email", async (req: Request, res: Response) => {
  const {
    email,
    fullName,
    bookingReference,
    packageTitle,
    destination,
    travelDate,
    passengers,
    totalAmount,
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
      packageTitle,
      destination: destination || "-",
      travelDate,
      passengers,
      totalAmount,
    });

    await transporter.sendMail({
      from: config.smtpFrom,
      to: email,
      subject: `TravelMate Booking Confirmed - ${bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Your booking is confirmed!</h2>
          <p>Hi ${escapeHtml(fullName || "Traveler")},</p>
          <p>Thank you for booking with TravelMate. Your order has been confirmed.</p>
          <ul>
            <li><strong>Booking Ref:</strong> ${escapeHtml(bookingReference)}</li>
            <li><strong>Package:</strong> ${escapeHtml(packageTitle)}</li>
            <li><strong>Travel Date:</strong> ${escapeHtml(travelDate)}</li>
            <li><strong>Passengers:</strong> ${passengers}</li>
            <li><strong>Total Paid:</strong> INR ${Number(totalAmount).toLocaleString()}</li>
          </ul>
          <p>Your ticket PDF is attached with this email for download.</p>
          <p>You can also check all bookings here:</p>
          <p><a href="${config.frontendUrl}/my-bookings">${config.frontendUrl}/my-bookings</a></p>
          <p>Regards,<br/>TravelMate Team</p>
        </div>
      `,
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

function generateTicketPdf(data: {
  fullName: string;
  bookingReference: string;
  packageTitle: string;
  destination: string;
  travelDate: string;
  passengers: number;
  totalAmount: number;
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(24).text("TravelMate Ticket", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Passenger Name: ${data.fullName}`);
    doc.text(`Booking Reference: ${data.bookingReference}`);
    doc.text(`Package: ${data.packageTitle}`);
    doc.text(`Destination: ${data.destination}`);
    doc.text(`Travel Date: ${data.travelDate}`);
    doc.text(`Passengers: ${data.passengers}`);
    doc.text(`Total Paid: INR ${Number(data.totalAmount).toLocaleString()}`);
    doc.moveDown();
    doc.text("This is your official TravelMate e-ticket.", { align: "left" });
    doc.text("Please carry a valid ID proof during travel.", { align: "left" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#6b7280").text("Generated automatically by TravelMate.");

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
