"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BellRing, Mail, Clock, CheckSquare } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["News", "Models", "Market", "Trading"];
const SEVERITIES = ["Low", "Moderate", "Elevated", "High", "Critical"];
const TIMEFRAMES = ["Last 1 hour", "Last 12 hours", "Last 24 hours", "Last 7 days"];
const INDUSTRIES = [
  "General", "Hardware", "Software", "Regulation", "Semiconductors", "Cloud Computing", 
  "Enterprise Software", "Healthcare", "Finance", "Automotive", "Robotics", "Legal"
];
const TICKERS = ["NVDA", "MSFT", "GOOGL", "AAPL", "META", "TSM", "AMD", "TSLA"];

export default function NotificationsPage() {
  const [email, setEmail] = useState("");
  const [schedule, setSchedule] = useState("09:30");
  
  // States for form
  const [selectedCategory, setSelectedCategory] = useState("News");
  
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set(["High", "Critical"]));
  const [timeframe, setTimeframe] = useState("Last 24 hours");
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [includeAiSummary, setIncludeAiSummary] = useState(true);

  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set(["NVDA"]));
  const [includeAnalystBrief, setIncludeAnalystBrief] = useState(true);

  const toggleSet = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(item)) newSet.delete(item);
    else newSet.add(item);
    setter(newSet);
  };

  return (
    <div className="flex flex-col gap-8 h-full p-4 md:p-6 pb-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">Configure your custom AI intelligence digests and push alerts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Customization Filters */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-6 bg-card border-border flex flex-col gap-8">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">Content Customization</h2>
            </div>

            {/* Category Filter */}
            <div>
              <Label className="text-sm text-muted-foreground mb-3 block uppercase tracking-wider">Select Category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md border transition-all ${
                      selectedCategory === cat
                        ? "bg-black text-white border-black"
                        : "bg-transparent text-muted-foreground border-black/10 hover:border-black/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Rendering: News */}
            {selectedCategory === "News" && (
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block uppercase tracking-wider">Minimum Severity</Label>
                  <div className="flex flex-wrap gap-2">
                    {SEVERITIES.map((sev) => (
                      <button
                        key={sev}
                        onClick={() => toggleSet(selectedSeverities, sev, setSelectedSeverities)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                          selectedSeverities.has(sev)
                            ? sev === 'Critical' ? 'bg-red-500/20 border-red-500/50 text-red-500' :
                              sev === 'High' ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' :
                              sev === 'Elevated' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' :
                              sev === 'Moderate' ? 'bg-lime-500/20 border-lime-500/50 text-lime-500' :
                              'bg-green-500/20 border-green-500/50 text-green-500'
                            : 'bg-transparent border-black/10 text-muted-foreground hover:border-black/30'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block uppercase tracking-wider">Timeframe</Label>
                  <div className="flex flex-wrap gap-2">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                          timeframe === tf
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-transparent text-muted-foreground border-black/10 hover:border-black/30"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block uppercase tracking-wider">By Industry</Label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind}
                        onClick={() => toggleSet(selectedIndustries, ind, setSelectedIndustries)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                          selectedIndustries.has(ind)
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-transparent text-muted-foreground border-black/10 hover:border-black/30"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 cursor-pointer" onClick={() => setIncludeAiSummary(!includeAiSummary)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${includeAiSummary ? 'bg-primary border-primary text-white' : 'border-black/20'}`}>
                    {includeAiSummary && <CheckSquare className="w-3 h-3" />}
                  </div>
                  <Label className="cursor-pointer text-sm font-medium">Include AI summary</Label>
                </div>
              </div>
            )}

            {/* Conditional Rendering: Market */}
            {selectedCategory === "Market" && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-sm font-semibold">Companies / Tickers</Label>
                    <button 
                      onClick={() => setSelectedTickers(new Set())}
                      className="text-xs text-muted-foreground hover:text-black underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TICKERS.map((ticker) => (
                      <button
                        key={ticker}
                        onClick={() => toggleSet(selectedTickers, ticker, setSelectedTickers)}
                        className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${
                          selectedTickers.has(ticker)
                            ? "bg-primary/10 text-primary border-primary/30 font-bold"
                            : "bg-transparent text-muted-foreground border-black/10 hover:border-black/30"
                        }`}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 cursor-pointer" onClick={() => setIncludeAnalystBrief(!includeAnalystBrief)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${includeAnalystBrief ? 'bg-primary border-primary text-white' : 'border-black/20'}`}>
                    {includeAnalystBrief && <CheckSquare className="w-3 h-3" />}
                  </div>
                  <Label className="cursor-pointer text-sm font-medium">Include AI Analyst Brief</Label>
                </div>
              </div>
            )}
            
          </Card>
        </div>

        {/* Right Column: Delivery Details */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="p-5 flex flex-col gap-5 bg-card border-border sticky top-[80px]">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Mail className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">Delivery Target</h2>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label>Email Address</Label>
              <Input 
                placeholder="your@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Notification Schedule</Label>
              <div className="flex gap-2 items-center">
                <span className="text-sm">Send daily at</span>
                <Input 
                  type="time" 
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3 border-t border-border">
              <Button className="w-full gap-2 h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                <BellRing className="w-5 h-5" /> Save Preferences
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
