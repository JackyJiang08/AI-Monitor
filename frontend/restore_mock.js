const fs = require('fs');
const path = require('path');

const mockDataContent = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'mockData.ts'), 'utf8');

// Use regex to extract the mockAiNewsEvents array
const match = mockDataContent.match(/export const mockAiNewsEvents: MapEntity\[\] = (\[[\s\S]*?\]);/);

if (match && match[1]) {
  try {
    // Add missing types/variables to evaluate the string safely
    const data = eval(`(${match[1]})`);
    
    // Read current news.json
    const dataFilePath = path.join(__dirname, 'data', 'news.json');
    let currentData = [];
    if (fs.existsSync(dataFilePath)) {
      currentData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    }
    
    // Ensure all mock data has publishedAt to not break sorting
    const mockWithDates = data.map(item => ({
      ...item,
      publishedAt: item.publishedAt || new Date().toISOString()
    }));
    
    // Combine them, mock data first, avoiding ID duplicates
    const combined = [...mockWithDates];
    
    for (const item of currentData) {
      if (!combined.some(c => c.id === item.id)) {
        combined.push(item);
      }
    }
    
    fs.writeFileSync(dataFilePath, JSON.stringify(combined, null, 2));
    console.log(`Restored ${mockWithDates.length} mock events. Total events now: ${combined.length}`);
  } catch (e) {
    console.error("Failed to parse mock data:", e);
  }
} else {
  console.error("Could not find mockAiNewsEvents in mockData.ts");
}
