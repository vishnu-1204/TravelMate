const fs = require('fs');
const path = require('path');

const rootDb = path.resolve('auth.db');
const srcDb = path.resolve('src/auth.db');

const results = {
    root: { path: rootDb, exists: fs.existsSync(rootDb) },
    src: { path: srcDb, exists: fs.existsSync(srcDb) }
};

if (results.root.exists) results.root.mtime = fs.statSync(rootDb).mtime;
if (results.src.exists) results.src.mtime = fs.statSync(srcDb).mtime;

fs.writeFileSync('db_status.json', JSON.stringify(results, null, 2));
console.log('Results written to db_status.json');
