"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { fetchLiveEquities, fetchMarketHistory, fetchAnalystBrief, EquityData, HistoryData, AnalystBrief } from "@/lib/market";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";

const PERIODS = ['1W', '1M', '6M', '1Y', 'YTD'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length > 0 && payload[0]) {
    return (
      <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-3 shadow-lg">
        <p className="text-[#94a3b8] text-xs mb-1 font-medium">{label}</p>
        <p className="font-bold text-base" style={{ color: payload[0]?.color }}>
          ${Number(payload[0]?.value || 0).toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function MarketPage() {
  const [equities, setEquities] = useState<EquityData[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isPollingError, setIsPollingError] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<string>('1Y');
  
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [analystBrief, setAnalystBrief] = useState<AnalystBrief | null>(null);
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadEquities = async () => {
      try {
        setListError(null);
        const data = await fetchLiveEquities();
        if (mounted) {
          setEquities(data);
          setHasInitialData(true);
          setIsPollingError(false);
          if (data.length > 0 && !activeTicker) {
            setActiveTicker(data[0].ticker);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setListError(err.message || "Failed to load equities");
          setIsPollingError(true);
        }
      } finally {
        if (mounted) setIsLoadingList(false);
      }
    };

    loadEquities();
    const interval = setInterval(loadEquities, 15000); // 15 seconds poll
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []); // Only fetch equities list on mount

  useEffect(() => {
    let mounted = true;
    if (!activeTicker) return;

    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const data = await fetchMarketHistory(activeTicker, activePeriod);
        if (mounted) {
          setHistoryData(data);
        }
      } catch (err: any) {
        console.error("Failed to load history", err);
        if (mounted) setHistoryData([]);
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { mounted = false; };
  }, [activeTicker, activePeriod]);

  useEffect(() => {
    let mounted = true;
    if (!activeTicker) return;

    const loadBrief = async () => {
      try {
        setIsLoadingBrief(true);
        setAnalystBrief(null);
        const data = await fetchAnalystBrief(activeTicker);
        if (mounted) {
          setAnalystBrief(data);
        }
      } catch (err: any) {
        console.error("Failed to load analyst brief", err);
      } finally {
        if (mounted) setIsLoadingBrief(false);
      }
    };

    loadBrief();
    return () => { mounted = false; };
  }, [activeTicker]);

  // Determine chart color based on performance over the period
  const isPositivePeriod = historyData && historyData.length >= 2 
    ? (historyData[historyData.length - 1]?.price ?? 0) >= (historyData[0]?.price ?? 0) 
    : true;
  const chartColor = isPositivePeriod ? "#22c55e" : "#ef4444";
  
  const activeEquity = equities?.find(e => e.ticker === activeTicker);

  return (
    <div className="flex flex-col gap-6 h-full p-4 md:p-6 pb-32 max-w-[1600px] mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Market Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">Live AI equities tracking and historical performance.</p>
        </div>
        {isPollingError && hasInitialData && (
          <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-3 py-1.5 rounded-full text-xs font-semibold animate-in fade-in zoom-in duration-300">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Live feed paused - Retrying...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 flex-1 min-h-0">
        
        {listError && (!equities || equities.length === 0) ? (
          <div className="lg:col-span-10 flex items-center justify-center min-h-[400px]">
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-lg text-center max-w-md">
              <div className="text-2xl mb-2">⚠️</div>
              <h3 className="font-bold text-lg mb-1">Connection Error</h3>
              <p className="text-sm opacity-80 mb-4">Failed to connect to market data feed. Please try again.</p>
              <Button variant="outline" className="border-red-500/30 hover:bg-red-500/10 text-red-500" onClick={() => window.location.reload()}>
                Retry Connection
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* LEFT COLUMN: Ticker List (30% approx -> 3/10 columns) */}
            <Card className="lg:col-span-3 flex flex-col border-border shadow-sm overflow-hidden h-[calc(100vh-200px)]">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="font-semibold text-lg">AI Watchlist</h3>
                <p className="text-xs text-muted-foreground">Live real-time quotes</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isLoadingList && (!equities || equities.length === 0) ? (
                  <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading quotes...</div>
                ) : (
                  equities?.map((eq) => {
                    const isUp = eq?.change >= 0;
                    const isActive = activeTicker === eq?.ticker;
                    return (
                      <button
                        key={eq?.ticker}
                        onClick={() => setActiveTicker(eq?.ticker)}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                          isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{eq?.ticker}</div>
                          <div className="text-xs text-muted-foreground">AI Sector</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-medium">${eq?.price?.toFixed(2)}</div>
                          <div className={`text-xs font-semibold flex items-center justify-end ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                            {isUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {Math.abs(eq?.changePercent || 0).toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </Card>

            {/* RIGHT COLUMN: Interactive Chart & AI Brief (70% approx -> 7/10 columns) */}
            <div className="lg:col-span-7 flex flex-col gap-6 min-h-[calc(100vh-200px)]">
              <Card className="flex flex-col border-border shadow-sm p-6 flex-1 min-h-[350px]">
                {activeTicker ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-3xl font-bold">{activeTicker}</h2>
                        <div className="flex items-end gap-3 mt-1">
                          <span className="text-2xl font-mono">${activeEquity?.price?.toFixed(2) || '---'}</span>
                          {activeEquity && (
                            <span className={`text-sm font-semibold mb-1 flex items-center ${activeEquity?.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {activeEquity?.change >= 0 ? '+' : ''}{activeEquity?.change?.toFixed(2)} ({activeEquity?.changePercent?.toFixed(2)}%) Today
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
                        {PERIODS.map(p => (
                          <Button
                            key={p}
                            variant={activePeriod === p ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActivePeriod(p)}
                            className={`text-xs h-7 px-3 ${activePeriod === p ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 w-full relative">
                      {isLoadingHistory && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                          <div className="animate-pulse text-muted-foreground font-medium">Loading history...</div>
                        </div>
                      )}
                      
                      {(!historyData || historyData.length === 0 || historyData[0]?.price === undefined) && !isLoadingHistory ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                          <div className="text-muted-foreground text-sm flex items-center gap-2">
                            <span className="text-lg">⚠️</span> Failed to load chart data
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={historyData || []} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#94a3b8" 
                              fontSize={12} 
                              tickLine={false} 
                              axisLine={false}
                              minTickGap={30}
                              tickFormatter={(val) => {
                                // Very simple formatter: just show Month/Day or Year depending on length
                                if (!val) return '';
                                const parts = val.split('-');
                                if (parts.length < 3) return val;
                                if (activePeriod === '1W' || activePeriod === '1M') return `${parts[1]}/${parts[2]}`;
                                if (activePeriod === '1Y' || activePeriod === 'YTD') return `${parts[0]}-${parts[1]}`;
                                return val;
                              }}
                            />
                            <YAxis 
                              stroke="#94a3b8" 
                              fontSize={12} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={(val) => `$${val}`} 
                              domain={['auto', 'auto']}
                            />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="price" 
                              stroke={chartColor} 
                              strokeWidth={2} 
                              fillOpacity={1} 
                              fill="url(#colorPrice)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select a ticker from the watchlist to view its chart.
                  </div>
                )}
              </Card>

              {activeTicker && (
                <Card className="p-6 border-primary/20 shadow-sm bg-gradient-to-br from-primary/5 via-background to-background relative shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-bold text-lg">AI Analyst Brief: {activeTicker}</h3>
                  </div>
                  <div className="space-y-4 relative z-10">
                    {isLoadingBrief ? (
                      <>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          AI Agent is currently reviewing real-time SEC filings, news sentiment, and technical indicators for {activeTicker}...
                        </p>
                        <div className="space-y-2 animate-pulse">
                          <div className="h-2 w-full bg-primary/20 rounded"></div>
                          <div className="h-2 w-3/4 bg-primary/20 rounded"></div>
                          <div className="h-2 w-5/6 bg-primary/20 rounded"></div>
                        </div>
                      </>
                    ) : analystBrief ? (
                      <div className="text-sm text-muted-foreground leading-loose whitespace-pre-wrap">
                        {analystBrief.analysis}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unable to fetch analyst brief at this time. Please try again later.</p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
