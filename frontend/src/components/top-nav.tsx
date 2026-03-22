"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Menu, Globe, Newspaper, LineChart, Cpu, Database, Wallet, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems = [
  { name: "Overview", path: "/", icon: Globe },
  { name: "News", path: "/news", icon: Newspaper },
  { name: "Models", path: "/models", icon: Cpu },
  { name: "Market", path: "/market", icon: LineChart },
  { name: "Trading", path: "/trading", icon: Wallet },
  { name: "Sources", path: "/sources", icon: Database },
  { name: "Notifications", path: "/notifications", icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  const isOverview = pathname === '/';
  
  const { isLoggedIn, userEmail, login, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const loginMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (loginMenuRef.current && !loginMenuRef.current.contains(event.target as Node)) {
        setShowLogin(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.includes("@")) {
      login(emailInput);
      setShowLogin(false);
      setEmailInput("");
    }
  };

  return (
    <header className={`z-50 w-full transition-colors duration-300 ${
      isOverview 
        ? 'absolute top-0 left-0 bg-transparent border-transparent pointer-events-none' 
        : 'sticky top-0 bg-background/80 backdrop-blur-md border-b border-border'
    }`}>
      <div className="flex h-14 items-center px-4 md:px-6 w-full max-w-[1600px] mx-auto pointer-events-auto">
        <Link href="/" className={`flex items-center gap-2 mr-6 shrink-0 transition-opacity ${isOverview ? 'opacity-80 hover:opacity-100' : ''}`}>
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-mono tracking-tight text-lg font-bold text-black">AI Monitor</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium flex-1 justify-center">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 transition-colors hover:opacity-100 ${
                pathname === item.path 
                  ? "text-black font-bold" 
                  : "text-black/60 hover:text-black/80"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end md:ml-auto gap-4 relative">
          {/* Auth Section */}
          <div className="hidden md:flex items-center">
            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold cursor-pointer transition-all"
                >
                  {userEmail?.charAt(0).toUpperCase()}
                </button>
                
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 p-2 bg-background border border-border rounded-lg shadow-lg w-48 z-50 flex flex-col">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                      {userEmail}
                    </div>
                    <div className="border-b border-border my-1"></div>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-md text-red-500 font-medium transition-colors"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative" ref={loginMenuRef}>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => setShowLogin(!showLogin)}
                  className={isOverview ? 'bg-black text-white hover:bg-black/80' : ''}
                >
                  Login
                </Button>
                
                {showLogin && (
                  <div className="absolute top-full right-0 mt-2 p-4 bg-background border border-border rounded-lg shadow-lg w-64 z-50">
                    <form onSubmit={handleLogin} className="flex flex-col gap-3">
                      <h4 className="font-semibold text-sm">Sign In</h4>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        required
                        className="h-8 text-sm"
                      />
                      <Button type="submit" size="sm" className="w-full">
                        Login
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
                    <Sheet>
                      <SheetTrigger className="inline-flex items-center justify-center rounded-lg hover:bg-muted hover:text-foreground text-sm font-medium size-8 md:hidden transition-all outline-none">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                      </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-2 py-2 text-lg font-medium rounded-md transition-colors ${
                      pathname === item.path
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
