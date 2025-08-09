import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const inputIcon = 'public/favicon.ico';
const outputDir = 'public';
const sizes = [192, 512];

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach(size => {
  const outputFileName = `pwa-${size}x${size}.png`;
  const outputPath = path.join(outputDir, outputFileName);

  sharp(inputIcon)
    .resize(size, size)
    .toFile(outputPath, (err, info) => {
      if (err) {
        console.error(`Error generating ${outputFileName}:`, err);
      } else {
        console.log(`Successfully generated ${outputFileName}`);
      }
    });
});