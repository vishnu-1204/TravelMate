import express from "express";
import rateLimit from "express-rate-limit";
import { getDb } from "../db";
import { sendContactEmail, sendContactAutoReply } from "../services/email.service";
import { logger } from "../utils/logger";
import { z } from "zod";

const router = express.Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(1, "Phone number is required").max(20),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 contact requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages sent. Please try again after 15 minutes." },
});

router.post("/", contactRateLimiter, async (req, res) => {
  try {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: result.error.errors.map(e => ({ field: e.path[0], message: e.message })) 
      });
    }

    const { name, email, phone, subject, message } = result.data;
    const db = getDb();

    // 1. Save to Database
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)`,
        [name, email, phone, subject, message],
        (err) => {
          if (err) {
            logger("Database error saving contact message:", err.message);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // 2. Send Emails (Async, don't block response)
    sendContactEmail({ name, email, phone, subject, message }).catch(err => {
      logger("Error sending admin contact email:", err.message);
    });

    sendContactAutoReply({ name, email }).catch(err => {
      logger("Error sending contact auto-reply:", err.message);
    });

    return res.status(201).json({ message: "Thank you for contacting TravelMate. Our team will reach you soon." });
  } catch (error: any) {
    logger("Contact submission error:", error.message);
    return res.status(500).json({ message: "Internal server error. Please try again later." });
  }
});

export default router;
