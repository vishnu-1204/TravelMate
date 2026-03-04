const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

async function checkDb(path) {
    return new Promise((resolve) => {
        if (!fs.existsSync(path)) return resolve({ exists: false });
        const db = new sqlite3.Database(path);
        db.get("SELECT COUNT(*) as count FROM bookings", (err, row) => {
            if (err) resolve({ exists: true, error: err.message });
            else resolve({ exists: true, count: row.count });
            db.close();
        });
    });
}

(async () => {
    const root = await checkDb('auth.db');
    const src = await checkDb('src/auth.db');
    fs.writeFileSync('db_counts.json', JSON.stringify({ root, src }, null, 2));
    console.log('Results written to db_counts.json');
})();
