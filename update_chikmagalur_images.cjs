const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'packages.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const newUrl = "https://plus.unsplash.com/premium_photo-1697730116501-72f5749dffce?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2hpa21hZ2FsdXJ8ZW58MHx8MHx8fDA%3D";

let updatedCount = 0;
data.forEach(pkg => {
    if (pkg.destination && pkg.destination.toLowerCase().includes('chikmagalur')) {
        pkg.imageUrl = newUrl;
        updatedCount++;
    }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log(`Updated ${updatedCount} Chikmagalur packages.`);
