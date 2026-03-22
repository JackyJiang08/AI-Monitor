import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MapEntity } from '@/lib/mockData';

// Helper to calculate relative time dynamically
function calculateTimeAgo(publishedAt?: string): string {
  if (!publishedAt) return "Recently";
  const date = new Date(publishedAt);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} secs ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
}

// Instantiate RSS parser (removed unused import)
// const parser = new Parser();

export async function GET() {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API Key is not configured." }, { status: 500 });
    }

    // Define path to our local JSON databases
    const dataFilePath = path.join(process.cwd(), 'data', 'news.json');
    const summaryFilePath = path.join(process.cwd(), 'data', 'news_summary.json');
    
    // Read existing saved events
    let savedEvents: MapEntity[] = [];
    if (fs.existsSync(dataFilePath)) {
      try {
        const fileData = fs.readFileSync(dataFilePath, 'utf8');
        savedEvents = JSON.parse(fileData);
      } catch (err) {
        console.error("Error reading news.json:", err);
        savedEvents = [];
      }
    }

    // Read summary
    let summaryData = null;
    if (fs.existsSync(summaryFilePath)) {
      try {
        const summaryFileData = fs.readFileSync(summaryFilePath, 'utf8');
        summaryData = JSON.parse(summaryFileData);
        // Calculate timeAgo for summary bullets if they are objects
        if (summaryData && Array.isArray(summaryData.bullets)) {
          summaryData.bullets = summaryData.bullets.map((b: any) => {
             if (typeof b === 'object' && b !== null && b.publishedAt) {
                 return { ...b, timeAgo: calculateTimeAgo(b.publishedAt) };
             }
             return b;
          });
        }
      } catch (err) {
        console.error("Error reading news_summary.json:", err);
      }
    }

    // Since RSS fetching + OpenAI translation takes a long time, we do NOT want to block the page load.
    // The page load will just return the currently saved events immediately.
    // You should run `node fetch_rss_news.js` via a Cron Job (e.g. every 30 mins) to continuously fetch news in the background.

    // Dynamically calculate timeAgo for ALL events based on current server time
    const finalEvents = savedEvents.map(event => ({
      ...event,
      timeAgo: calculateTimeAgo(event.publishedAt)
    }));

    return NextResponse.json({ events: finalEvents, summary: summaryData });

  } catch (error: unknown) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
