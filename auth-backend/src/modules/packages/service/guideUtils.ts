// No imports needed for guideUtils

const GUIDE_NAMES = [
  'Rahul Sharma',
  'Anita Desai',
  'Vikram Singh',
  'Priya Patel',
  'Sanjay Gupta',
  'Meera Reddy',
  'Arjun Verma',
  'Kavita Nair',
  'Rohan Das',
  'Shweta Kulkarni',
  'Amit Trivedi',
  'Deepa Iyer',
  'Rajesh Khanna',
  'Sunita Williams',
  'Karan Johar',
];

/**
 * Generates a deterministic guide name and phone number based on a seed (e.g., packageId).
 */
export const getDeterministicGuideInfo = (seed: string) => {
  // Simple hash function for the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const absHash = Math.abs(hash);

  const name = GUIDE_NAMES[absHash % GUIDE_NAMES.length];
  
  // Generate a realistic Indian mobile number suffix
  // We use a base and add a deterministic part
  const suffix = (absHash % 90000) + 10000; // 5 digits: 10000 to 99999
  const phone = `+91 98765 ${suffix}`;

  return { name, phone };
};
