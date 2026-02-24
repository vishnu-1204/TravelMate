import { Router, Request, Response } from "express";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// This is a standalone script to verify PDF generation logic
// Run with: npx ts-node src/tests/test-pdf.ts

const mockData = {
  fullName: "TEST USER",
  email: "test@example.com",
  phone: "9876543210",
  bookingReference: "PDF-TEST-123",
  bookingId: "test-uuid-001",
  paymentId: "pay_xyz789",
  packageTitle: "Ultimate Luxury New Zealand",
  destination: "Queenstown",
  travelDate: "2026-12-01",
  passengers: 2,
  totalAmount: 450000,
  transportDetails: "Private Flight & Luxury SUV",
  itineraryDays: [
    { day: 1, title: "Arrival", narrative: "Pick up from airport and check-in to luxury lodge." },
    { day: 2, title: "Milford Sound", narrative: "Helicopter tour over the sounds with glacier landing." }
  ],
  itineraryNights: [],
  documentsToCarry: ["Passport", "Visa"],
  travelGuidelines: ["Arrive early", "Stay safe"],
  importantNotes: ["Non-refundable"],
  duration: "7 Days / 6 Nights",
  airline: "Air New Zealand",
  departureTime: "10:00 AM",
  arrivalTime: "02:00 PM",
  included: ["5-Star Accommodation", "All Meals", "Helicopter Tours", "Private Driver"],
  excluded: ["Tips", "Souvenirs", "Alcoholic Beverages"]
};

function generatePdf(data: any) {
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
    (data.included || []).slice(0, 6).forEach((item: string) => doc.text(`- ${item}`, 50));
    
    doc.y = incPos;
    (data.excluded || []).slice(0, 6).forEach((item: string) => doc.text(`- ${item}`, 300));

    doc.moveDown(2);
    yPos = doc.y;

    // Itinerary Section
    doc.fontSize(14).fillColor("#0f172a").text("Trip Itinerary Overview", 50, yPos);
    doc.moveDown(0.5);
    
    doc.fontSize(10).fillColor("#334155");
    if (data.itineraryDays.length === 0) {
      doc.text("- Detailed itinerary will be shared via email.");
    } else {
      data.itineraryDays.slice(0, 8).forEach((day: any) => {
        doc.fillColor("#3b82f6").text(`Day ${day.day}: `, { continued: true });
        doc.fillColor("#0f172a").text(day.title);
        
        if (day.narrative) {
          doc.fontSize(9).fillColor("#64748b").text(day.narrative.slice(0, 150) + "...", { indent: 15 });
        }
        doc.moveDown(0.3);
      });
    }

    doc.end();
  });
}

async function main() {
  console.log("Generating test PDF...");
  const pdf = await generatePdf(mockData);
  const outPath = path.join(__dirname, "../../test-ticket.pdf");
  fs.writeFileSync(outPath, pdf);
  console.log(`Test PDF saved to: ${outPath}`);
}

main().catch(console.error);
