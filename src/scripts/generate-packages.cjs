const fs = require('fs');
const path = require('path');

const categories = ['south', 'north', 'solo', 'honeymoon', 'educational'];

const destinations = {
  south: [
    'Munnar, Kerala', 'Alleppey, Kerala', 'Wayanad, Kerala', 'Thekkady, Kerala', 'Kochi, Kerala',
    'Kovalam, Kerala', 'Varkala, Kerala', 'Kumarakom, Kerala', 'Ooty, Tamil Nadu', 'Kodaikanal, Tamil Nadu',
    'Coorg, Karnataka', 'Mysore, Karnataka', 'Hampi, Karnataka', 'Gokarna, Karnataka', 'Udupi, Karnataka',
    'Chikmagalur, Karnataka', 'Rameshwaram, Tamil Nadu', 'Kanyakumari, Tamil Nadu', 'Mahabalipuram, Tamil Nadu',
    'Pondicherry', 'Visakhapatnam, Andhra Pradesh', 'Araku Valley, Andhra Pradesh', 'Tirupati, Andhra Pradesh',
    'Madurai, Tamil Nadu', 'Yercaud, Tamil Nadu', 'Dandeli, Karnataka', 'Kabini, Karnataka', 'Varkala, Kerala'
  ],
  north: [
    'Manali, Himachal Pradesh', 'Shimla, Himachal Pradesh', 'Kasol, Himachal Pradesh', 'Spiti Valley, Himachal Pradesh',
    'Dharamshala, Himachal Pradesh', 'Dalhousie, Himachal Pradesh', 'Bir Billing, Himachal Pradesh', 'Mussoorie, Uttarakhand',
    'Rishikesh, Uttarakhand', 'Nainital, Uttarakhand', 'Auli, Uttarakhand', 'Corbett, Uttarakhand', 'Jaipur, Rajasthan',
    'Udaipur, Rajasthan', 'Jodhpur, Rajasthan', 'Jaisalmer, Rajasthan', 'Pushkar, Rajasthan', 'Bikaner, Rajasthan',
    'Mount Abu, Rajasthan', 'Srinagar, Kashmir', 'Gulmarg, Kashmir', 'Pahalgam, Kashmir', 'Leh, Ladakh',
    'Nubra Valley, Ladakh', 'Pangong Lake, Ladakh', 'Agra, Uttar Pradesh', 'Varanasi, Uttar Pradesh'
  ],
  solo: [
    'Kasol, Himachal Pradesh', 'Rishikesh, Uttarakhand', 'Hampi, Karnataka', 'Gokarna, Karnataka', 'Varkala, Kerala',
    'Pushkar, Rajasthan', 'Leh, Ladakh', 'Spiti Valley, Himachal Pradesh', 'Ziro Valley, Arunachal Pradesh',
    'Tawang, Arunachal Pradesh', 'Mcleodganj, Himachal Pradesh', 'Tosh, Himachal Pradesh', 'Old Manali, Himachal Pradesh',
    'Anjuna, Goa', 'Palolem, Goa', 'Auroville, Pondicherry', 'Shillong, Meghalaya', 'Cherrapunji, Meghalaya',
    'Dawki, Meghalaya', 'Gangtok, Sikkim', 'Pelling, Sikkim', 'Lachung, Sikkim', 'Majuli, Assam'
  ],
  honeymoon: [
    'Havelock Island, Andaman', 'Neil Island, Andaman', 'Lakshadweep Islands', 'Udaipur, Rajasthan', 'Munnar, Kerala',
    'Gulmarg, Kashmir', 'Alleppey (Houseboat), Kerala', 'Kumarakom, Kerala', 'South Goa', 'Pahalgam, Kashmir',
    'Shimla, Himachal Pradesh', 'Ooty, Tamil Nadu', 'Kodaikanal, Tamil Nadu', 'Darjeeling, West Bengal',
    'Gangtok, Sikkim', 'Pelling, Sikkim', 'Lachung, Sikkim', 'Mussoorie, Uttarakhand'
  ],
  educational: [
    'National Museum, Delhi', 'ISRO-VHSC, Bangalore', 'Science City, Ahmedabad', 'Amer Fort Heritage, Jaipur',
    'Nalanda University Ruins, Bihar', 'Sarnath Buddhist Circuit, UP', 'Ajanta Caves, Maharashtra',
    'Ellora Caves, Maharashtra', 'Konark Sun Temple, Odisha', 'Hampi Architecture, Karnataka',
    'Mysore Palace, Karnataka', 'Tanjore Temples, Tamil Nadu', 'Mahabalipuram, Tamil Nadu',
    'Jantar Mantar, Jaipur', 'Sabarmati Ashram, Gujarat', 'Khajuraho Temples, MP', 'Golconda Fort, Hyderabad'
  ]
};

const themes = ['Standard', 'Luxury', 'Adventure', 'Cultural', 'Wellness', 'Leisure', 'Heritage', 'Short-Stay'];

const unsplashImages = [
  'photo-1602216056096-3b40cc0c9944', 'photo-1595815771614-ade501f4b7d8', 'photo-1512343879784-a960bf40e7f2',
  'photo-1537996194471-e657df975ab4', 'photo-1476514525535-07fb3b4ae5f1', 'photo-1512453979798-5ea266f8880c',
  'photo-1521292270410-a8c4d716d518', 'photo-1469474968028-56623f02e42e', 'photo-1431274172761-fca41d930114',
  'photo-1501785888041-af3ef285b470', 'photo-1527631746610-bca00a040d60', 'photo-1507525428034-b723cf961d3e',
  'photo-1518509562904-e7ef99cdcc86', 'photo-1525625293386-3f8f99389edd', 'photo-1488646953014-85cb44e25828',
  'photo-1524492412937-b28074a5d7da', 'photo-1544161515-4ad6ce6e85bd', 'photo-1548013146-72479768bbaa',
  'photo-1567157577867-05ccb13880ef', 'photo-1506461883276-594a12b11cf3', 'photo-1517330357046-3ab5a5dd42b1',
  'photo-1526481280693-3bfa756180f1', 'photo-1590490359683-658d3d23f972', 'photo-1519451241324-20b4ea2c4220'
];

function generateItinerary(dest, days) {
  const activities = [
    `Arrival and sunset walk in ${dest}`,
    `Full day sightseeing tour of ${dest}`,
    `Local market exploration and food trail`,
    `Visit to famous temples and monuments`,
    `Photography walk in the old town`,
    `Leisure day at the resort/hotel`,
    `Guided trekking session in the outskirts`,
    `Evening cultural show and dinner`,
    `Morning Yoga session by the nature`,
    `Departure and final souvenir shopping`
  ];
  const selectedDays = [];
  for (let i = 1; i <= days; i++) {
    selectedDays.push({
      day: i,
      title: i === 1 ? `Welcome to ${dest}` : i === days ? `Bidding Farewell to ${dest}` : `Exploring ${dest} - Day ${i}`,
      activities: [activities[i % activities.length], activities[(i + 1) % activities.length]],
      narrative: `Enjoy a wonderful day in ${dest}. Experience the local culture and beautiful landscapes.`
    });
  }
  return {
    days: selectedDays,
    nights: Array.from({ length: days - 1 }, (_, i) => ({
      night: i + 1,
      accommodation: 'Premium Hotel stay',
      meals: 'Breakfast'
    }))
  };
}

const allPackages = [];
let globalId = 1;

categories.forEach(category => {
  const destList = destinations[category];
  let count = 0;
  
  // Set target counts based on category
  const targetCount = (category === 'south' || category === 'north') ? 100 : 30;
  
  while (count < targetCount) {
    destList.forEach(dest => {
      if (count >= targetCount) return;
      
      const theme = themes[count % themes.length];
      const durationDays = 3 + (count % 5);
      const price = 5000 + (count * 200) + (durationDays * 1000) + (Math.random() * 2000);
      const packageId = `${category}-${dest.split(',')[0].toLowerCase().replace(/\s+/g, '-')}-${theme.toLowerCase()}-${count}`;
      const imgId = unsplashImages[(globalId) % unsplashImages.length];
      
      allPackages.push({
        id: packageId,
        packageId: packageId,
        category: category,
        categories: [category],
        title: `${dest} - ${durationDays} Days ${theme} ${category.charAt(0).toUpperCase() + category.slice(1)} Package`,
        destination: dest,
        location: dest,
        duration: `${durationDays} Days / ${durationDays - 1} Nights`,
        durationDays: durationDays,
        price: Math.round(price),
        discount: 5 + (count % 15),
        rating: 4 + (Math.random() * 1),
        reviews: 50 + count,
        shortDescription: `Experience the best of ${dest} with our curated ${theme.toLowerCase()} package.`,
        description: `This unique ${category} package for ${dest} offers a perfect blend of ${theme.toLowerCase()} and comfort. Explore hidden gems and popular spots during your ${durationDays} days journey.`,
        inclusions: ["Accommodation", "Daily Breakfast", "Sightseeing Transfers", "Guided Tours"],
        exclusions: ["Airfare", "Personal Expenses", "Lunches", "Tips"],
        imageUrl: `https://images.unsplash.com/${imgId}?auto=format&fit=crop&w=1200&q=75`,
        imageAlt: `${dest} travel image`,
        imageSource: 'unsplash',
        availableDates: ["2026-04-10", "2026-05-15", "2026-06-20"],
        highlights: [`Visit ${dest} Top Spots`, `${theme} Experiences`, "Local Food Trail", "Memorable Views"],
        itinerary: generateItinerary(dest, durationDays),
        budgetType: price < 15000 ? 'low' : price < 35000 ? 'medium' : 'premium',
        affordabilityScore: 100 - (durationDays * 5),
        specialTags: [theme, 'Trending', 'Best Seller'],
        isGroupTour: false
      });
      
      count++;
      globalId++;
    });
  }
});

fs.writeFileSync(path.join(__dirname, '../../src/data/packages.json'), JSON.stringify(allPackages, null, 2));
console.log(`Generated ${allPackages.length} packages.`);
