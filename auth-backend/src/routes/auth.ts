import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { getDb } from "../db";
import { config } from "../config/env";
import { logger } from "../utils/logger";
import { validateRegister, validateLogin } from "../middleware/validate";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../services/email.service";

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
    const email = (req.body.email || "").toLowerCase().trim();
    const { password } = req.body;
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    getDb().get("SELECT id FROM users WHERE email = ?", [email], async (err, existingUser) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (existingUser) return res.status(409).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 12);
      getDb().run(
        "INSERT INTO users (email, password, email_verified, verification_token, verification_token_expires_at) VALUES (?, ?, 0, ?, ?)",
        [email.toLowerCase(), hashedPassword, verificationToken, verificationExpiresAt],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ message: "Registration failed" });

          const token = jwt.sign({ id: this.lastID, email }, jwtSecret, jwtSignOptions);
          res.status(201).json({
            message: "User registered successfully",
            user: { id: this.lastID, email, emailVerified: false },
            token,
          });

          // Email should not block registration.
          void (async () => {
            try {
              await Promise.allSettled([
                sendWelcomeEmail({ email }),
                sendVerificationEmail({ email }, verificationToken),
              ]);
            } catch (mailError: any) {
              logger("Registration email dispatch failed:", mailError?.message || mailError);
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
  const email = (req.body.email || "").toLowerCase().trim();
  const { password } = req.body;

  console.log(`[auth/login] Attempt: ${email}`);

  getDb().get("SELECT * FROM users WHERE email = ?", [email], async (err, user: UserRow | undefined) => {
    if (err) {
      console.error("[auth/login] DB Error:", err.message);
      return res.status(500).json({ message: "Database error" });
    }
    
    if (!user) {
      console.warn(`[auth/login] Failed: User not found for ${email}`);
      return res.status(401).json({ message: "User not registered" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`[auth/login] Failed: Incorrect password for ${email}`);
      return res.status(401).json({ message: "Incorrect password" });
    }

    if (!user.email_verified) {
      console.warn(`[auth/login] Failed: Email not verified for ${email}`);
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, jwtSignOptions);
    console.log(`[auth/login] Success: ${email}`);
    
    res.json({
      message: "Login successful",
      user: { id: user.id, email: user.email, emailVerified: Boolean(user.email_verified) },
      token,
    });
  });
});

// ==================== FORGOT PASSWORD ====================
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Always return 200 to prevent email enumeration
    const successMessage = "If an account with that email exists, a password reset link has been sent.";

    getDb().get("SELECT id, email FROM users WHERE email = ?", [email], async (err, user: any) => {
      if (err) {
        console.error("[auth/forgot-password] DB Error:", err.message);
        return res.status(200).json({ message: successMessage });
      }
      if (!user) {
        console.log(`[auth/forgot-password] No user found for ${email}`);
        return res.status(200).json({ message: successMessage });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      getDb().run(
        "UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?",
        [resetToken, expiresAt, user.id],
        async (updateErr) => {
          if (updateErr) {
            console.error("[auth/forgot-password] Failed to save reset token:", updateErr.message);
            return res.status(200).json({ message: successMessage });
          }

          const resetLink = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
          console.log(`[auth/forgot-password] Reset link generated for ${email}: ${resetLink}`);

          try {
            await sendPasswordResetEmail({ email: user.email }, resetLink);
            console.log(`[auth/forgot-password] Reset email sent to ${email}`);
          } catch (mailErr: any) {
            console.error("[auth/forgot-password] Email dispatch failed:", mailErr.message);
          }

          return res.status(200).json({ message: successMessage });
        }
      );
    });
  } catch (error) {
    console.error("[auth/forgot-password] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ==================== RESET PASSWORD ====================
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    getDb().get(
      "SELECT id, email, reset_token_expires_at FROM users WHERE reset_token = ?",
      [token],
      async (err, user: any) => {
        if (err) {
          console.error("[auth/reset-password] DB Error:", err.message);
          return res.status(500).json({ message: "Database error" });
        }
        if (!user) {
          return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        const expiry = user.reset_token_expires_at ? new Date(user.reset_token_expires_at).getTime() : 0;
        if (!expiry || expiry < Date.now()) {
          return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        getDb().run(
          "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?",
          [hashedPassword, user.id],
          (updateErr) => {
            if (updateErr) {
              console.error("[auth/reset-password] Failed to update password:", updateErr.message);
              return res.status(500).json({ message: "Failed to reset password" });
            }

            console.log(`[auth/reset-password] Password reset successful for ${user.email}`);
            return res.status(200).json({ message: "Password has been reset successfully. You can now log in." });
          }
        );
      }
    );
  } catch (error) {
    console.error("[auth/reset-password] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
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
