"use client";

import { Card } from "@/components/ui/card";
import { Database, Cpu, Code2 } from "lucide-react";

// Static Directory of Sources
const staticSourcesCategories = [
  {
    category: "Media & Data",
    description: "Financial market data and news ingestion.",
    icon: Database,
    sources: [
      { name: "Yahoo Finance", type: "Market Data" },
      { name: "SEC Filings", type: "Regulatory" },
      { name: "Bloomberg", type: "News" },
      { name: "Reuters", type: "News" },
      { name: "X/Twitter", type: "Social" }
    ]
  },
  {
    category: "Models",
    description: "Language models powering AI components.",
    icon: Cpu,
    sources: [
      { name: "GPT 5.4 Thinking", type: "OpenAI" },
      { name: "Gemini 3.1 Pro", type: "Google" },
      { name: "Claude 3.7 Sonnet Thinking", type: "Anthropic" },
      { name: "Cursor Agent", type: "Agent" }
    ]
  },
  {
    category: "Infrastructure",
    description: "Core framework and deployment stack.",
    icon: Code2,
    sources: [
      { name: "Next.js", type: "Frontend" },
      { name: "FastAPI", type: "Backend" },
      { name: "Uvicorn", type: "Server" },
      { name: "Vercel", type: "Hosting" }
    ]
  }
];

export default function SourcesPage() {
  return (
    <div className="flex flex-col gap-8 h-full p-4 md:p-6 pb-8 max-w-[1600px] mx-auto w-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Architecture & Sources</h1>
        <p className="text-muted-foreground mt-1">
          Static directory of the AI Monitor's data platforms, AI models, and infrastructure stack.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {staticSourcesCategories.map((group) => (
          <Card key={group.category} className="p-6 bg-card border-border flex flex-col gap-4">
            <div className="flex items-start gap-4 border-b border-border pb-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <group.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-bold">{group.category}</h2>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {group.sources.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-black/5 border border-black/10 hover:bg-black/10 transition-colors">
                  <span className="font-medium text-sm text-foreground">{source.name}</span>
                  <span className="text-xs uppercase tracking-wider px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md">
                    {source.type}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
