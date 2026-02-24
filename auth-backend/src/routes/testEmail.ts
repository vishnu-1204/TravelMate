import { Router, Request, Response } from "express";
import { sendTestEmail } from "../services/email.service";

const router = Router();

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

router.get("/test-email", async (req: Request, res: Response) => {
  const to = String(req.query.to || "").trim().toLowerCase();
  if (!to || !isValidEmail(to)) {
    return res.status(400).json({ message: "Valid `to` query param is required. Example: /api/test-email?to=user@example.com" });
  }

  try {
    await sendTestEmail(to);
    return res.status(200).json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("GET /api/test-email failed:", error);
    return res.status(500).json({ message: "Failed to send test email" });
  }
});

export default router;
