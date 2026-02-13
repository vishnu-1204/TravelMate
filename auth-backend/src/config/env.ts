import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  jwtSecret: process.env.JWT_SECRET || "fallback_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
};
