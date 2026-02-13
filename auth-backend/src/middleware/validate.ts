import { Request, Response, NextFunction } from "express";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({ message: "Invalid email format" });
    return;
  }

  if (typeof password !== "string" || password.length < 6) {
    res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
    return;
  }

  if (password.length > 128) {
    res
      .status(400)
      .json({ message: "Password must be less than 128 characters" });
    return;
  }

  // Sanitize
  req.body.email = email.trim().toLowerCase();
  next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  req.body.email =
    typeof email === "string" ? email.trim().toLowerCase() : email;
  next();
};
