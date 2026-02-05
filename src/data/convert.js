const fs = require("fs");

// Load original dataset
const packages = JSON.parse(fs.readFileSync("packages.json", "utf-8"));

const updatedPackages = packages.map(pkg => {

  // Generate destination keywords
  const locationKeyword = pkg.location?.split(",")[0] || "travel";
  const titleKeyword = pkg.title?.split(" ")[0] || "tour";

  return {
    ...pkg,

    // Convert image -> images
    images: [
      pkg.image,
      `https://source.unsplash.com/800x600/?${locationKeyword}`,
      `https://source.unsplash.com/800x600/?${titleKeyword}`
    ],

    // Remove old field
    image: undefined
  };
});

// Save converted dataset
fs.writeFileSync(
  "updatedPackages.json",
  JSON.stringify(updatedPackages, null, 2)
);

console.log("✅ FULL DATASET CONVERTED SUCCESSFULLY");
