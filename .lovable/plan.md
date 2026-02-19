

## AI-Generated Travel Packages

Build a system where Lovable AI generates realistic travel packages on demand and stores them in your database, giving you unlimited packages without manual data entry.

### How It Works

1. **Backend function** receives a request (e.g., "Generate 5 adventure packages for Southeast Asia")
2. **Lovable AI** (Gemini Flash) generates complete package data matching your existing structure (title, destination, price, itinerary, etc.)
3. **Packages are saved** to a new `packages` table in your database
4. **Your existing UI** reads from both the JSON file (existing packages) and the database (AI-generated ones) seamlessly

### What Gets Built

**1. Database Table: `packages`**
- Stores AI-generated packages with all the same fields as your JSON packages (title, destination, price, itinerary, etc.)
- Public read access (no auth needed to browse), admin-level insert

**2. Backend Function: `generate-packages`**
- Accepts: category, destination (optional), and count (how many to generate)
- Uses Lovable AI (google/gemini-3-flash-preview) with tool calling to output structured package data
- Saves generated packages to the database
- Returns the created packages

**3. Admin "Generate Packages" UI**
- A simple page/section (accessible to logged-in users or admin) with:
  - Category dropdown (international, adventure, honeymoon, etc.)
  - Optional destination input (e.g., "Thailand", "Iceland")
  - Count selector (1-10 packages)
  - "Generate" button with loading state
- Shows generated packages after creation

**4. Updated Packages API Layer**
- `packagesApi.ts` updated to fetch from both the local JSON and the database
- Merged results appear seamlessly in the existing Packages page with all filtering/sorting working

### Technical Details

- **AI Model**: `google/gemini-3-flash-preview` (fast, no API key needed)
- **Edge Function**: `supabase/functions/generate-packages/index.ts` using tool calling for structured JSON output
- **Database**: New `packages` table with columns matching `TravelPackage` type
- **No UI changes** to existing Packages page, PackageDetails, or PackageCard -- they'll display database packages alongside JSON ones automatically
- **Image handling**: AI will select relevant Unsplash URLs for package images based on destination

