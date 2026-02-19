import { Router, type Request, type Response } from "express";
import { buildPackageListQuery, getPackageById, getPackages, refreshPackageCache } from "./service/packageService";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const query = buildPackageListQuery(req.query as Record<string, unknown>);
    const response = await getPackages(query);
    return res.json(response);
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: "Failed to fetch travel packages",
      detail: process.env.NODE_ENV === "production" ? undefined : detail,
    });
  }
});

router.get("/refresh", async (req: Request, res: Response) => {
  try {
    const refreshedCount = await refreshPackageCache();
    return res.json({
      message: "Package cache refreshed",
      refreshedCount,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to refresh package cache:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: "Failed to refresh package cache",
      detail: process.env.NODE_ENV === "production" ? undefined : detail,
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ message: "Package id is required" });
    }

    const item = await getPackageById(id);
    if (!item) {
      return res.status(404).json({ message: "Package not found" });
    }
    return res.json({ package: item });
  } catch (error) {
    console.error("Failed to fetch package by id:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: "Failed to fetch package details",
      detail: process.env.NODE_ENV === "production" ? undefined : detail,
    });
  }
});

export default router;
