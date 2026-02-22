import { Router, type Request, type Response } from "express";
import { config } from "../../config/env";
import {
  buildPackageListQuery,
  getPackageById,
  getPackageCategoryCounts,
  getPackageHistory,
  getPackages,
  refreshPackageCache,
  setPackageCategories,
  setPackageImage,
} from "./service/packageService";
import { PACKAGE_CATEGORIES, type PackageCategory } from "./types";

const router = Router();

const validCategories = new Set<PackageCategory>(PACKAGE_CATEGORIES);

const isAdminRequest = (req: Request) => {
  if (!config.packageAdminToken) return true;
  const headerToken = req.header("x-admin-token");
  return headerToken === config.packageAdminToken;
};

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

router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await getPackageCategoryCounts();
    return res.json({ categories });
  } catch (error) {
    console.error("Failed to fetch category counts:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: "Failed to fetch category counts",
      detail: process.env.NODE_ENV === "production" ? undefined : detail,
    });
  }
});

router.patch("/:id/categories", async (req: Request, res: Response) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(401).json({ message: "Unauthorized admin request" });
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ message: "Package id is required" });
    }

    const body = req.body as { categories?: string[] };
    const parsed =
      body.categories
        ?.map((item) => item.toLowerCase().trim())
        .filter((item): item is PackageCategory => validCategories.has(item as PackageCategory)) || [];

    if (!parsed.length) {
      return res.status(400).json({ message: "Provide at least one valid category" });
    }

    const updated = await setPackageCategories(id, parsed);
    if (!updated) {
      return res.status(404).json({ message: "Package not found" });
    }

    return res.json({ package: updated });
  } catch (error) {
    console.error("Failed to override package categories:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: "Failed to override package categories",
      detail: process.env.NODE_ENV === "production" ? undefined : detail,
    });
  }
});

router.patch("/:id/image", async (req: Request, res: Response) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(401).json({ message: "Unauthorized admin request" });
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ message: "Package id is required" });
    }

    const body = req.body as { imageUrl?: string; imageAlt?: string };
    if (!body.imageUrl || typeof body.imageUrl !== "string") {
      return res.status(400).json({ message: "Provide a valid imageUrl" });
    }

    const updated = await setPackageImage(id, body.imageUrl, body.imageAlt);
    if (!updated) {
      return res.status(404).json({ message: "Package not found" });
    }

    return res.json({ package: updated });
  } catch (error) {
    console.error("Failed to override package image:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: "Failed to override package image",
      detail: process.env.NODE_ENV === "production" ? undefined : detail,
    });
  }
});

router.get("/:id/history", async (req: Request, res: Response) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(401).json({ message: "Unauthorized admin request" });
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ message: "Package id is required" });
    }

    const history = await getPackageHistory(id);
    return res.json({ history });
  } catch (error) {
    console.error("Failed to fetch package history:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: "Failed to fetch package history",
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
