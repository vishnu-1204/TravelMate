const { getDb } = require('./src/db');
const db = getDb();

function checkSchema() {
  db.all("PRAGMA table_info(packages)", (err, rows) => {
    if (err) {
      console.error('Error fetching packages schema:', err);
    } else {
      console.log('--- Packages Table Schema ---');
      console.table(rows);
    }

    db.all("PRAGMA table_info(itineraries)", (err, errRows) => {
      if (err) {
        console.error('Error fetching itineraries schema:', err);
      } else {
        console.log('\n--- Itineraries Table Schema ---');
        console.table(errRows);
      }

      db.all("SELECT * FROM packages LIMIT 5", (pkgErr, pkgRows) => {
        if (pkgErr) {
          console.error('Error fetching packages:', pkgErr);
        } else {
          console.log('\n--- Sample Packages ---');
          console.log(JSON.stringify(pkgRows, null, 2));
        }
        process.exit(0);
      });
    });
  });
}

checkSchema();
