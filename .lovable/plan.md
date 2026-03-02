

## Fix Image Mapping for Travel Package Cards

### Problem Summary

The package cards are showing generic/hardcoded images instead of unique, destination-specific images from the Amadeus API. There are also build errors in the test file that need fixing.

### Root Causes Identified

1. **Amadeus API calls missing `view=FULL`**: The Activities and POI API calls don't include the `view=FULL` parameter, so image URLs may not be returned in responses.

2. **Frontend `PackageImage` component overrides API images**: The `shouldUseDynamicImage()` function in `PackageImage.tsx` replaces valid Amadeus-sourced images with hardcoded Unsplash fallbacks because it only trusts URLs containing `w=1200` or from Pexels.

3. **No unique key differentiation for Amadeus image sources**: The `imageSource` field uses `"admin"` as a placeholder for all Amadeus-sourced images (activities, POI, hotels), making it impossible to distinguish them from actual admin-uploaded images.

4. **Duplicate line in PackageCard**: The `shortDescription` paragraph is rendered twice (lines 100-101 in PackageCard.tsx).

5. **Build errors in validate.test.ts**: TypeScript errors where `.message` is accessed without narrowing the `ValidationResult` union type.

### Changes

**1. Backend: Add `view=FULL` to Amadeus Activity and POI API calls**
- File: `auth-backend/src/modules/packages/provider/amadeusProvider.ts`
- Add `url.searchParams.set("view", "FULL")` to both `getAmadeusActivityImage()` and `getAmadeusPoiImage()` functions
- This ensures the API actually returns image URLs in responses

**2. Frontend: Stop overriding valid Amadeus images**
- File: `src/components/common/PackageImage.tsx`
- Update `shouldUseDynamicImage()` to also trust Amadeus-sourced image URLs (not just Unsplash `w=1200` and Pexels)
- Add checks for common Amadeus image URL patterns so they pass through without being replaced by fallbacks

**3. Fix duplicate shortDescription in PackageCard**
- File: `src/components/packages/PackageCard.tsx`
- Remove the duplicate `<p>` tag rendering `shortDescription` twice

**4. Fix validate.test.ts build errors**
- File: `src/test/validate.test.ts`
- Lines 47, 53, 59, 75, 82 already have proper narrowing with `if (!result.valid)` guards -- but TypeScript is complaining because these lines access `.message` directly without the guard. The existing guards are actually correct and present. The issue is that lines reference `result.message` outside the guard on some lines. Will verify and fix the specific line references.

### Technical Details

**Amadeus Image Priority Chain** (backend, already mostly implemented):
1. Amadeus Tours & Activities API -> `item.pictures[0]`
2. Amadeus Points of Interest API -> `item.pictures[0]`
3. Amadeus Hotel Search API -> `item.hotel.media[0].uri`
4. Pexels API (if key configured)
5. Curated destination-specific Unsplash images
6. Category fallback images

**Frontend Image Trust Logic** (the key fix):
```text
Current: Only trusts Unsplash URLs with w=1200 and Pexels URLs
Fixed:   Also trusts any non-placeholder, non-generic URL (including Amadeus-sourced)
```

The `shouldUseDynamicImage()` function will be updated to return `false` (meaning "use the provided image as-is") for any URL that isn't a known generic placeholder, rather than only for specific URL patterns.

