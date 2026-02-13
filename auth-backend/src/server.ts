import express from "express";
import db from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const SECRET = "mysecretkey";

// ================= CREATE USERS TABLE =================
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)
`);

// ================= HOME ROUTE =================
app.get("/users", (req, res) => {
  res.send("Server working 🚀");
});

// ================= REGISTER =================
app.get("/register", (req, res) => {
  res.send("Register API working");
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ message: "User already exists" });
        }

        return res.status(201).json({
          message: "User registered successfully ✅",
          userId: this.lastID
        });
      }
    );

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user: any) => {

      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).json({ message: "Wrong password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login successful",
        token
      });
    }
  );
});

// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});
