import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { getDb } from "../db";
import { config } from "../config/env";
import { validateRegister, validateLogin } from "../middleware/validate";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { sendVerificationEmail, sendWelcomeEmail } from "../services/email.service";

const router = Router();

const jwtSecret: Secret = config.jwtSecret;
const jwtSignOptions: SignOptions = {
  expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
};

type UserRow = {
  id: number;
  email: string;
  password: string;
  email_verified: number;
  verification_token: string | null;
  verification_token_expires_at: string | null;
};

// ==================== REGISTER ====================
router.post("/register", validateRegister, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    getDb().get("SELECT id FROM users WHERE email = ?", [email], async (err, existingUser) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (existingUser) return res.status(409).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 12);
      getDb().run(
        "INSERT INTO users (email, password, email_verified, verification_token, verification_token_expires_at) VALUES (?, ?, 1, ?, ?)",
        [email, hashedPassword, verificationToken, verificationExpiresAt],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ message: "Registration failed" });

          const token = jwt.sign({ id: this.lastID, email }, jwtSecret, jwtSignOptions);
          res.status(201).json({
            message: "User registered successfully",
            user: { id: this.lastID, email, emailVerified: true },
            token,
          });

          // Email should not block registration.
          void (async () => {
            try {
              await Promise.allSettled([
                sendWelcomeEmail({ email }),
                sendVerificationEmail({ email }, verificationToken),
              ]);
            } catch (mailError) {
              console.error("Registration email dispatch failed:", mailError);
            }
          })();
        }
      );
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ==================== VERIFY EMAIL ====================
router.get("/verify", (req: Request, res: Response) => {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).json({ message: "Verification token is required" });

  getDb().get("SELECT id, email_verified, verification_token_expires_at FROM users WHERE verification_token = ?", [token], (err, user: any) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });
    if (user.email_verified) return res.status(200).json({ message: "Email already verified" });

    const expiry = user.verification_token_expires_at ? new Date(user.verification_token_expires_at).getTime() : 0;
    if (!expiry || expiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    const verifiedAt = new Date().toISOString();
    getDb().run(
      "UPDATE users SET email_verified = 1, verified_at = ?, verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?",
      [verifiedAt, user.id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ message: "Failed to verify email" });
        return res.status(200).json({ message: "Email verified successfully" });
      }
    );
  });
});

// ==================== LOGIN ====================
router.post("/login", validateLogin, (req: Request, res: Response) => {
  const { email, password } = req.body;

  getDb().get("SELECT * FROM users WHERE email = ?", [email], async (err, user: UserRow | undefined) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });
    if (!user.email_verified) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, jwtSignOptions);
    res.json({
      message: "Login successful",
      user: { id: user.id, email: user.email, emailVerified: Boolean(user.email_verified) },
      token,
    });
  });
});

// ==================== GET PROFILE (Protected) ====================
router.get("/profile", authenticateToken, (req: AuthRequest, res: Response) => {
  getDb().get("SELECT id, email, email_verified, verified_at, created_at FROM users WHERE id = ?", [req.user!.id], (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  });
});

// ==================== GET ALL USERS (Protected) ====================
router.get("/users", authenticateToken, (req: Request, res: Response) => {
  getDb().all("SELECT id, email, email_verified, verified_at, created_at FROM users", [], (err, users: Array<{ email: string }>) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ count: users.length, users });
  });
});

export default router;
