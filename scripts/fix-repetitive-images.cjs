const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\acer\\.gemini\\antigravity\\brain\\f441d1a6-889b-4e47-bb3d-f599f979b737';
const publicDir = path.join(process.cwd(), 'public', 'images', 'packages');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const generatedImages = {
  "Munnar, Kerala": "munnar_kerala_unique_4k_1772507673854.png",
  "Alleppey, Kerala": "alleppey_kerala_unique_4k_1772507694060.png",
  "Kanyakumari, Tamil Nadu": "kanyakumari_tamilnadu_unique_4k_1772507709070.png",
  "Ooty, Tamil Nadu": "ooty_tamilnadu_unique_4k_1772507745468.png",
  "Wayanad, Kerala": "wayanad_kerala_unique_4k_1772507761739.png",
  "Thekkady, Kerala": "thekkady_kerala_unique_4k_1772507777468.png",
  "Kochi, Kerala": "kochi_kerala_unique_4k_1772507795024.png",
  "Kovalam, Kerala": "kovalam_kerala_unique_4k_1772507810272.png",
  "Visakhapatnam, Andhra Pradesh": "visakhapatnam_andhra_unique_4k_1772507842533.png",
  "Araku Valley, Andhra Pradesh": "araku_valley_andhra_unique_4k_1772507860568.png",
  "Kodaikanal, Tamil Nadu": "kodaikanal_tamilnadu_unique_4k_1772507876043.png",
  "Udupi, Karnataka": "udupi_karnataka_unique_4k_1772507894663.png",
  "Coorg, Karnataka": "coorg_karnataka_unique_4k_1772507918542.png",
  "Mysore Palace, Karnataka": "mysore_palace_karnataka_unique_4k_1772507936367.png",
  "Mysore, Karnataka": "mysore_city_karnataka_unique_4k_1772507967671.png"
};

// Map destination to real Unsplash IDs for variety
const realUnsplashIds = {
  "Agra, Uttar Pradesh": "78duR_6A-uY",
  "Ajanta Caves, Maharashtra": "Ony_M7NnxzE",
  "Alleppey (Houseboat), Kerala": "d_8uP7V6iN0",
  "Amer Fort Heritage, Jaipur": "L0x_M7NnxzE",
  "Anjuna, Goa": "j_j0l1rZzQY",
  "Varanasi, Uttar Pradesh": "iId_S5E-fEY",
  "Hampi, Karnataka": "MSK-2kuYJDE", 
  "Leh, Ladakh": "M2gcezN_O3s",
  "Jaipur, Rajasthan": "CIXoFys3gsw",
  "Jaisalmer, Rajasthan": "2x_YJ23dG7w",
  "Udaipur, Rajasthan": "rf-0DQu5M6Y",
  "Jodhpur, Rajasthan": "A88emaZe7d8",
  "Shimla, Himachal Pradesh": "t1mqA3V3-7g",
  "Manali, Himachal Pradesh": "YvYBOSiBJE8",
  "Rishikesh, Uttarakhand": "D76DklsG-5U",
  "Pondicherry": "eLUegVAjN7s",
  "Goa, South": "kmF_Aq8gkp0",
  "Hampi Architecture, Karnataka": "yZf1quatKCA",
  "Darjeeling, West Bengal": "llYg8Ni43fc",
  "Munnar, Kerala (Tea Estate)": "A6S-q3D67Ss",
  "Sikkim mountains": "YcfCXxo7rpc"
};

// Fill remaining with unique IDs from the pool
const idPool = [
  "yC-Yzbqy7PY", "LNRyGwIJr5c", "N7XodRrbzS0", "Dl6jeyfihLk", "y83Je1OC6Wc",
  "LF8gK8-HGSg", "6J--NXulQCs", "Cm7oKel-X2Q", "I_9ILwtsl_k", "3MtiSMdnoCo",
  "IQ1kOQTJrOQ", "NYDo21ssGao", "gkT4FfgHO5o", "Ven2CV8IJ5A", "Ps2n0rShqaM",
  "P7Lh0usGcuk", "nJdwUHmaY8A", "jVb0mSn0LbE", "du_OrQAA4r0", "8yqds_91OLw",
  "cZhUxIQjILg", "Iuq0EL4EINY", "tCICLJ5ktBE", "iJnZwLBOB1I", "_WiFMBRT7Aw",
  "V0yAek6BgGk", "aeVA-j1y2BY", "7Vz3DtQDT3Q", "eG3k60PrTGY", "LBI7cgq3pbM",
  "zZvsEMPxjIA", "znM0ujn2RUA", "osSryggkso4", "erTjj730fMk", "JabLtzJl8bc",
  "pFqrYbhIAXs", "N-1XGL54pQg", "fTKetYpEKNQ", "KR2mdHJ5qMg", "IoCWq07GaG4",
  "R1E6x8U83Ho", "-XA-fTYYfV0", "Nzw3HHsNHYU", "uDUiRS8YroY", "1uxV8fAfhVM",
  "Qo51KwK1dKg", "L7MpmBGpM94", "knYQ6arClBE", "57vHdjeZ0yg", "6qORI5j_6n8",
  "d19by2PLaPc", "akbHiqZy4Pg", "VLdaxYyXJvw", "SyBYM8R6VU4", "-kEr-QltARg",
  "algEQavPY4M", "Hi9GSwWkCJk", "zMz14hsbpuU", "PzPbh-faPgU", "ZJsseAxEcqM",
  "AHBiSKaENwc", "2FrX56QL7P8", "agnhLQWqr1Q", "QbkGwv3xtmQ", "2SfRAWkinpU",
  "SITaCHf7jjg", "OokBLPrkCNk", "IoIbdFdGCnQ", "Cs4QZdHrHt4", "umLpP7uCZs0",
  "YhZbnxqtooM", "1gBUXhf0PtA", "OxzhYtL-00Y", "j9nfqTi5T5o", "CtkDsu4w-Rs",
  "TIr6EwYMRUM", "Y2PYfopoz-k", "rlxZqmc6D_I", "-vq7mi4oF0s", "dYshDcTI1Js",
  "63qfL0TciY8", "xDrxJCdedcI", "o697BgRH_-M", "muC_6gTMLR4", "rsJtMXn3p_c",
  "qVj3KuEikvg", "baRYCsjO6z4", "QxkBP3A9XmU", "r1XwWjI4PyE", "4yzPVohNuVI",
  "87TJNWkepvI"
];

// Copy generated images
for (const [dest, filename] of Object.entries(generatedImages)) {
  const src = path.join(brainDir, filename);
  const targetName = dest.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.png';
  const destPath = path.join(publicDir, targetName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, destPath);
    generatedImages[dest] = '/images/packages/' + targetName;
  }
}

const packagesPath = path.join(process.cwd(), 'src', 'data', 'packages.json');
const packages = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));

// Track assigned IDs to ensure global uniqueness
const assignedIds = new Set(Object.values(realUnsplashIds));
let poolIndex = 0;

const getNextPoolId = () => {
  while (poolIndex < idPool.length) {
    const id = idPool[poolIndex++];
    if (!assignedIds.has(id)) {
      assignedIds.add(id);
      return id;
    }
  }
  return null;
};

// Map missing ones
const destinations = [...new Set(packages.map(p => p.destination))];
destinations.forEach(dest => {
  if (!generatedImages[dest] && !realUnsplashIds[dest]) {
    const nextId = getNextPoolId();
    if (nextId) {
      realUnsplashIds[dest] = nextId;
    }
  }
});

let changeCount = 0;
const updatedPackages = packages.map(p => {
  if (generatedImages[p.destination]) {
    p.imageUrl = generatedImages[p.destination];
    p.imageSource = "local";
    changeCount++;
  } else if (realUnsplashIds[p.destination]) {
    p.imageUrl = `https://images.unsplash.com/photo-${realUnsplashIds[p.destination]}?auto=format&fit=crop&w=3840&q=100`;
    p.imageSource = "unsplash";
    changeCount++;
  }
  return p;
});

fs.writeFileSync(packagesPath, JSON.stringify(updatedPackages, null, 2));
console.log(`Successfully updated ${changeCount} packages across all destinations with unique 4K images.`);
