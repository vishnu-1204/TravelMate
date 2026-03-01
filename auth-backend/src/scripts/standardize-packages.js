
const fs = require('fs');
const path = require('path');

const packagesPath = path.join(__dirname, '..', '..', '..', 'src', 'data', 'packages.json');
const rawData = fs.readFileSync(packagesPath, 'utf8');
let packages = JSON.parse(rawData);

console.log(`Original Count: ${packages.length}`);

const CATEGORIES = ['south', 'north', 'solo', 'honeymoon', 'educational', 'international'];

const SOUTH_KEYWORDS = ['kerala', 'munnar', 'alleppey', 'wayanad', 'thekkady', 'kovalam', 'kochi', 'varkala', 'tamil nadu', 'karnataka', 'ooty', 'kodaikanal', 'coorg', 'mysore', 'hampi', 'pondicherry', 'madurai', 'kanyakumari', 'tirupati', 'andhra', 'telangana', 'hyderabad', 'vizag', 'chikmagalur', 'gokarna', 'udupi'];
const NORTH_KEYWORDS = ['manali', 'shimla', 'kashmir', 'srinagar', 'ladakh', 'leh', 'gulmarg', 'pahalgam', 'rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'delhi', 'agra', 'rishikesh', 'haridwar', 'mussoorie', 'nainital', 'auli', 'corbett', 'himachal', 'uttarakhand', 'punjab', 'amritsar', 'chandigarh'];
const EDUCATIONAL_KEYWORDS = ['educational', 'school', 'college', 'university', 'study', 'learning', 'academy', 'campus', 'historical tour', 'heritage walk', 'museum tour', 'industrial visit', 'field trip'];
const HONEYMOON_KEYWORDS = ['honeymoon', 'romantic', 'couple', 'anniversary', 'candlelight', 'getaway for couples'];
const SOLO_KEYWORDS = ['solo', 'backpacking', 'trekking', 'adventure', 'independent', 'single traveler'];

function normalizePackage(pkg) {
    const title = (pkg.title || "").toLowerCase();
    const destination = (pkg.destination || "").toLowerCase();
    const location = (pkg.location || "").toLowerCase();
    const description = (pkg.description || "").toLowerCase();
    const shortDescription = (pkg.shortDescription || "").toLowerCase();
    const haystack = `${title} ${destination} ${location} ${description} ${shortDescription}`;
    const categoriesArray = Array.isArray(pkg.categories) ? pkg.categories.map(c => c.toLowerCase()) : [];

    let category = "north"; // Default

    // Priority Mapping
    if (categoriesArray.includes('honeymoon') || HONEYMOON_KEYWORDS.some(kw => haystack.includes(kw))) {
        category = 'honeymoon';
    } else if (categoriesArray.includes('educational') || EDUCATIONAL_KEYWORDS.some(kw => haystack.includes(kw))) {
        category = 'educational';
    } else if (categoriesArray.includes('solo') || SOLO_KEYWORDS.some(kw => haystack.includes(kw))) {
        category = 'solo';
    } else if (SOUTH_KEYWORDS.some(kw => haystack.includes(kw))) {
        category = 'south';
    } else if (NORTH_KEYWORDS.some(kw => haystack.includes(kw))) {
        category = 'north';
    } else if (pkg.country && pkg.country.toLowerCase() !== 'india') {
        category = 'international';
    }

    // Final overrides/fallback
    if (category === 'domestic' || category === 'indian') {
        if (SOUTH_KEYWORDS.some(kw => haystack.includes(kw))) category = 'south';
        else category = 'north';
    }

    return {
        ...pkg,
        category: category,
        categories: [category],
        categoryLabel: category.charAt(0).toUpperCase() + category.slice(1)
    };
}

const cleanedPackages = packages.map(normalizePackage);

fs.writeFileSync(packagesPath, JSON.stringify(cleanedPackages, null, 2));

const finalCounts = {};
cleanedPackages.forEach(p => finalCounts[p.category] = (finalCounts[p.category] || 0) + 1);
console.log("Final Counts:", finalCounts);
console.log("Standardization Complete.");
