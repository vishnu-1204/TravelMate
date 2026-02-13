import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db";
import { config } from "../config/env";
import { validateRegister, validateLogin } from "../middleware/validate";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

// ==================== REGISTER ====================
router.post("/register", validateRegister, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    db.get(
      "SELECT id FROM users WHERE email = ?",
      [email],
      async (err, existingUser) => {
        if (err) {
          return res.status(500).json({ message: "Database error" });
        }

        if (existingUser) {
          return res.status(409).json({ message: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user
        db.run(
          "INSERT INTO users (email, password) VALUES (?, ?)",
          [email, hashedPassword],
          function (err) {
            if (err) {
              return res.status(500).json({ message: "Registration failed" });
            }

            const token = jwt.sign(
              { id: this.lastID, email },
              config.jwtSecret,
              { expiresIn: config.jwtExpiresIn }
            );

            res.status(201).json({
              message: "User registered successfully ✅",
              user: { id: this.lastID, email },
              token,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ==================== LOGIN ====================
router.post("/login", validateLogin, (req: Request, res: Response) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user: any) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.json({
        message: "Login successful ✅",
        user: { id: user.id, email: user.email },
        token,
      });
    }
  );
});

// ==================== GET PROFILE (Protected) ====================
router.get("/profile", authenticateToken, (req: AuthRequest, res: Response) => {
  db.get(
    "SELECT id, email, created_at FROM users WHERE id = ?",
    [req.user!.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    }
  );
});

// ==================== GET ALL USERS (Testing only) ====================
router.get("/users", (req: Request, res: Response) => {
  db.all(
    "SELECT id, email, created_at FROM users",
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ count: users.length, users });
    }
  );
});

export default router;
