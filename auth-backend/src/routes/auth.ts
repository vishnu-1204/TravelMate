import { Router, Request, Response } from "express";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../utils/turso";
import { config } from "../config/env";
import { logger } from "../utils/logger";
import { validateRegister, validateLogin } from "../middleware/validate";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/email.service";

const router = Router();

const jwtSecret: Secret = config.jwtSecret;
const jwtSignOptions: SignOptions = {
  expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
};

// ==================== REGISTER ====================
router.post("/register", validateRegister, async (req: Request, res: Response) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const { password, name } = req.body;

    // 1. Check if user already exists
    const userCheck = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });

    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    // 2. Hash password and generate UUID
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = crypto.randomUUID();

    // 3. Insert user and profile inside a transaction or separately
    await db.execute({
      sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      args: [userId, email, passwordHash],
    });

    await db.execute({
      sql: "INSERT INTO profiles (id, full_name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [userId, name || null],
    });

    // 4. Issue signed local JWT
    const token = jwt.sign({ id: userId, email }, jwtSecret, jwtSignOptions);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: userId,
        email,
        emailVerified: true,
        user_metadata: {
          full_name: name || null,
        },
      },
      token,
    });

    // 5. Send welcome email asynchronously
    void (async () => {
      try {
        await sendWelcomeEmail({ email, name });
      } catch (mailError: any) {
        logger("Welcome email dispatch failed:", mailError?.message || mailError);
      }
    })();
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// ==================== VERIFY EMAIL ====================
router.get("/verify", (req: Request, res: Response) => {
  return res.status(200).json({ message: "Email verified successfully" });
});

// ==================== LOGIN ====================
router.post("/login", validateLogin, async (req: Request, res: Response) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const { password } = req.body;

  console.log(`[auth/login] Attempt: ${email}`);

  try {
    // 1. Fetch user by email
    const result = await db.execute({
      sql: "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });

    if (result.rows.length === 0) {
      console.warn(`[auth/login] Failed: User not found for ${email}`);
      return res.status(401).json({ message: "Incorrect password or email" });
    }

    const dbUser = result.rows[0] as unknown as { id: string; email: string; password_hash: string };

    // 2. Match password hash
    const isMatch = await bcrypt.compare(password, dbUser.password_hash);
    if (!isMatch) {
      console.warn(`[auth/login] Failed: Password mismatch for ${email}`);
      return res.status(401).json({ message: "Incorrect password or email" });
    }

    // 3. Fetch user profile for login payload
    const profileResult = await db.execute({
      sql: "SELECT full_name FROM profiles WHERE id = ? LIMIT 1",
      args: [dbUser.id],
    });

    const fullName = profileResult.rows.length > 0 ? (profileResult.rows[0].full_name as string) : null;

    // 4. Issue signed token
    const token = jwt.sign({ id: dbUser.id, email: dbUser.email }, jwtSecret, jwtSignOptions);
    console.log(`[auth/login] Success: ${email}`);

    res.json({
      message: "Login successful",
      user: {
        id: dbUser.id,
        email: dbUser.email,
        emailVerified: true,
        user_metadata: {
          full_name: fullName,
        },
      },
      token,
    });
  } catch (err: any) {
    console.error("[auth/login] Error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ==================== FORGOT PASSWORD ====================
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const successMessage = "If an account with that email exists, a password reset link has been sent.";

    // 1. Find user in Turso
    const result = await db.execute({
      sql: "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });

    if (result.rows.length === 0) {
      console.log(`[auth/forgot-password] No user found for ${email}`);
      return res.status(200).json({ message: successMessage });
    }

    const dbUser = result.rows[0] as unknown as { id: string; email: string };

    // 2. Generate a stateless reset token signed by our local JWT secret, valid for 1 hour
    const resetToken = jwt.sign({ email: dbUser.email, type: "password-reset" }, jwtSecret, { expiresIn: "1h" });

    const resetLink = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    console.log(`[auth/forgot-password] Reset link generated for ${email}: ${resetLink}`);

    try {
      await sendPasswordResetEmail({ email: dbUser.email }, resetLink);
      console.log(`[auth/forgot-password] Reset email sent to ${email}`);
    } catch (mailErr: any) {
      console.error("[auth/forgot-password] Email dispatch failed:", mailErr.message);
    }

    return res.status(200).json({ message: successMessage });
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

    // 1. Verify the stateless reset token
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
      if (decoded.type !== "password-reset" || !decoded.email) {
        throw new Error("Invalid token type");
      }
    } catch (jwtErr) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // 2. Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Update password in Turso
    const updateResult = await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE email = ?",
      args: [passwordHash, decoded.email.toLowerCase()],
    });

    if (updateResult.rowsAffected === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    console.log(`[auth/reset-password] Password reset successful for ${decoded.email}`);
    return res.status(200).json({ message: "Password has been reset successfully. You can now log in." });
  } catch (error) {
    console.error("[auth/reset-password] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ==================== GET PROFILE (Protected) ====================
router.get("/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Join users and profiles table
    const result = await db.execute({
      sql: `SELECT u.id, u.email, u.created_at, 
            p.full_name, p.phone, p.aadhaar_hash, p.aadhaar_last4, p.date_of_birth, p.gender, 
            p.address, p.city, p.state, p.country, p.emergency_contact_name, p.emergency_contact_phone, 
            p.alternate_email, p.occupation, p.bio, p.avatar_path
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.id 
            WHERE u.id = ? LIMIT 1`,
      args: [userId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const row = result.rows[0] as unknown as Record<string, any>;

    res.json({
      user: {
        id: row.id,
        email: row.email,
        emailVerified: true,
        user_metadata: {
          full_name: row.full_name,
          phone: row.phone,
          profile_details: {
            full_name: row.full_name || "",
            phone: row.phone || "",
            aadhaar_last4: row.aadhaar_last4 || "",
            aadhaar_hash: row.aadhaar_hash || "",
            date_of_birth: row.date_of_birth || "",
            gender: row.gender || "",
            address: row.address || "",
            city: row.city || "",
            state: row.state || "",
            country: row.country || "",
            emergency_contact_name: row.emergency_contact_name || "",
            emergency_contact_phone: row.emergency_contact_phone || "",
            alternate_email: row.alternate_email || "",
            occupation: row.occupation || "",
            bio: row.bio || "",
            avatar_path: row.avatar_path || "",
          },
        },
      },
    });
  } catch (err) {
    console.error("Fetch profile database error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// ==================== UPDATE PROFILE (Protected - PUT) ====================
router.put("/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      full_name,
      phone,
      aadhaar_hash,
      aadhaar_last4,
      date_of_birth,
      gender,
      address,
      city,
      state,
      country,
      emergency_contact_name,
      emergency_contact_phone,
      alternate_email,
      occupation,
      bio,
      avatar_path,
    } = req.body;

    // Upsert profile record
    await db.execute({
      sql: `INSERT INTO profiles (
              id, full_name, phone, aadhaar_hash, aadhaar_last4, date_of_birth, gender,
              address, city, state, country, emergency_contact_name, emergency_contact_phone,
              alternate_email, occupation, bio, avatar_path, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              full_name = excluded.full_name,
              phone = excluded.phone,
              aadhaar_hash = excluded.aadhaar_hash,
              aadhaar_last4 = excluded.aadhaar_last4,
              date_of_birth = excluded.date_of_birth,
              gender = excluded.gender,
              address = excluded.address,
              city = excluded.city,
              state = excluded.state,
              country = excluded.country,
              emergency_contact_name = excluded.emergency_contact_name,
              emergency_contact_phone = excluded.emergency_contact_phone,
              alternate_email = excluded.alternate_email,
              occupation = excluded.occupation,
              bio = excluded.bio,
              avatar_path = excluded.avatar_path,
              updated_at = CURRENT_TIMESTAMP`,
      args: [
        userId,
        full_name || null,
        phone || null,
        aadhaar_hash || null,
        aadhaar_last4 || null,
        date_of_birth || null,
        gender || null,
        address || null,
        city || null,
        state || null,
        country || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        alternate_email || null,
        occupation || null,
        bio || null,
        avatar_path || null,
      ],
    });

    res.json({
      message: "Profile updated successfully",
      profile: {
        full_name,
        phone,
        aadhaar_last4,
        date_of_birth,
        gender,
        address,
        city,
        state,
        country,
        emergency_contact_name,
        emergency_contact_phone,
        alternate_email,
        occupation,
        bio,
        avatar_path,
      },
    });
  } catch (err) {
    console.error("Update profile database error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// ==================== DELETE PROFILE (Protected - DELETE) ====================
router.delete("/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.execute({
      sql: "DELETE FROM profiles WHERE id = ?",
      args: [userId],
    });
    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [userId],
    });
    res.json({ message: "Account and profile deleted successfully" });
  } catch (err) {
    console.error("Delete profile database error:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
});


// ==================== GET ALL USERS (Protected) ====================
router.get("/users", authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await db.execute("SELECT id, email, created_at FROM users");
    const mappedUsers = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      email_verified: 1,
      verified_at: row.created_at,
      created_at: row.created_at,
    }));

    res.json({ count: mappedUsers.length, users: mappedUsers });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

export default router;
