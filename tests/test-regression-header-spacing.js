const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'index.html');
const html = fs.readFileSync(filePath, 'utf8');

// Check body gap
const bodyMatch = html.match(/body\s*\{([^}]+)\}/);
if (!bodyMatch) {
    console.error('FAIL: Could not find body CSS');
    process.exit(1);
}
const bodyStyles = bodyMatch[1];
const gapMatch = bodyStyles.match(/gap:\s*(\d+)px/);
const gap = gapMatch ? parseInt(gapMatch[1], 10) : 0;
console.log(`Found body gap: ${gap}px`);

// Check header margin-bottom
const headerMatch = html.match(/\.header\s*\{([^}]+)\}/);
if (!headerMatch) {
    console.error('FAIL: Could not find .header CSS');
    process.exit(1);
}
const headerStyles = headerMatch[1];
const marginMatch = headerStyles.match(/margin-bottom:\s*(\d+)px/);
const marginBottom = marginMatch ? parseInt(marginMatch[1], 10) : 0;
console.log(`Found header margin-bottom: ${marginBottom}px`);

// Calculate total spacing
const totalSpacing = gap + marginBottom;
console.log(`Total vertical spacing between Header and Content: ${totalSpacing}px`);

// Expectation: Total spacing should be <= 20px
if (totalSpacing > 20) {
    console.error(`FAIL: Vertical spacing is excessive (${totalSpacing}px). Expected <= 20px.`);
    process.exit(1);
} else {
    console.log('PASS: Vertical spacing is within acceptable limits.');
    process.exit(0);
}
