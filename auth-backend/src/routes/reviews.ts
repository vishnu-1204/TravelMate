import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../utils/turso";

const router = Router();

// GET /api/reviews/:packageId - Fetch reviews for a package
router.get("/:packageId", async (req: Request, res: Response) => {
  const { packageId } = req.params;

  try {
    const result = await db.execute({
      sql: `SELECT r.id, r.package_id, r.user_id, r.user_name, r.rating, r.comment, r.is_verified, r.created_at,
            p.full_name, p.avatar_path
            FROM reviews r
            LEFT JOIN profiles p ON r.user_id = p.id
            WHERE r.package_id = ? ORDER BY r.created_at DESC`,
      args: [String(packageId)],
    });

    const formatted = result.rows.map((row) => ({
      id: row.id,
      package_id: row.package_id,
      user_id: row.user_id,
      user_name: row.user_name || "Traveler",
      rating: Number(row.rating),
      comment: row.comment,
      is_verified: !!row.is_verified,
      created_at: row.created_at,
      profiles: {
        full_name: row.full_name || row.user_name || "Traveler",
        avatar_path: row.avatar_path,
      },
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error("Failed to fetch reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
});

// POST /api/reviews - Submit a new review
router.post("/", async (req: Request, res: Response) => {
  const { userId, packageId, rating, comment } = req.body;

  if (!userId || !packageId || !rating) {
    return res.status(400).json({ message: "Required fields missing: userId, packageId, rating" });
  }

  try {
    // 1. Check if user has a confirmed booking for this package (optional verified purchase)
    const bookingResult = await db.execute({
      sql: "SELECT id FROM bookings WHERE user_id = ? AND package_id = ? AND booking_status = 'confirmed' LIMIT 1",
      args: [userId, packageId],
    });
    const isVerified = bookingResult.rows.length > 0 ? 1 : 0;

    // 2. Fetch the user's name from profiles
    const profileResult = await db.execute({
      sql: "SELECT full_name FROM profiles WHERE id = ? LIMIT 1",
      args: [userId],
    });
    const userName = profileResult.rows.length > 0 ? (profileResult.rows[0].full_name as string) : "Traveler";

    // 3. Insert review
    const reviewId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO reviews (id, user_id, package_id, rating, comment, is_verified, user_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [reviewId, userId, packageId, Number(rating), comment || null, isVerified, userName, createdAt],
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review: {
        id: reviewId,
        user_id: userId,
        package_id: packageId,
        rating,
        comment,
        is_verified: !!isVerified,
        created_at: createdAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to submit review:", error);
    res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
});

export default router;
