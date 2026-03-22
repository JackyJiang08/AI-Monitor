from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
from typing import List
import os
import json
import asyncio
import time
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

try:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
except:
    client = None

app = FastAPI(title="AI Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_TICKERS = ["NVDA", "MSFT", "GOOGL", "AMZN", "META", "AAPL", "TSM", "AMD", "AVGO", "ARM", "MRVL", "MU", "QCOM", "SMCI", "VRT", "ANET", "CEG", "VST", "PLTR", "SNOW", "CRM", "CRWD", "DDOG", "PATH", "AI", "TSLA", "SYM"]

# Mocked Portfolio State
portfolio = {
    "buying_power": 100000.0,
    "holdings": {}, # format: "TICKER": {"shares": int, "avg_price": float}
    "history": [], # format: {"timestamp": str, "action": str, "ticker": str, "shares": int, "price": float, "reason": str}
    "equity_history": [{"timestamp": datetime.now().strftime("%I:%M %p"), "equity": 100000.0}]
}

CACHE = {}
CACHE_TTL = 60

class OrderRequest(BaseModel):
    ticker: str
    action: str
    shares: int

class AutoTradeToggle(BaseModel):
    enabled: bool

AUTO_TRADE_ENABLED = False

@app.get("/api/market/quotes")
def get_market_quotes():
    cache_key = "quotes"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["timestamp"] < CACHE_TTL:
        return {"quotes": CACHE[cache_key]["data"]}

    data = []
    try:
        tickers_data = yf.Tickers(" ".join(AI_TICKERS))
        for ticker in AI_TICKERS:
            try:
                info = tickers_data.tickers[ticker].fast_info
                last_price = info.last_price
                prev_close = info.previous_close
                change = last_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0
                data.append({
                    "ticker": ticker,
                    "price": round(last_price, 2),
                    "change": round(change, 2),
                    "changePercent": round(change_percent, 2),
                })
                # Cache individual prices for portfolio calculations
                CACHE[f"price_{ticker}"] = {"timestamp": time.time(), "data": last_price}
            except Exception as e:
                print(f"Error fetching fast_info for {ticker}: {e}")
                pass
        if not data:
            raise Exception("No quotes could be fetched")
    except Exception as e:
        print(f"Error fetching quotes: {e}")
        raise HTTPException(status_code=500, detail={"error": "Failed to fetch market data"})
        
    CACHE[cache_key] = {"timestamp": time.time(), "data": data}
    return {"quotes": data}

@app.get("/api/market/history/{ticker}")
def get_market_history(ticker: str, period: str = "1Y"):
    period_mapping = {
        "1W": "1wk",
        "1M": "1mo",
        "6M": "6mo",
        "1Y": "1y",
        "YTD": "ytd"
    }
    yf_period = period_mapping.get(period.upper(), "1y")
    
    cache_key = f"history_{ticker}_{yf_period}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["timestamp"] < CACHE_TTL:
        return {"history": CACHE[cache_key]["data"]}
    
    try:
        hist = yf.Ticker(ticker).history(period=yf_period)
        if hist.empty:
            raise Exception("No history data found")
        data = []
        for date, row in hist.iterrows():
            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(row["Close"], 2)
            })
        
        CACHE[cache_key] = {"timestamp": time.time(), "data": data}
        return {"history": data}
    except Exception as e:
        print(f"Error fetching history for {ticker}: {e}")
        raise HTTPException(status_code=500, detail={"error": "Failed to fetch market history"})

@app.get("/api/trading/portfolio")
def get_portfolio():
    try:
        holdings_data = []
        total_value = portfolio["buying_power"]
        
        if portfolio["holdings"]:
            for ticker, pos in portfolio["holdings"].items():
                shares = pos["shares"]
                avg_price = pos["avg_price"]
                
                cache_key = f"price_{ticker}"
                current_price = avg_price
                if cache_key in CACHE and time.time() - CACHE[cache_key]["timestamp"] < CACHE_TTL:
                    current_price = CACHE[cache_key]["data"]
                else:
                    try:
                        current_price = yf.Ticker(ticker).fast_info.last_price
                        CACHE[cache_key] = {"timestamp": time.time(), "data": current_price}
                    except Exception as e:
                        print(f"Error fetching fast_info for {ticker} in portfolio: {e}")
                        current_price = CACHE[cache_key]["data"] if cache_key in CACHE else avg_price # fallback
                    
                current_value = shares * current_price
                total_value += current_value
                total_return = current_value - (shares * avg_price)
                return_percent = (total_return / (shares * avg_price)) * 100 if (shares * avg_price) > 0 else 0
                
                holdings_data.append({
                    "ticker": ticker,
                    "shares": shares,
                    "avg_price": round(avg_price, 2),
                    "current_price": round(current_price, 2),
                    "total_return": round(total_return, 2),
                    "return_percent": round(return_percent, 2)
                })
                
        current_time = datetime.now().strftime("%I:%M %p")
        if not portfolio.get("equity_history") or portfolio["equity_history"][-1]["timestamp"] != current_time:
            portfolio.setdefault("equity_history", []).append({
                "timestamp": current_time,
                "equity": round(total_value, 2)
            })
            if len(portfolio["equity_history"]) > 50:
                portfolio["equity_history"] = portfolio["equity_history"][-50:]

        return {
            "buying_power": round(portfolio["buying_power"], 2),
            "total_value": round(total_value, 2),
            "day_pl": 0, # Simplified for now
            "holdings": holdings_data,
            "history": portfolio.get("history", []),
            "equity_history": portfolio.get("equity_history", [])
        }
    except Exception as e:
        print(f"Error in get_portfolio: {e}")
        raise HTTPException(status_code=500, detail="Data fetch failed")

@app.post("/api/trading/order")
def execute_order(order: OrderRequest):
    ticker = order.ticker.upper()
    action = order.action.lower()
    shares = order.shares
    
    if shares <= 0:
        raise HTTPException(status_code=400, detail="Shares must be > 0")
        
    try:
        current_price = yf.Ticker(ticker).fast_info.last_price
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch price for {ticker}")
        
    cost = current_price * shares
    
    if action == "buy":
        if portfolio["buying_power"] < cost:
            raise HTTPException(status_code=400, detail="Insufficient buying power")
            
        portfolio["buying_power"] -= cost
        
        if ticker in portfolio["holdings"]:
            pos = portfolio["holdings"][ticker]
            total_cost = (pos["shares"] * pos["avg_price"]) + cost
            pos["shares"] += shares
            pos["avg_price"] = total_cost / pos["shares"]
        else:
            portfolio["holdings"][ticker] = {"shares": shares, "avg_price": current_price}
            
        portfolio["history"].append({
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "action": "BUY",
            "ticker": ticker,
            "shares": shares,
            "price": current_price,
            "reason": "Manual User Order"
        })
            
    elif action == "sell":
        if ticker not in portfolio["holdings"] or portfolio["holdings"][ticker]["shares"] < shares:
            raise HTTPException(status_code=400, detail="Insufficient shares to sell")
            
        portfolio["buying_power"] += cost
        portfolio["holdings"][ticker]["shares"] -= shares
        
        if portfolio["holdings"][ticker]["shares"] == 0:
            del portfolio["holdings"][ticker]
            
        portfolio["history"].append({
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "action": "SELL",
            "ticker": ticker,
            "shares": shares,
            "price": current_price,
            "reason": "Manual User Order"
        })
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    return {"message": "Order executed successfully"}

@app.get("/api/market/analyst/{ticker}")
def get_analyst_brief(ticker: str):
    cache_key = f"analyst_{ticker}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["timestamp"] < CACHE_TTL:
        return {"ticker": ticker, "analysis": CACHE[cache_key]["data"]}

    if not client:
        return {"ticker": ticker, "analysis": "OpenAI API key not found.\nPlease set OPENAI_API_KEY to use the AI analyst.\nCheck back later for real-time insights."}
        
    try:
        current_price = yf.Ticker(ticker).fast_info.last_price
        current_date = datetime.now().strftime("%B %d, %Y")
        
        prompt = f"You are a Wall Street AI analyst. Today's date is {current_date}. The current price of {ticker} is ${current_price:.2f}. Provide a short-term market analysis for {ticker} focusing on catalysts from the last 1 to 3 months leading up to today. Write exactly 3 detailed paragraphs."
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful financial assistant."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                timeout=15.0
            )
            analysis = response.choices[0].message.content
            
            CACHE[cache_key] = {"timestamp": time.time(), "data": analysis}
            return {"ticker": ticker, "analysis": analysis}
        except Exception as e:
            print(f"OpenAI API error for {ticker}: {e}")
            raise HTTPException(status_code=500, detail={"error": "Failed to generate AI analysis"})
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching analyst brief data for {ticker}: {e}")
        raise HTTPException(status_code=500, detail={"error": "Failed to fetch market data for analysis"})

@app.get("/api/trading/signal/{ticker}")
def get_trading_signal(ticker: str):
    cache_key = f"signal_{ticker}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["timestamp"] < CACHE_TTL:
        return CACHE[cache_key]["data"]

    if not client:
        return {"signal": "HOLD", "reason": "OpenAI API key not configured."}
        
    try:
        current_price = yf.Ticker(ticker).fast_info.last_price
        current_date = datetime.now().strftime("%B %d, %Y")
        
        prompt = f"Today is {current_date}. {ticker} is trading at ${current_price:.2f}. Give a 1-sentence, highly professional trade signal (Buy, Sell, or Hold) and a brief 10-20 word reason based on short-term market momentum."
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a concise financial trading algorithm. Output format must start with BUY, SELL, or HOLD."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=60,
            timeout=15.0
        )
        
        result = response.choices[0].message.content
        
        signal = "HOLD"
        result_upper = result.upper()
        if result_upper.startswith("BUY") or " BUY " in result_upper[:15]:
            signal = "BUY"
        elif result_upper.startswith("SELL") or " SELL " in result_upper[:15]:
            signal = "SELL"
            
        result_data = {"signal": signal, "reason": result}
        CACHE[cache_key] = {"timestamp": time.time(), "data": result_data}
        return result_data
    except Exception as e:
        print(f"Error fetching signal for {ticker}: {e}")
        return {"signal": "HOLD", "reason": "Failed to generate AI signal."}

@app.post("/api/trading/auto/toggle")
def toggle_auto_trade(toggle: AutoTradeToggle):
    global AUTO_TRADE_ENABLED
    AUTO_TRADE_ENABLED = toggle.enabled
    return {"enabled": AUTO_TRADE_ENABLED}

@app.get("/api/trading/auto/status")
def get_auto_trade_status():
    return {"enabled": AUTO_TRADE_ENABLED}

async def auto_trade_agent_loop():
    while True:
        try:
            await asyncio.sleep(30)
            if not AUTO_TRADE_ENABLED or not client:
                continue
                
            ticker = "NVDA"
            try:
                current_price = yf.Ticker(ticker).fast_info.last_price
            except Exception as e:
                print(f"Failed to fetch price for {ticker}: {e}")
                continue
                
            cash = portfolio["buying_power"]
            shares = portfolio["holdings"].get(ticker, {}).get("shares", 0)
            
            prompt = f"You are an autonomous trading agent. The portfolio has ${cash:.2f} cash and {shares} shares of {ticker}. The live price is ${current_price:.2f}. Based on short-term momentum, decide to BUY 5 shares, SELL 5 shares, or HOLD. Return strict JSON: {{\"action\": \"BUY\", \"reason\": \"...\"}} or {{\"action\": \"SELL\"}} or {{\"action\": \"HOLD\"}}."
            
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a concise financial trading algorithm. Output strict JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=100,
                    timeout=15.0
                )
                result_text = response.choices[0].message.content
            except Exception as e:
                print(f"OpenAI API error in auto_trade_agent_loop: {e}")
                continue
            
            try:
                if "```json" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    result_text = result_text.split("```")[1].split("```")[0].strip()
                    
                result = json.loads(result_text)
                action = result.get("action", "HOLD").upper()
                reason = result.get("reason", "Autonomous decision.")
            except Exception as e:
                print(f"Failed to parse LLM response: {e}")
                continue
                
            if action in ["BUY", "SELL"]:
                trade_shares = 5
                cost = current_price * trade_shares
                
                executed = False
                if action == "BUY" and cash >= cost:
                    portfolio["buying_power"] -= cost
                    if ticker in portfolio["holdings"]:
                        pos = portfolio["holdings"][ticker]
                        total_cost = (pos["shares"] * pos["avg_price"]) + cost
                        pos["shares"] += trade_shares
                        pos["avg_price"] = total_cost / pos["shares"]
                    else:
                        portfolio["holdings"][ticker] = {"shares": trade_shares, "avg_price": current_price}
                    executed = True
                    
                elif action == "SELL" and shares >= trade_shares:
                    portfolio["buying_power"] += cost
                    portfolio["holdings"][ticker]["shares"] -= trade_shares
                    if portfolio["holdings"][ticker]["shares"] == 0:
                        del portfolio["holdings"][ticker]
                    executed = True
                    
                if executed:
                    portfolio["history"].append({
                        "timestamp": datetime.now().strftime("%I:%M %p"),
                        "action": action,
                        "ticker": ticker,
                        "shares": trade_shares,
                        "price": current_price,
                        "reason": reason
                    })
                    print(f"Agent Executed: {action} {trade_shares} {ticker} @ {current_price}")
                    
        except Exception as e:
            print(f"Agent Loop Error: {e}")
            await asyncio.sleep(30)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_trade_agent_loop())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
