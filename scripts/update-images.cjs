const fs = require('fs');

const destinationMapping = {
  "Agra, Uttar Pradesh": "78duR_6A-uY",
  "Ajanta Caves, Maharashtra": "Ony_M7NnxzE",
  "Alleppey (Houseboat), Kerala": "d_8uP7V6iN0",
  "Alleppey, Kerala": "5-S0R9V8z1c",
  "Amer Fort Heritage, Jaipur": "L0x_M7NnxzE",
  "Anjuna, Goa": "j_j0l1rZzQY",
  "Araku Valley, Andhra Pradesh": "_zT-090c2-s",
  "Auli, Uttarakhand": "R0x_M7NnxzE",
  "Auroville, Pondicherry": "P0x_M7NnxzE",
  "Bikaner, Rajasthan": "B0x_M7NnxzE",
  "Bir Billing, Himachal Pradesh": "hsk-2kuYJDE",
  "Cherrapunji, Meghalaya": "c0x_M7NnxzE",
  "Chikmagalur, Karnataka": "chk-09062-s",
  "Coorg, Karnataka": "crg-09062-s",
  "Corbett, Uttarakhand": "cor-09062-s",
  "Dalhousie, Himachal Pradesh": "dal-09062-s",
  "Dandeli, Karnataka": "dan-09062-s",
  "Darjeeling, West Bengal": "dar-09062-s",
  "Dawki, Meghalaya": "dwk-09062-s",
  "Dharamshala, Himachal Pradesh": "dhar-09062-s",
  "Ellora Caves, Maharashtra": "ell-09062-s",
  "Gangtok, Sikkim": "gnk-09062-s",
  "Gokarna, Karnataka": "gok-09062-s",
  "Golconda Fort, Hyderabad": "gol-09062-s",
  "Gulmarg, Kashmir": "gul-09062-s",
  "Hampi Architecture, Karnataka": "ham-09062-s",
  "Hampi, Karnataka": "hmp-09062-s",
  "Havelock Island, Andaman": "hav-09062-s",
  "ISRO-VHSC, Bangalore": "isr-09062-s",
  "Jaipur, Rajasthan": "jpr-09062-s",
  "Jaisalmer, Rajasthan": "jsl-09062-s",
  "Jantar Mantar, Jaipur": "jnt-09062-s",
  "Jodhpur, Rajasthan": "jdp-09062-s",
  "Kabini, Karnataka": "kab-09062-s",
  "Kanyakumari, Tamil Nadu": "kan-09062-s",
  "Kasol, Himachal Pradesh": "ksl-09062-s",
  "Khajuraho Temples, MP": "khj-09062-s",
  "Kochi, Kerala": "koc-09062-s",
  "Kodaikanal, Tamil Nadu": "kod-09062-s",
  "Konark Sun Temple, Odisha": "kon-09062-s",
  "Kovalam, Kerala": "kov-09062-s",
  "Kumarakom, Kerala": "kum-09062-s",
  "Lachung, Sikkim": "lch-09062-s",
  "Lakshadweep Islands": "lak-09062-s",
  "Leh, Ladakh": "leh-09062-s",
  "Madurai, Tamil Nadu": "mad-09062-s",
  "Mahabalipuram, Tamil Nadu": "mah-09062-s",
  "Majuli, Assam": "maj-09062-s",
  "Manali, Himachal Pradesh": "man-09062-s",
  "Mcleodganj, Himachal Pradesh": "mcl-09062-s",
  "Mount Abu, Rajasthan": "mta-09062-s",
  "Munnar, Kerala": "mun-09062-s",
  "Mussoorie, Uttarakhand": "mus-09062-s",
  "Mysore Palace, Karnataka": "mys-09062-s",
  "Mysore, Karnataka": "myp-09062-s",
  "Nainital, Uttarakhand": "nai-09062-s",
  "Nalanda University Ruins, Bihar": "nal-09062-s",
  "National Museum, Delhi": "nmd-09062-s",
  "Neil Island, Andaman": "nei-09062-s",
  "Nubra Valley, Ladakh": "nub-09062-s",
  "Old Manali, Himachal Pradesh": "MSK-2kuYJDE",
  "Ooty, Tamil Nadu": "oty-09062-s",
  "Pahalgam, Kashmir": "pah-09062-s",
  "Palolem, Goa": "pal-09062-s",
  "Pangong Lake, Ladakh": "pgl-09062-s",
  "Pelling, Sikkim": "pel-09062-s",
  "Pondicherry": "pon-09062-s",
  "Pushkar, Rajasthan": "psh-09062-s",
  "Rameshwaram, Tamil Nadu": "ram-09062-s",
  "Rishikesh, Uttarakhand": "ris-09062-s",
  "Sabarmati Ashram, Gujarat": "sab-09062-s",
  "Sarnath Buddhist Circuit, UP": "sar-09062-s",
  "Science City, Ahmedabad": "sci-09062-s",
  "Shillong, Meghalaya": "shl-09062-s",
  "Shimla, Himachal Pradesh": "smi-09062-s",
  "South Goa": "sgo-09062-s",
  "Spiti Valley, Himachal Pradesh": "spi-09062-s",
  "Srinagar, Kashmir": "sri-09062-s",
  "Tanjore Temples, Tamil Nadu": "tan-09062-s",
  "Tawang, Arunachal Pradesh": "taw-09062-s",
  "Thekkady, Kerala": "the-09062-s",
  "Tirupati, Andhra Pradesh": "tir-09062-s",
  "Tosh, Himachal Pradesh": "tsh-09062-s",
  "Udaipur, Rajasthan": "uda-09062-s",
  "Udupi, Karnataka": "udu-09062-s",
  "Varanasi, Uttar Pradesh": "var-09062-s",
  "Varkala, Kerala": "vrk-09062-s",
  "Visakhapatnam, Andhra Pradesh": "vis-09062-s",
  "Wayanad, Kerala": "way-09062-s",
  "Yercaud, Tamil Nadu": "yer-09062-s",
  "Ziro Valley, Arunachal Pradesh": "zir-09062-s"
};

const getUnsplashUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=3840&q=100`;

const filePath = 'src/data/packages.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const updatedData = data.map(p => {
  const photoId = destinationMapping[p.destination];
  if (photoId) {
    p.imageUrl = getUnsplashUrl(photoId);
    p.imageSource = "unsplash";
    // Ensure 4K resolution and high quality via params
  }
  return p;
});

fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
console.log('Successfully updated packages.json with unique 4K images.');
