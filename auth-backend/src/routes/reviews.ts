import { Router, Request, Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/env";

const router = Router();

let cachedClient: SupabaseClient | null = null;

const hasSupabase = () => Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

const getSupabase = () => {
  if (!hasSupabase()) return null;
  if (!cachedClient) {
    cachedClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
};

// GET /api/reviews/:packageId - Fetch reviews for a package
router.get("/:packageId", async (req: Request, res: Response) => {
  const { packageId } = req.params;
  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({ message: "Supabase not configured" });
  }

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        profiles (
          full_name,
          avatar_path
        )
      `)
      .eq("package_id", packageId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Failed to fetch reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
});

// POST /api/reviews - Submit a new review
router.post("/", async (req: Request, res: Response) => {
  const { userId, packageId, rating, comment } = req.body;
  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({ message: "Supabase not configured" });
  }

  if (!userId || !packageId || !rating) {
    return res.status(400).json({ message: "Required fields missing: userId, packageId, rating" });
  }

  try {
    // Check if user has a confirmed booking for this package (optional verified purchase)
    const { data: bookings, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", userId)
      .eq("package_id", packageId)
      .eq("booking_status", "confirmed")
      .limit(1);

    const isVerified = !bookingError && bookings && bookings.length > 0;

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        package_id: packageId,
        rating,
        comment,
        is_verified_purchase: isVerified,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: "Review submitted successfully", review: data });
  } catch (error: any) {
    console.error("Failed to submit review:", error);
    res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
});

export default router;
