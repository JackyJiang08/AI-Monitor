const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, 'data', 'news.json');
if (fs.existsSync(dataFilePath)) {
  const currentData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  // Filter out mock data. The mock data have simple numeric string IDs like "1", "2", "3" or "model-1", "market-1".
  // The scraped data have UUIDs or long strings, wait no, they have "rss-..." or something?
  // Let's check how the fetcher assigns IDs.
  // The fetcher didn't explicitly assign an ID, wait:
  // "id: string; // generate a unique string"
  // Let's check what IDs OpenAI generated.
  
  const cleanedData = currentData.filter(item => {
    // mock data IDs: "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "model-1", "model-2", "market-1", "market-2", "test-wrap"
    const isMock = /^(?:[1-9]|1[0-2]|model-\d|market-\d|test-wrap)$/.test(item.id);
    return !isMock;
  });
  
  fs.writeFileSync(dataFilePath, JSON.stringify(cleanedData, null, 2));
  console.log(`Removed ${currentData.length - cleanedData.length} mock items. Remaining real items: ${cleanedData.length}`);
}
