const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('auth.db');
const fs = require('fs');

async function getInfo(table) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function main() {
    try {
        const tables = ['users', 'bookings', 'profiles']; // profiles might exist locally too
        let output = "";
        for (const table of tables) {
            output += `--- ${table} ---\n`;
            try {
                const info = await getInfo(table);
                output += JSON.stringify(info, null, 2) + "\n\n";
            } catch (e) {
                output += `Error reading ${table}: ${e.message}\n\n`;
            }
        }
        fs.writeFileSync('schema_info.txt', output);
    } finally {
        db.close();
    }
}

main();
