const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!GNEWS_API_KEY || !OPENAI_API_KEY) {
  console.error("Missing API keys in .env.local");
  process.exit(1);
}

// Ensure data directory exists
const dataFilePath = path.join(__dirname, 'data', 'news.json');
if (!fs.existsSync(path.dirname(dataFilePath))) {
  fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
}

// Load existing events
let savedEvents = [];
if (fs.existsSync(dataFilePath)) {
  try {
    savedEvents = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  } catch (e) {
    console.error("Could not parse existing news.json. Starting fresh.");
  }
}

// To get diverse global coverage, we will query different regions/countries in GNews
const regions = [
  { country: 'us', name: 'United States' },
  { country: 'cn', name: 'China' }, // GNews supports cn
  { country: 'jp', name: 'Japan' },
  { country: 'kr', name: 'South Korea' },
  { country: 'gb', name: 'United Kingdom' },
  { country: 'de', name: 'Germany' },
  { country: 'fr', name: 'France' },
  { country: 'au', name: 'Australia' },
  { country: 'in', name: 'India' },
  { country: 'sg', name: 'Singapore' },
  { country: 'ca', name: 'Canada' },
  { country: 'ae', name: 'UAE' }
];

// Query "AI" OR "artificial intelligence" for the last 12 hours
const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
// GNews uses from=YYYY-MM-DDTHH:MM:SSZ format

async function fetchGlobalNews() {
  // GNews free tier has a limit of 10 requests per day, 
  // so we'll just do a global general query for the last 12 hours instead of 12 separate country queries to save quota
  // and we'll max it out at 100 articles (the API limit per request)
  
  const q = encodeURIComponent('"artificial intelligence" OR "AI" OR "LLM"');
  // Changed "from" to point to 24 hours ago, as we just ran out of hits on previous queries or 12h was too short
  // and we'll search by lang=en
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&max=30&from=${twentyFourHoursAgo}&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
  
  console.log(`Fetching global news...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`GNews API failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    console.log(`Found ${data.articles?.length || 0} articles globally.`);
    return data.articles || [];
  } catch (err) {
    console.error(`Error fetching global news:`, err.message);
    return [];
  }
}

const promptTemplate = `
You are an expert AI industry analyst. I will provide you with a list of recent AI news articles from various global regions.
For each article, analyze it and convert it into a structured JSON object.

Your output MUST be a JSON object with a single key "events" containing an array of objects matching this TypeScript interface exactly:

type Severity = "LOW" | "MODERATE" | "ELEVATED" | "HIGH" | "CRITICAL";
type Category = "Hardware" | "Software" | "Regulation" | "Research" | "Market" | "Model";
type Industry = "Semiconductors" | "Cloud Computing" | "Energy and Utilities" | "Enterprise Software" | "Cybersecurity" | "Defense" | "Aerospace" | "Healthcare" | "Biotech" | "Finance" | "Banking" | "Automotive" | "Robotics" | "Media" | "Entertainment" | "Retail" | "E-commerce" | "Legal" | "Education" | "Agriculture" | "Manufacturing";

interface MapEntity {
  id: string; // generate a unique string (e.g. "backfill-[random_id]")
  entityType: "News";
  title: string; 
  coordinates: [number, number]; // [longitude, latitude]. Estimate the most relevant geographic location for this news (e.g. [-122.4, 37.7] for SF, [116.4, 39.9] for Beijing, [139.7, 35.6] for Tokyo, [-0.1, 51.5] for London).
  category: Category;
  severity: Severity;
  summary: string; // 1-2 sentence summary
  location: string; // e.g. "Beijing, China", "Tokyo, Japan", "London, UK", "Sydney, Australia"
  source: string; 
  sourceUrl: string; // EXACT url provided
  whyItMatters: string; 
  industry: Industry; 
  size: number; // LOW=14, MODERATE=18, ELEVATED=22, HIGH=26, CRITICAL=32
}

Here are the articles:
`;

async function processBatchWithOpenAI(articlesBatch) {
  const articlesForLLM = articlesBatch.map((a, index) => ({
    index,
    title: a.title,
    description: a.description,
    source: a.source.name,
    url: a.url,
  }));

  const prompt = promptTemplate + JSON.stringify(articlesForLLM, null, 2);

  console.log(`Sending batch of ${articlesBatch.length} articles to OpenAI...`);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use mini for speed/cost, it's good enough for this
        messages: [
          { role: "system", content: "You are a data-formatting machine that outputs valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!res.ok) {
      console.error("OpenAI failed:", await res.text());
      return [];
    }

    const data = await res.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    // Attach publishedAt dates
    const finalEvents = (content.events || []).map(event => {
      const orig = articlesBatch.find(a => a.url === event.sourceUrl);
      return {
        ...event,
        publishedAt: orig ? orig.publishedAt : new Date().toISOString()
      };
    });

    return finalEvents;

  } catch (err) {
    console.error("Error with OpenAI:", err.message);
    return [];
  }
}

async function run() {
  console.log("Starting backfill for the last 24 hours...");
  
  let allNewArticles = [];
  const articles = await fetchGlobalNews();
  
  // Deduplicate against already saved events AND already fetched articles in this run
  for (const article of articles) {
    const existsInSaved = savedEvents.some(s => s.sourceUrl === article.url);
    const existsInNew = allNewArticles.some(a => a.url === article.url);
    if (!existsInSaved && !existsInNew) {
      allNewArticles.push(article);
    }
  }
  
  console.log(`\nTotal unique new articles found across all regions: ${allNewArticles.length}`);
  
  if (allNewArticles.length === 0) {
    console.log("No new articles to process. Exiting.");
    return;
  }

  // 2. Process in batches with OpenAI (max 15 articles per batch to avoid token limits/hallucinations)
  const BATCH_SIZE = 15;
  let allProcessedEvents = [];
  
  for (let i = 0; i < allNewArticles.length; i += BATCH_SIZE) {
    const batch = allNewArticles.slice(i, i + BATCH_SIZE);
    const processed = await processBatchWithOpenAI(batch);
    allProcessedEvents.push(...processed);
    
    // Small delay between OpenAI requests
    if (i + BATCH_SIZE < allNewArticles.length) {
      console.log("Waiting 2 seconds before next OpenAI batch...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log(`\nSuccessfully processed ${allProcessedEvents.length} events through OpenAI.`);
  
  // 3. Save to file
  const updatedEvents = [...allProcessedEvents, ...savedEvents];
  
  // Sort by publishedAt descending (newest first)
  updatedEvents.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  fs.writeFileSync(dataFilePath, JSON.stringify(updatedEvents, null, 2), 'utf8');
  console.log(`Saved! Total events in database now: ${updatedEvents.length}`);
}

run();
