const fs = require('fs');
const path = require('path');

const packages = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/packages.json'), 'utf8'));

const idMap = new Map();
const titleMap = new Map();
const categoryCounts = {};

packages.forEach(pkg => {
  // Check ID uniqueness
  if (idMap.has(pkg.id)) {
    console.error(`Duplicate ID found: ${pkg.id} in categories ${idMap.get(pkg.id)} and ${pkg.category}`);
  }
  idMap.set(pkg.id, pkg.category);

  // Check Title uniqueness (strictly)
  if (titleMap.has(pkg.title)) {
    console.error(`Duplicate Title found: ${pkg.title} in categories ${titleMap.get(pkg.title)} and ${pkg.category}`);
  }
  titleMap.set(pkg.title, pkg.category);

  // Count per category
  categoryCounts[pkg.category] = (categoryCounts[pkg.category] || 0) + 1;
});

console.log('Category Counts:', categoryCounts);

const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
console.log('Total Packages:', total);

if (idMap.size === total && titleMap.size === total) {
  console.log('✓ All IDs and Titles are unique across all categories.');
} else {
  console.error('✗ Duplicate IDs or Titles detected.');
}
