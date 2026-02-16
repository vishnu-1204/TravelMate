import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

type PackageItinerary = {
  days: { day: number; title: string; activities: string[] }[];
  nights: { night: number; accommodation: string; meals: string }[];
};

type TravelPackage = {
  id: string;
  packageId: string;
  category: string;
  categoryLabel: string;
  title: string;
  destination: string;
  location: string;
  duration: string;
  durationDays: number;
  price: number;
  discount: number;
  rating: number;
  reviews: number;
  shortDescription: string;
  inclusions: string[];
  exclusions: string[];
  imageUrl: string;
  availableDates: string[];
  image: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  itinerary?: PackageItinerary;
};

const packagesPath = path.resolve(__dirname, "../../../src/data/packages.json");

const loadPackages = (): TravelPackage[] => {
  const raw = fs.readFileSync(packagesPath, "utf-8");
  return JSON.parse(raw) as TravelPackage[];
};

const matchesSearch = (pkg: TravelPackage, query: string) => {
  const normalized = query.toLowerCase().trim();
  return (
    pkg.title.toLowerCase().includes(normalized) ||
    pkg.destination.toLowerCase().includes(normalized) ||
    pkg.location.toLowerCase().includes(normalized) ||
    pkg.category.toLowerCase().includes(normalized)
  );
};

router.get("/", (req: Request, res: Response) => {
  try {
    const category = String(req.query.category || "").trim().toLowerCase();
    const q = String(req.query.q || "").trim();
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const limit = Math.max(Number(req.query.limit) || 0, 0);
    const sortBy = String(req.query.sortBy || "rating").trim().toLowerCase();
    const sortOrder = String(req.query.sortOrder || "desc").trim().toLowerCase();

    let packages = loadPackages();

    if (category) {
      packages = packages.filter((pkg) => pkg.category.toLowerCase() === category);
    }

    if (q) {
      packages = packages.filter((pkg) => matchesSearch(pkg, q));
    }

    if (!Number.isNaN(minPrice) && minPrice > 0) {
      packages = packages.filter((pkg) => pkg.price >= minPrice);
    }

    if (!Number.isNaN(maxPrice) && maxPrice > 0) {
      packages = packages.filter((pkg) => pkg.price <= maxPrice);
    }

    const direction = sortOrder === "asc" ? 1 : -1;
    packages.sort((a, b) => {
      if (sortBy === "price") {
        return (a.price - b.price) * direction;
      }
      if (sortBy === "duration" || sortBy === "durationdays") {
        return (a.durationDays - b.durationDays) * direction;
      }
      return (a.rating - b.rating) * direction;
    });

    const total = packages.length;
    const paged = limit > 0 ? packages.slice(offset, offset + limit) : packages;

    res.json({
      count: paged.length,
      total,
      offset,
      limit: limit > 0 ? limit : null,
      sortBy,
      sortOrder: direction === 1 ? "asc" : "desc",
      packages: paged,
    });
  } catch (error) {
    console.error("Failed to load packages:", error);
    res.status(500).json({ message: "Failed to load packages" });
  }
});

router.get("/:id", (req: Request, res: Response) => {
  try {
    const packages = loadPackages();
    const pkg = packages.find((item) => item.id === req.params.id);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    return res.json({ package: pkg });
  } catch (error) {
    console.error("Failed to load package:", error);
    return res.status(500).json({ message: "Failed to load package" });
  }
});

export default router;
