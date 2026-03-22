"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ZAxis, Label,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  Cell, AreaChart, Area, BarChart, Bar, LabelList
} from 'recharts';
import { Trophy, Zap, Cpu, ArrowUpDown, Code, Eye, Wrench, Swords, Search, ChevronLeft, ChevronRight, Plus, X, Info } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TopModel, GlobalModel } from "../../lib/api";

const eloHistoryData = [
  { month: 'Oct 2025', 'Gemini 3.0 Ultra': 1300, 'Claude 3.7 Opus': 1290, 'GPT-5.4 Thinking': 1310, 'DeepSeek R2': 1280 },
  { month: 'Nov 2025', 'Gemini 3.0 Ultra': 1315, 'Claude 3.7 Opus': 1310, 'GPT-5.4 Thinking': 1330, 'DeepSeek R2': 1300 },
  { month: 'Dec 2025', 'Gemini 3.0 Ultra': 1330, 'Claude 3.7 Opus': 1335, 'GPT-5.4 Thinking': 1350, 'DeepSeek R2': 1320 },
  { month: 'Jan 2026', 'Gemini 3.1 Pro': 1350, 'Claude 3.7 Opus': 1360, 'GPT-5.4 Thinking': 1370, 'DeepSeek R2': 1345 },
  { month: 'Feb 2026', 'Gemini 3.1 Pro': 1370, 'Claude 3.7 Opus': 1375, 'GPT-5.4 Thinking': 1380, 'DeepSeek R2': 1355 },
  { month: 'Mar 2026', 'Gemini 3.1 Pro': 1385, 'Claude 3.7 Opus': 1380, 'GPT-5.4 Thinking': 1390, 'DeepSeek R2': 1365 },
];

import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black/90 text-white p-3 rounded-lg border border-white/10 shadow-xl text-xs font-medium z-50">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-bold text-sm">{data.name}</p>
          <span className="text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded">{data.provider}</span>
        </div>
        <p className="mt-1"><span className="text-blue-400">In / Out:</span> ${data.inputCost.toFixed(2)} / ${data.outputCost.toFixed(2)} per 1M</p>
        <p><span className="text-green-400">Elo:</span> {data.elo || '—'}</p>
        <p><span className="text-yellow-400">Context:</span> {data.context}k</p>
      </div>
    );
  }
  return null;
};

const CustomGridTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 text-white p-3 rounded-lg border border-white/10 shadow-xl text-xs z-50 min-w-[200px] max-w-[400px]">
        <p className="font-bold text-sm mb-2 pb-1 border-b border-white/20">
          {label || payload[0]?.payload?.subject || payload[0]?.payload?.name || payload[0]?.payload?.month || "Metrics"}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="truncate text-[10px] text-white/80" title={entry.name}>{entry.name}</span>
              </div>
              <span className="font-mono text-[10px] font-bold shrink-0">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomScatterLabel = (props: any) => {
  const { x, y, value } = props;
  return (
    <text x={x} y={y - 12} fill="currentColor" fontSize={11} fontWeight={500} textAnchor="middle">
      {value}
    </text>
  );
};

export function ModelsClient({ topModels, globalModels }: { topModels: TopModel[], globalModels: GlobalModel[] }) {
  const [sortKey, setSortKey] = useState<keyof TopModel>("elo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filtering State
  const [activeFilter, setActiveFilter] = useState<"All" | "Proprietary" | "Open Source" | "Open Weights">("All");
  const [activeProvider, setActiveProvider] = useState<string>("All");

  // Selection & Versus Mode State (Universal Cart)
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Universal Search Combobox State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle click outside for universal search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleModelSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setSelectedModels(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(m => m !== id);
        return next;
      } else {
        return [...prev, id];
      }
    });
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const handleSort = (key: keyof TopModel) => {
    const newOrder = sortKey === key && sortOrder === "desc" ? "asc" : "desc";
    setSortKey(key);
    setSortOrder(newOrder);
  };

  // --- TABLE DATA LOGIC ---
  let tableModels: TopModel[] = [];

  if (activeProvider !== "All") {
    // Provider specific: show all matching models from global database
    const providerMatches = globalModels.filter(m => 
      m.provider.toLowerCase() === activeProvider.toLowerCase() || 
      m.provider.toLowerCase().includes(activeProvider.toLowerCase())
    );
    
    tableModels = providerMatches.map(g => {
      const topMatch = topModels.find(t => t.id === g.id);
      if (topMatch) return topMatch;
      
      return {
        ...g,
        type: "Open Source", // default fallback
        mmlu: 0,
        humanEval: 0,
        math: 0,
        speed: 0,
        ttft: 0,
        elo: 0,
        vision: false,
        tools: false
      } as TopModel;
    });
  } else {
    tableModels = [...topModels];
  }

  // Apply secondary Type filter
  if (activeFilter !== "All") {
    tableModels = tableModels.filter(m => m.type === activeFilter);
  }

  // Sort the Table
  const sortedTableModels = tableModels.sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    if (typeof aVal === "string" && typeof bVal === "string") return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return 0;
  });

  // --- CHART DATA LOGIC ---
  let chartModels: TopModel[] = [];

  const defaultChartModels = topModels.filter(m => 
    ["GPT-5.4 Thinking", "Gemini 3.1 Pro", "Claude 3.7 Opus", "Grok 3", "DeepSeek R2"].includes(m.name)
  );

  if (selectedModels.length > 0) {
    // Show only explicitly selected models
    chartModels = selectedModels.map(id => {
      const topMatch = topModels.find(t => t.id === id);
      if (topMatch) return topMatch;
      const gMatch = globalModels.find(m => m.id === id);
      if (gMatch) {
        return {
          ...gMatch,
          type: "Open Source",
          mmlu: 0,
          humanEval: 0,
          math: 0,
          speed: 0,
          ttft: 0,
          elo: 0,
          vision: false,
          tools: false
        } as TopModel;
      }
      return null;
    }).filter(Boolean) as TopModel[];
  } else {
    // Default clash of the titans state
    chartModels = defaultChartModels;
  }

  // Dynamic Radar
  const radarData = [
    { subject: 'Reasoning (MMLU)', fullMark: 100 },
    { subject: 'Coding (HumanEval)', fullMark: 100 },
    { subject: 'Math (MATH)', fullMark: 100 },
    { subject: 'Speed (Tk/s)', fullMark: 150 },
    { subject: 'Context (k)', fullMark: 250 }, 
  ].map(metric => {
    const obj: Record<string, string | number> = { subject: metric.subject, fullMark: metric.fullMark };
    chartModels.forEach(model => {
      if (metric.subject === 'Reasoning (MMLU)') obj[model.name] = model.mmlu || 0;
      if (metric.subject === 'Coding (HumanEval)') obj[model.name] = model.humanEval || 0;
      if (metric.subject === 'Math (MATH)') obj[model.name] = model.math || 0;
      if (metric.subject === 'Speed (Tk/s)') obj[model.name] = Math.min(150, model.speed || 0);
      if (metric.subject === 'Context (k)') obj[model.name] = Math.min(250, model.context || 0);
    });
    return obj;
  });

  const capabilitiesData = [
    { name: 'Coding' },
    { name: 'Math' },
    { name: 'Reasoning' }
  ].map(metric => {
    const obj: Record<string, string | number> = { name: metric.name };
    chartModels.forEach(model => {
      if (metric.name === 'Coding') obj[model.name] = model.humanEval || 0;
      if (metric.name === 'Math') obj[model.name] = model.math || 0;
      if (metric.name === 'Reasoning') obj[model.name] = model.mmlu || 0;
    });
    return obj;
  });

  const colors = [
    "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6",
    "#f97316", "#0ea5e9", "#84cc16", "#6366f1", "#d946ef", "#a855f7", "#06b6d4",
    "#22c55e", "#eab308", "#f43f5e", "#64748b", "#fb7185", "#e879f9", "#a78bfa",
    "#818cf8", "#38bdf8", "#2dd4bf", "#4ade80", "#a3e635", "#fcd34d", "#fb923c",
    "#f87171", "#94a3b8", "#9ca3af", "#a8a29e"
  ];

  const getTopModel = (key: keyof TopModel) => {
    if (topModels.length === 0) return null;
    return [...topModels].sort((a, b) => (b[key] as number) - (a[key] as number))[0];
  };

  const topElo = getTopModel("elo");
  const topCoding = getTopModel("humanEval");
  const topReasoningOpen = [...topModels].filter(m => m.type !== "Proprietary").sort((a, b) => b.elo - a.elo)[0];
  const topSpeed = getTopModel("speed");

  // Universal Combobox Search Logic
  const filteredUniversalModels = globalModels.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8); // Show top 8 matches

  // Global Models Logic for Bottom Table removed

  return (
    <div className="flex flex-col gap-8 h-full p-4 md:p-6 pb-32 max-w-[1600px] mx-auto w-full overflow-y-auto">
      
      {/* SECTION 1: THE DASHBOARD */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Frontier Models Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Live metrics and curated analytics for the best models.
            </p>
          </div>
        </div>

        {/* COMPACT KPI RIBBON */}
        {topElo && topCoding && topReasoningOpen && topSpeed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 flex flex-col items-center justify-center bg-card border-border shadow-sm relative text-center min-h-[110px]">
            <Trophy className="absolute top-3 right-3 w-4 h-4 text-yellow-500 opacity-80 shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Top Multimodal</span>
            <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener noreferrer" className="text-2xl font-bold truncate w-full px-2 hover:underline cursor-pointer">Gemini 3.1 Pro</a>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded mt-1.5">Google</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center bg-card border-border shadow-sm relative text-center min-h-[110px]">
            <Code className="absolute top-3 right-3 w-4 h-4 text-blue-500 opacity-80 shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Best Coding</span>
            {topCoding.url ? (
              <a href={topCoding.url} target="_blank" rel="noopener noreferrer" className="text-2xl font-bold truncate w-full px-2 hover:underline cursor-pointer">{topCoding.name}</a>
            ) : (
              <span className="text-2xl font-bold truncate w-full px-2">{topCoding.name}</span>
            )}
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded mt-1.5">{topCoding.provider}</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center bg-card border-border shadow-sm relative text-center min-h-[110px]">
            <Zap className="absolute top-3 right-3 w-4 h-4 text-orange-500 opacity-80 shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Top Open Weights</span>
            {topReasoningOpen.url ? (
              <a href={topReasoningOpen.url} target="_blank" rel="noopener noreferrer" className="text-2xl font-bold truncate w-full px-2 hover:underline cursor-pointer">{topReasoningOpen.name}</a>
            ) : (
              <span className="text-2xl font-bold truncate w-full px-2">{topReasoningOpen.name}</span>
            )}
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded mt-1.5">{topReasoningOpen.provider}</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center bg-card border-border shadow-sm relative text-center min-h-[110px]">
            <Cpu className="absolute top-3 right-3 w-4 h-4 text-purple-500 opacity-80 shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Fast Reasoning</span>
            {topSpeed.url ? (
              <a href={topSpeed.url} target="_blank" rel="noopener noreferrer" className="text-2xl font-bold truncate w-full px-2 hover:underline cursor-pointer">{topSpeed.name}</a>
            ) : (
              <span className="text-2xl font-bold truncate w-full px-2">{topSpeed.name}</span>
            )}
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded mt-1.5">{topSpeed.provider}</span>
          </Card>
        </div>
        )}

        {/* MASTER CHART TABBED CONTAINER */}
        <Card className="p-1 bg-card border-border shadow-sm w-full">
          <Tabs defaultValue="cost" className="w-full">
            <div className="px-3 pt-3 pb-2 border-b border-border/50 flex items-center justify-between">
              <TabsList className="h-8 bg-muted/50 p-1">
                <TabsTrigger value="cost" className="text-xs font-medium px-4 h-6">Cost vs Intelligence</TabsTrigger>
                <TabsTrigger value="arena" className="text-xs font-medium px-4 h-6">Performance History</TabsTrigger>
                <TabsTrigger value="radar" className="text-xs font-medium px-4 h-6">Skill Breakdown</TabsTrigger>
                <TabsTrigger value="winrates" className="text-xs font-medium px-4 h-6">Head-to-Head Wins</TabsTrigger>
              </TabsList>
              {selectedModels.length > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-wider">
                  Compare Mode Active ({selectedModels.length})
                </Badge>
              )}
            </div>

            <div className="p-4 h-[340px]">
              <TabsContent value="cost" className="h-full w-full m-0 data-[state=inactive]:hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 40, right: 70, left: 40, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      type="number" dataKey="inputCost" name="Input Cost ($)" stroke="#64748b" fontSize={12} 
                      tickFormatter={(val) => `$${val.toFixed(2)}`}
                      domain={['auto', 'auto']}
                    >
                      <Label value="Input Cost per 1M Tokens" position="insideBottom" offset={-15} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                    </XAxis>
                    <YAxis 
                      type="number" dataKey="elo" name="Arena Elo" stroke="#64748b" fontSize={12} 
                      domain={['auto', 'auto']} 
                    >
                      <Label value="Arena Elo Score" angle={-90} position="insideLeft" offset={-10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                    </YAxis>
                    <ZAxis type="number" dataKey="context" range={[100, 1000]} name="Context" />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Scatter name="Models" data={chartModels.filter(m => m.elo > 0)} fill="#3b82f6" fillOpacity={0.6} stroke="#2563eb" strokeWidth={2}>
                      <LabelList dataKey="name" content={<CustomScatterLabel />} />
                      {chartModels.filter(m => m.elo > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="arena" className="h-full w-full m-0 data-[state=inactive]:hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eloHistoryData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                    <defs>
                      {chartModels.filter(m => m.elo > 0).map((model, idx) => (
                        <linearGradient key={`grad-${model.id}`} id={`color-${idx % colors.length}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']}>
                      <Label value="Arena Elo Score" angle={-90} position="insideLeft" offset={-5} style={{ textAnchor: 'middle', fill: 'currentColor', opacity: 0.7, fontSize: 12, fontWeight: 500 }} />
                    </YAxis>
                    <RechartsTooltip content={<CustomGridTooltip />} cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    {chartModels.filter(m => m.elo > 0).map((model, idx) => (
                      <Area key={model.id} type="monotone" dataKey={model.name} stroke={colors[idx % colors.length]} strokeWidth={2} fillOpacity={1} fill={`url(#color-${idx % colors.length})`} />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="radar" className="h-full w-full m-0 data-[state=inactive]:hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    {chartModels.map((model, idx) => (
                      <Radar key={model.id} name={model.name} dataKey={model.name} stroke={colors[idx % colors.length]} fill={colors[idx % colors.length]} fillOpacity={0.2} />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <RechartsTooltip content={<CustomGridTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="winrates" className="h-full w-full m-0 data-[state=inactive]:hidden flex flex-col">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capabilitiesData} margin={{ top: 35, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 10', 105]} />
                      <RechartsTooltip content={<CustomGridTooltip />} cursor={{ fill: 'transparent' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      {chartModels.map((model, idx) => (
                        <Bar key={model.id} dataKey={model.name} fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]}>
                          <LabelList dataKey={model.name} position="top" angle={-45} dy={-10} dx={5} fontSize={11} fontWeight="bold" fill="currentColor" />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground mt-4 shrink-0 border border-border/50">
                  <span className="font-semibold text-foreground">Transparency Note:</span> Win rates represent the statistical probability of a model winning a randomized, blind human A/B test against baseline models. Data is strictly sourced from millions of human votes via LMSYS Chatbot Arena.
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* DETAILED TABLE */}
        <Card className="bg-card border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex flex-col gap-1 w-full max-w-2xl">
              <h3 className="text-lg font-semibold">Top 20 Leaderboard</h3>
              <p className="text-xs text-muted-foreground mb-2">Click to select and compare frontier models head-to-head.</p>
              
              {/* Unified Omnibar Search */}
              <div className="relative w-full" ref={searchRef}>
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search to add any models via OpenRouter..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveFilter("All"); // Reset filter when searching
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
                  />
                </div>
                
                {isSearchOpen && searchQuery && (
                  <div className="absolute top-11 left-0 right-0 bg-card border border-border rounded-md shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {filteredUniversalModels.length > 0 ? (
                        filteredUniversalModels.map(model => {
                          const isSelected = selectedModels.includes(model.id);
                          return (
                            <div 
                              key={model.id}
                              onClick={() => toggleModelSelection(model.id)}
                              className={`flex items-center justify-between p-2.5 hover:bg-muted rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{model.name}</span>
                                <span className="text-xs text-muted-foreground">{model.provider}</span>
                              </div>
                              <button className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border">
                                {isSelected ? <Swords className="w-3 h-3 text-primary" /> : <Plus className="w-3 h-3 text-muted-foreground" />}
                              </button>
                            </div>
                          )
                        })
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">No models found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
              {/* Quick Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Provider</span>
                  <select 
                    value={activeProvider}
                    onChange={(e) => {
                      setActiveProvider(e.target.value);
                    }}
                    className="h-7 text-xs rounded-full border border-border bg-transparent px-3 py-1 text-muted-foreground hover:border-black/30 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-semibold"
                  >
                    {["All", "OpenAI", "Google", "Anthropic", "Meta", "Mistral", "DeepSeek", "X"].map(provider => (
                      <option key={provider} value={provider} className="text-foreground bg-background">{provider}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 sm:ml-2">Type</span>
                  {(["All", "Proprietary", "Open Source", "Open Weights"] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                        activeFilter === filter
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-muted-foreground border-border hover:border-black/30 hover:text-foreground"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          <div className="overflow-x-auto flex-1">
            <Table className="text-sm">
              <TableHeader className="bg-transparent hover:bg-transparent sticky top-0 bg-card z-10 shadow-sm">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1 font-semibold">Model <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1 font-semibold">Features <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('elo')}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center justify-end gap-1 font-semibold cursor-help">
                            Arena Elo <Info className="w-3.5 h-3.5 text-muted-foreground ml-0.5" /> <ArrowUpDown className="w-3 h-3 opacity-50" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover text-popover-foreground border border-border shadow-md">
                          <p className="max-w-xs text-xs">Data sourced from LMSYS Chatbot Arena. Win rates represent the probability of winning a randomized, blind human A/B test against baseline models.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('mmlu')}>
                    <div className="flex items-center justify-end gap-1 font-semibold">MMLU <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('humanEval')}>
                    <div className="flex items-center justify-end gap-1 font-semibold">HumanEval <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('context')}>
                    <div className="flex items-center justify-end gap-1 font-semibold">Context (k) <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('ttft')}>
                    <div className="flex items-center justify-end gap-1 font-semibold">TTFT (s) <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('speed')}>
                    <div className="flex items-center justify-end gap-1 font-semibold">Speed (Tk/s) <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('inputCost')}>
                    <div className="flex items-center justify-end gap-1 font-semibold">Input/1M <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                  <TableHead className="text-right py-3 h-10 cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('outputCost')}>
                    <div className="flex items-center justify-end gap-1 font-semibold">Output/1M <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTableModels.map((model) => {
                  const isSelected = selectedModels.includes(model.id);
                  return (
                  <TableRow 
                    key={model.id} 
                    onClick={(e) => toggleModelSelection(model.id, e)}
                    className={`border-border transition-colors border-b last:border-0 h-11 cursor-pointer
                      ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-black/[0.02]'}
                    `}
                  >
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        {model.url ? (
                          <a href={model.url} target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer">
                            {model.name}
                          </a>
                        ) : (
                          <span>{model.name}</span>
                        )}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-muted text-muted-foreground border-border/50">
                          {model.provider}
                        </Badge>
                        {model.badge && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase border-primary/20 text-primary bg-primary/5 font-semibold tracking-wider hidden xl:inline-flex whitespace-nowrap">
                            {model.badge}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                          model.type === 'Proprietary' ? 'bg-blue-100 text-blue-700' :
                          model.type === 'Open Source' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {model.type === 'Proprietary' ? 'PROP' : 'OPEN'}
                        </span>
                        {model.vision && <div title="Vision Capable"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                        {model.tools && <div title="Function Calling"><Wrench className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">{model.elo || "—"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{model.mmlu ? `${model.mmlu}%` : "—"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{model.humanEval ? `${model.humanEval}%` : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{model.context}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{model.ttft || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{model.speed || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 font-medium">${model.inputCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-rose-600 font-medium">${model.outputCost.toFixed(2)}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* UNIVERSAL STICKY COMPARE ACTION BAR */}
      {selectedModels.length > 0 && (() => {
        const selectedCount = selectedModels.length;
        return (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-background/85 backdrop-blur-xl border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.08)] py-4 px-6">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
              <span className="shrink-0 font-bold text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-full whitespace-nowrap">
                {selectedCount} Selected
              </span>
              
              <div className="flex-1 flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-2 items-center mask-image-edges pb-1">
                {selectedModels.map(id => {
                  // Try to find in top models first, then global models
                  const m = topModels.find(t => t.id === id) || globalModels.find(g => g.id === id);
                  if (!m) return null;
                  return (
                    <div key={m.id} className="flex items-center gap-1.5 bg-muted/50 border border-border pl-3 pr-2 py-1.5 rounded-full text-xs font-medium shrink-0">
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{m.name}</span>
                      <button 
                        onClick={(e) => toggleModelSelection(m.id, e)}
                        className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <div className="shrink-0">
                <button 
                  onClick={() => {
                    setSelectedModels([]);
                  }}
                  className="px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-sm whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25 shadow-lg"
                >
                  <X className="w-4 h-4" /> 
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )})()}
    </div>
  );
}