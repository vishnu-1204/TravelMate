const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

const tables = ['users', 'bookings', 'packages', 'itineraries', 'contact_messages'];

function jsonToCsv(json) {
  if (json.length === 0) return '';
  const keys = Object.keys(json[0]);
  const header = keys.join(',');
  const rows = json.map(row => {
    return keys.map(key => {
      let val = row[key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') {
        // Escape quotes and wrap in quotes if contains comma
        val = val.replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n') || val.includes('"')) {
          val = `"${val}"`;
        }
      }
      return val;
    }).join(',');
  });
  return [header, ...rows].join('\n');
}

async function exportTable(table) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${table}`, (err, rows) => {
      if (err) {
        console.error(`Error exporting ${table}:`, err.message);
        return resolve();
      }
      if (rows.length === 0) {
        console.log(`Table ${table} is empty.`);
        return resolve();
      }
      const csv = jsonToCsv(rows);
      const filePath = path.resolve(__dirname, `${table}_export.csv`);
      fs.writeFileSync(filePath, csv);
      console.log(`Exported ${table} to ${filePath} (${rows.length} rows)`);
      resolve();
    });
  });
}

async function run() {
  console.log('Starting CSV export...');
  for (const table of tables) {
    await exportTable(table);
  }
  db.close();
  console.log('Export complete.');
}

run();
