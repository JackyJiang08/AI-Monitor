"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchTradingSignal, toggleAutoTrade, fetchAutoTradeStatus, PortfolioData } from "@/lib/trading";
import { fetchLiveEquities, EquityData } from "@/lib/market";
import { Sparkles } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is available for toasts
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from "@/lib/store";

const DEFAULT_PORTFOLIO: PortfolioData = {
  buying_power: 100000,
  total_value: 100000,
  day_pl: 0,
  holdings: [],
  history: [],
  equity_history: []
};

export default function TradingPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [equities, setEquities] = useState<EquityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPollingError, setIsPollingError] = useState(false);
  
  // Order Form State
  const [orderTicker, setOrderTicker] = useState("");
  const [orderShares, setOrderShares] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Copilot State
  const [signal, setSignal] = useState<{ signal: string, reason: string } | null>(null);
  const [isFetchingSignal, setIsFetchingSignal] = useState(false);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);

  const { isLoggedIn } = useAuthStore();
  const equitiesRef = useRef<EquityData[]>([]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize and persist portfolio
  useEffect(() => {
    let initial = { 
      ...DEFAULT_PORTFOLIO,
      equity_history: [{ timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), equity: 100000 }]
    };
    
    if (isLoggedIn) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('portfolio');
        if (saved) {
          try {
            initial = JSON.parse(saved);
          } catch (e) {
            console.error('Failed to parse saved portfolio', e);
          }
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('portfolio');
      }
    }
    setPortfolio(initial);
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && portfolio && typeof window !== 'undefined') {
      localStorage.setItem('portfolio', JSON.stringify(portfolio));
    }
  }, [portfolio, isLoggedIn]);

  const loadData = async () => {
    try {
      if (!equities.length) setIsLoading(true);
      setLoadError(null);
      const [eqData, autoStatus] = await Promise.all([
        fetchLiveEquities(),
        fetchAutoTradeStatus().catch(() => ({ enabled: false }))
      ]);
      setEquities(eqData);
      equitiesRef.current = eqData;
      setAutoTradeEnabled(autoStatus.enabled);
      setIsPollingError(false);

      // Update local portfolio live prices
      setPortfolio(prev => {
        if (!prev) return prev;
        let newTotalValue = prev.buying_power;
        const newHoldings = prev.holdings.map(h => {
          const liveEq = eqData.find(e => e.ticker === h.ticker);
          const currentPrice = liveEq ? liveEq.price : h.current_price;
          const totalReturn = (currentPrice - h.avg_price) * h.shares;
          newTotalValue += currentPrice * h.shares;
          return { ...h, current_price: currentPrice, total_return: totalReturn };
        });
        
        let newEquityHistory = [...prev.equity_history];
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (newEquityHistory.length === 0 || newEquityHistory[newEquityHistory.length - 1].timestamp !== currentTime) {
          newEquityHistory = [...newEquityHistory, { timestamp: currentTime, equity: newTotalValue }];
          if (newEquityHistory.length > 50) newEquityHistory = newEquityHistory.slice(-50);
        } else {
          newEquityHistory[newEquityHistory.length - 1] = {
            ...newEquityHistory[newEquityHistory.length - 1],
            equity: newTotalValue
          };
        }
        
        return {
          ...prev,
          total_value: newTotalValue,
          day_pl: newTotalValue - 100000,
          holdings: newHoldings,
          equity_history: newEquityHistory
        };
      });

    } catch (err: any) {
      console.error("Failed to load trading data", err);
      if (!equities.length) {
        setLoadError("Failed to connect to market data feed.");
      } else {
        setIsPollingError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoTrade = async (enabled: boolean) => {
    try {
      // Optimistic update
      setAutoTradeEnabled(enabled);
      await toggleAutoTrade(enabled);
      toast.success(`LLM Auto-Trading ${enabled ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      // Revert on failure
      setAutoTradeEnabled(!enabled);
      toast.error("Failed to toggle auto-trading");
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s refresh for live trading feel
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchSignal = async () => {
      if (!orderTicker || orderTicker.trim() === "") {
        setSignal(null);
        return;
      }
      
      const isValidTicker = equities.some(e => e.ticker.toUpperCase() === orderTicker.toUpperCase());
      if (!isValidTicker) {
        setSignal(null);
        return;
      }

      try {
        setIsFetchingSignal(true);
        const data = await fetchTradingSignal(orderTicker.toUpperCase());
        if (mounted) {
          setSignal(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) {
          setIsFetchingSignal(false);
        }
      }
    };

    const debounceTimer = setTimeout(fetchSignal, 500);
    return () => {
      mounted = false;
      clearTimeout(debounceTimer);
    };
  }, [orderTicker, equities]);

  const handleOrder = async (action: 'buy' | 'sell') => {
    if (!orderTicker || !orderShares || orderShares <= 0) {
      toast.error("Please enter a valid ticker and share quantity");
      return;
    }

    try {
      setIsSubmitting(true);
      const ticker = orderTicker.toUpperCase();
      const shares = Number(orderShares);
      const liveEq = equitiesRef.current.find(e => e.ticker === ticker);
      const price = liveEq ? liveEq.price : 0;
      
      if (price <= 0) {
        throw new Error("Invalid ticker or price unavailable.");
      }
      
      setPortfolio(prev => {
        if (!prev) return prev;
        let newBp = prev.buying_power;
        let newHoldings = [...prev.holdings];
        const cost = price * shares;
        
        if (action === 'buy') {
          if (cost > newBp) {
            throw new Error("Insufficient buying power.");
          }
          newBp -= cost;
          const existingIndex = newHoldings.findIndex(h => h.ticker === ticker);
          if (existingIndex !== -1) {
            const existing = newHoldings[existingIndex];
            const totalCost = (existing.shares * existing.avg_price) + cost;
            newHoldings[existingIndex] = {
              ...existing,
              shares: existing.shares + shares,
              avg_price: totalCost / (existing.shares + shares)
            };
          } else {
            newHoldings = [...newHoldings, { ticker, shares, avg_price: price, current_price: price, total_return: 0 }];
          }
        } else {
          const existingIndex = newHoldings.findIndex(h => h.ticker === ticker);
          const existing = existingIndex !== -1 ? newHoldings[existingIndex] : null;
          if (!existing || existing.shares < shares) {
            throw new Error("Insufficient shares to sell.");
          }
          newBp += cost;
          if (existing.shares === shares) {
            newHoldings = newHoldings.filter(h => h.ticker !== ticker);
          } else {
            newHoldings[existingIndex] = {
              ...existing,
              shares: existing.shares - shares
            };
          }
        }
        
        const newHistory = [...prev.history, {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: action.toUpperCase(),
          ticker,
          shares,
          price,
          reason: "Manual User Order"
        }];
        
        return { ...prev, buying_power: newBp, holdings: newHoldings, history: newHistory };
      });
      
      toast.success(`${action.toUpperCase()} order executed for ${shares} shares of ${ticker}`);
      setOrderTicker("");
      setOrderShares("");
    } catch (err: any) {
      toast.error(err.message || "Order failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find live price for estimated cost
  const selectedEq = equities.find(e => e.ticker.toUpperCase() === orderTicker.toUpperCase());
  const estPrice = selectedEq ? selectedEq.price : 0;
  const estCost = estPrice * (Number(orderShares) || 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (!isMounted) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Loading trading interface...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paper Trading</h1>
          <p className="text-muted-foreground mt-1">Live market execution and portfolio tracking.</p>
        </div>
        {isPollingError && portfolio && (
          <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-3 py-1.5 rounded-full text-xs font-semibold animate-in fade-in zoom-in duration-300">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Live feed paused - Retrying...
          </div>
        )}
      </div>

      {loadError && !portfolio ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-lg text-center max-w-md">
            <div className="text-2xl mb-2">⚠️</div>
            <h3 className="font-bold text-lg mb-1">System Offline</h3>
            <p className="text-sm opacity-80 mb-4">{loadError}</p>
            <Button variant="outline" className="border-red-500/30 hover:bg-red-500/10 text-red-500" onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* TOP PANEL: Portfolio Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-center">
              <div className="text-sm text-muted-foreground uppercase">Total Equity</div>
              <div className="text-2xl font-semibold font-mono mt-1">
                {portfolio ? formatCurrency(portfolio.total_value) : "$---"}
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-center">
              <div className="text-sm text-muted-foreground uppercase">Buying Power</div>
              <div className="text-2xl font-semibold font-mono mt-1">
                {portfolio ? formatCurrency(portfolio.buying_power) : "$---"}
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-center">
              <div className="text-sm text-muted-foreground uppercase">Today's P&L</div>
              <div className={`text-2xl font-semibold font-mono mt-1 ${portfolio && portfolio.day_pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {portfolio ? `${portfolio.day_pl >= 0 ? '+' : ''}${formatCurrency(portfolio.day_pl)}` : "$---"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* LEFT PANEL: Order Entry */}
            <div className="md:col-span-4 border rounded-lg p-5 bg-background w-full overflow-hidden">
              <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Order Entry</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ticker" className="text-sm">Symbol</Label>
                  <Input 
                    id="ticker" 
                    placeholder="e.g. NVDA" 
                    value={orderTicker}
                    onChange={(e) => setOrderTicker(e.target.value.toUpperCase())}
                    className="font-mono uppercase h-10"
                  />
                  {selectedEq && (
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      Live Price: <span className="font-mono text-foreground">${selectedEq.price.toFixed(2)}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="shares" className="text-sm">Quantity (Shares)</Label>
                    {portfolio && selectedEq && (
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setOrderShares(10)}>+10</Button>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setOrderShares(50)}>+50</Button>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setOrderShares(Math.floor(portfolio.buying_power / selectedEq.price))}>Max</Button>
                      </div>
                    )}
                  </div>
                  <Input 
                    id="shares" 
                    type="number"
                    min="1"
                    placeholder="0" 
                    value={orderShares}
                    onChange={(e) => setOrderShares(e.target.value ? parseInt(e.target.value) : "")}
                    className="font-mono h-10"
                  />
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estimated Cost</span>
                  <span className="text-lg font-mono font-semibold">{formatCurrency(estCost)}</span>
                </div>
                
                <div className="mt-4 border border-border p-4 rounded-lg bg-muted/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-trade" className="font-semibold text-sm cursor-pointer flex items-center gap-2">
                      Enable LLM Auto-Trading
                    </Label>
                    <Switch id="auto-trade" checked={autoTradeEnabled} onCheckedChange={handleToggleAutoTrade} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">When active, the AI will autonomously rebalance this asset based on short-term market momentum.</p>
                </div>
                
                {orderTicker && (
                  <div className="mt-4 border-l-4 border-blue-500 bg-blue-500/10 p-3 text-sm rounded-r flex flex-col gap-2">
                    <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Co-Pilot
                    </div>
                    {isFetchingSignal ? (
                      <div className="animate-pulse flex flex-col gap-1.5 mt-1">
                        <div className="h-2 w-full bg-blue-500/20 rounded"></div>
                        <div className="h-2 w-2/3 bg-blue-500/20 rounded"></div>
                      </div>
                    ) : signal ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="font-mono font-bold text-xs uppercase tracking-wider">
                          SIGNAL: <span className={signal.signal === 'BUY' ? 'text-green-500' : signal.signal === 'SELL' ? 'text-red-500' : 'text-gray-500'}>{signal.signal}</span>
                        </div>
                        <span className="text-muted-foreground leading-snug">{signal.reason}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-6">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleOrder('buy')}
                  disabled={isSubmitting}
                >
                  Buy
                </Button>
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleOrder('sell')}
                  disabled={isSubmitting}
                >
                  Sell
                </Button>
              </div>
            </div>

            {/* RIGHT PANEL: Analytics & Positions Ledger */}
            <div className="md:col-span-8 flex flex-col gap-6 w-full overflow-hidden">
              
              {/* NEW: Portfolio Performance Chart */}
              <div className="bg-card border rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={portfolio?.equity_history || []}>
                      <Line 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="#22c55e" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Equity']}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border rounded-lg bg-background overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Positions Ledger</h3>
                  {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span>}
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Symbol</th>
                        <th className="px-4 py-3 font-medium text-right">Shares</th>
                        <th className="px-4 py-3 font-medium text-right">Avg Cost</th>
                        <th className="px-4 py-3 font-medium text-right">Live Price</th>
                        <th className="px-4 py-3 font-medium text-right">Total Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {!portfolio || portfolio.holdings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            No open positions. Start trading to build your portfolio.
                          </td>
                        </tr>
                      ) : (
                        portfolio.holdings.map((pos) => {
                          const isPositive = pos.total_return >= 0;
                          return (
                            <tr key={pos.ticker} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3 font-mono font-medium">{pos.ticker}</td>
                              <td className="px-4 py-3 font-mono text-right">{pos.shares.toLocaleString()}</td>
                              <td className="px-4 py-3 font-mono text-right">{formatCurrency(pos.avg_price)}</td>
                              <td className="px-4 py-3 font-mono text-right">{formatCurrency(pos.current_price)}</td>
                              <td className={`px-4 py-3 font-mono text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{formatCurrency(pos.total_return)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-card border rounded-xl shadow-sm p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h3>
                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
                  {!portfolio || !portfolio.history || portfolio.history.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4">No recent activity.</div>
                  ) : (
                    [...portfolio.history].reverse().map((record, idx) => (
                      <div key={idx} className="flex flex-col gap-1 p-2 hover:bg-muted/30 rounded transition-colors">
                        <div className="flex items-center gap-3 text-sm font-mono">
                          <span className="text-muted-foreground shrink-0">[{record.timestamp}]</span>
                          <span className={`w-10 ${record.action === 'BUY' ? 'text-green-500' : 'text-red-500'} font-bold`}>{record.action}</span>
                          <span className="w-8 text-right">{record.shares}</span>
                          <span className="w-12 font-bold">{record.ticker}</span>
                          <span className="text-muted-foreground">@</span>
                          <span>${record.price.toFixed(2)}</span>
                        </div>
                        {record.reason && (
                          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md mt-1 border-l-2 border-indigo-500 italic">
                            {record.reason}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
