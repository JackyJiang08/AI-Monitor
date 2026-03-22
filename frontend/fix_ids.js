const fs = require('fs');
const crypto = require('crypto');
const data = JSON.parse(fs.readFileSync('data/news.json', 'utf8'));
data.forEach(item => {
  item.id = crypto.randomUUID();
});
fs.writeFileSync('data/news.json', JSON.stringify(data, null, 2));
console.log("Fixed duplicate IDs in data/news.json");
