import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BriefcaseBusiness, Building2, Crown, Sparkles, LayoutDashboard, CalendarDays, Clapperboard, Bot, DollarSign, UserCog, LogOut, TrendingUp, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/planner', label: 'Content Planner', icon: CalendarDays },
  { to: '/reel-builder', label: 'Reel Builder', icon: Clapperboard },
  { to: '/forge', label: 'Content Forge', icon: Wand2 },
  { to: '/twin', label: 'Creator Twin', icon: Bot },
  { to: '/growth', label: 'Growth Lab', icon: TrendingUp },
  { to: '/deals', label: 'Brand Deals', icon: BriefcaseBusiness },
  { to: '/monetize', label: 'Monetize', icon: DollarSign },
  { to: '/business', label: 'Business OS', icon: Building2 },
  { to: '/brand-brain', label: 'Brand Profile', icon: UserCog },
  { to: '/plans', label: 'Plans', icon: Crown },
];

export default function Layout() {
  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar/40 backdrop-blur-xl z-30">
        <div className="px-6 py-7 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-[15px]">Creator Command</div>
            <div className="text-[11px] text-muted-foreground tracking-wide">AI GROWTH OS</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 mt-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 glass border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-sm">Creator Command</span>
        </div>
        <nav className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto scrollbar-none">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground bg-secondary/50'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}