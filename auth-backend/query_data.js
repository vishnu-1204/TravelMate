const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('auth.db');

async function queryTable(tableName, limit = 3) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName} LIMIT ${limit}`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  try {
    const tables = ['users', 'bookings', 'packages', 'contact_messages'];
    const results = {};
    for (const table of tables) {
      results[table] = await queryTable(table);
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

main();
