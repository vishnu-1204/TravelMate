const { getDb } = require("./src/db");

async function checkBookings() {
  const db = getDb();
  console.log("Checking last 5 bookings...");
  
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT b.id, b.booking_reference, b.package_title, p.category, b.email_sent 
         FROM bookings b 
         LEFT JOIN packages p ON b.package_id = p.id 
         ORDER BY b.id DESC LIMIT 5`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.table(rows);
    
    // Check if any booking has package_id null
    const nullPkg = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM bookings WHERE package_id IS NULL", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    console.log(`Bookings with NULL package_id: ${nullPkg}`);

  } catch (error) {
    console.error("Database error:", error.message);
  } finally {
    process.exit(0);
  }
}

checkBookings();
