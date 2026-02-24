import { searchFlightOffers } from "../modules/packages/provider/amadeusProvider";

async function testFlightSearch() {
  console.log("Testing Amadeus Flight Search...");
  
  // Test with common route (Delhi to Dubai)
  const origin = "DEL";
  const destination = "DXB";
  const departureDate = "2026-06-01"; // Future date

  try {
    const flight = await searchFlightOffers(origin, destination, departureDate);
    if (flight) {
      console.log("✅ Flight found:");
      console.log(`   Airline: ${flight.airline}`);
      console.log(`   Departure: ${flight.departureTime}`);
      console.log(`   Arrival: ${flight.arrivalTime}`);
      console.log(`   Price: ${flight.price} ${flight.currency}`);
    } else {
      console.log("❌ No flights found or Amadeus API error.");
      console.log("   (Ensure AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are set in .env)");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testFlightSearch();
