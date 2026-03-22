"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Industry, Severity } from "@/lib/mockData";
import { useAppStore } from "@/lib/store";
import { ExternalLink, Filter, MapPin, Clock, Sparkles, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const INDUSTRIES: Industry[] = [
  "Hardware",
  "Cloud",
  "Software",
  "Consumer",
  "Healthcare",
  "Finance",
  "Automotive",
  "Robotics",
  "Manufacturing",
  "Legal",
  "Defense",
  "Security",
  "Media",
  "Education",
  "Agriculture",
  "Energy",
  "Research"
];

const SEVERITIES: Severity[] = ["LOW", "MODERATE", "ELEVATED", "HIGH", "CRITICAL"];
const TIMEFRAMES = ["1 Hour", "12 Hours", "24 Hours", "All Time"];

export default function NewsPage() {
  const events = useAppStore(state => state.events);
  const summary = useAppStore(state => state.summary);
  const fetchLiveNews = useAppStore(state => state.fetchLiveNews);
  
  const [selectedIndustries, setSelectedIndustries] = useState<Industry[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
  const [timeframe, setTimeframe] = useState<string>("All Time");

  useEffect(() => {
    fetchLiveNews();
  }, [fetchLiveNews]);

  const toggleIndustry = (ind: Industry) => {
    setSelectedIndustries(prev => 
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const toggleSeverity = (sev: Severity) => {
    setSelectedSeverities(prev => 
      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
    );
  };

  const showAll = () => {
    setSelectedIndustries([]);
    setSelectedSeverities([]);
    setTimeframe("All Time");
  };

  const isAllSelected = selectedIndustries.length === 0 && selectedSeverities.length === 0 && timeframe === "All Time";

  // Filter based on selected industry, severity, and timeframe
  const filteredData = events.filter(item => {
    // Return true if NO industry is selected, OR if the item's industry is exactly in the selected array
    const industryMatch = selectedIndustries.length === 0 || selectedIndustries.includes(item.industry);
    
    // Return true if NO severity is selected, OR if the item's severity is exactly in the selected array
    const severityMatch = selectedSeverities.length === 0 || selectedSeverities.includes(item.severity);
    
    // Time matching logic
    let timeMatch = true;
    if (timeframe !== "All Time") {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      let isWithinTime = false;
      
      const pubDate = item.publishedAt ? new Date(item.publishedAt).getTime() : NaN;
      if (!isNaN(pubDate)) {
        if (timeframe === "1 Hour") isWithinTime = now - pubDate <= 3600000;
        else if (timeframe === "12 Hours") isWithinTime = now - pubDate <= 12 * 3600000;
        else if (timeframe === "24 Hours") isWithinTime = now - pubDate <= 24 * 3600000;
      } else if (item.timeAgo) {
        const t = item.timeAgo.toLowerCase();
        if (timeframe === "1 Hour") {
          isWithinTime = t.includes("sec") || t.includes("min") || t === "live" || t === "now";
        } else if (timeframe === "12 Hours") {
          isWithinTime = t.includes("sec") || t.includes("min") || t === "live" || t === "now" || (t.includes("hour") && parseInt(t) <= 12);
        } else if (timeframe === "24 Hours") {
          isWithinTime = t.includes("sec") || t.includes("min") || t === "live" || t === "now" || (t.includes("hour") && parseInt(t) <= 24) || (t.includes("day") && parseInt(t) === 1);
        }
      }
      timeMatch = isWithinTime;
    }
    
    return industryMatch && severityMatch && timeMatch;
  });

  // Sort by publishedAt descending (newest first)
  filteredData.sort((a, b) => {
    const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return timeB - timeA;
  });

  const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6 h-full p-4 md:p-6 pb-8 max-w-[1600px] mx-auto w-full overflow-y-auto">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI News Feed</h1>
          <p className="text-muted-foreground mt-1">Continuous stream of AI developments and market impact.</p>
        </div>

          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-sm font-medium h-8 gap-1.5 px-2.5 shrink-0 transition-all outline-none">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {(!isAllSelected) && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                  {selectedIndustries.length + selectedSeverities.length + (timeframe !== "All Time" ? 1 : 0)}
                </Badge>
              )}
            </PopoverTrigger>
          <PopoverContent className="w-[320px] md:w-[480px] p-5 bg-stone-50/95 backdrop-blur-md border-border rounded-2xl shadow-2xl" align="end">
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <h4 className="font-bold text-base">Filters</h4>
                <button 
                  onClick={showAll}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${isAllSelected ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'}`}
                >
                  Show ALL
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">By Timeframe</h5>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-1 py-2 text-[12px] font-semibold rounded-lg border transition-all ${
                        timeframe === tf
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-black/5 border-transparent text-black/60 hover:bg-black/10 hover:text-black"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">By Severity</h5>
                  {selectedSeverities.length > 0 && (
                    <button onClick={() => setSelectedSeverities([])} className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {SEVERITIES.map((sev) => (
                    <button
                      key={sev}
                      onClick={() => toggleSeverity(sev)}
                      className={`px-1 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                        selectedSeverities.includes(sev)
                          ? sev === 'CRITICAL' ? 'bg-red-500/20 border-red-500/50 text-red-600 shadow-sm' :
                            sev === 'HIGH' ? 'bg-orange-500/20 border-orange-500/50 text-orange-600 shadow-sm' :
                            sev === 'ELEVATED' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-600 shadow-sm' :
                            sev === 'MODERATE' ? 'bg-lime-500/20 border-lime-500/50 text-lime-600 shadow-sm' :
                            'bg-green-500/20 border-green-500/50 text-green-600 shadow-sm'
                          : 'bg-black/5 border-transparent text-black/60 hover:bg-black/10 hover:text-black'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">By Industry</h5>
                  {selectedIndustries.length > 0 && (
                    <button onClick={() => setSelectedIndustries([])} className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind}
                      onClick={() => toggleIndustry(ind)}
                      className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-all ${
                        selectedIndustries.includes(ind)
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-black/5 border-transparent text-black/60 hover:bg-black/10 hover:text-black"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* The Daily Pulse: AI Market Brief */}
      {summary && summary.bullets && summary.bullets.length > 0 && (
        <Card className="relative overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-background to-background rounded-xl p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/60"></div>
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-lg tracking-tight flex items-center gap-2">
              AI Daily Pulse
              <span className="text-foreground font-bold text-sm bg-muted/50 px-2 py-0.5 rounded-md">{todayDate}</span>
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {summary.bullets.map((bullet, idx) => {
              const htmlContent = typeof bullet === 'string' ? bullet : bullet.html;
              const timeAgo = typeof bullet === 'string' ? null : bullet.timeAgo;
              
              return (
                <div key={idx} className="flex items-center gap-3 w-full justify-between group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" />
                    <p className="text-[15px] font-medium text-muted-foreground w-full truncate" dangerouslySetInnerHTML={{ __html: htmlContent }}></p>
                  </div>
                  {timeAgo && (
                    <span className="text-xs text-muted-foreground font-medium shrink-0 whitespace-nowrap bg-black/5 px-2 py-0.5 rounded ml-2">{timeAgo}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredData.map((news) => (
          <Card key={news.id} className="flex flex-col overflow-hidden bg-card border-border hover:border-primary/50 transition-colors group">
            <div className="p-5 flex flex-col h-full gap-4">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase">
                    {news.industry}
                  </Badge>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    news.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500' :
                    news.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-500' :
                    news.severity === 'ELEVATED' ? 'bg-yellow-500/20 text-yellow-500' :
                    news.severity === 'MODERATE' ? 'bg-lime-500/20 text-lime-500' :
                    'bg-green-500/20 text-green-500'
                  }`}>
                    {news.severity}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{news.source}</span>
              </div>
              
              <div className="flex-1 mt-1 z-10 relative">
                <a href={news.sourceUrl} target="_blank" rel="noopener noreferrer" className="block group-hover:text-primary transition-colors cursor-pointer w-fit">
                  <h3 className="text-lg font-bold leading-tight inline-flex items-center gap-1.5 hover:underline decoration-primary underline-offset-2">
                    {news.title}
                    <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                  </h3>
                </a>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-3 leading-relaxed pointer-events-none">{news.summary}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>{news.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{news.timeAgo}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filteredData.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/5">
            <Filter className="w-8 h-8 mb-3 opacity-20" />
            <p className="font-medium">No active news found for these filters.</p>
            <Button variant="link" onClick={showAll} className="mt-2">Clear all filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
