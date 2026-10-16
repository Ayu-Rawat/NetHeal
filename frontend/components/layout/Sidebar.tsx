'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Network,
  FlaskConical,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Simulator', icon: Network },
  { href: '/experiments', label: 'Experiments', icon: FlaskConical },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/concepts', label: 'Concepts', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 md:w-56 bg-navy-800 border-r border-navy-600 flex flex-col shrink-0 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 md:px-4 py-5 border-b border-navy-600">
        <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
          <Network className="w-4 h-4 text-white" />
        </div>
        <span className="hidden md:block font-bold text-lg text-white tracking-tight">
          NetHeal
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-sm font-medium',
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  active ? 'text-cyan-400' : 'text-slate-500'
                )}
              />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-navy-600">
        <p className="hidden md:block text-xs text-slate-500 text-center">
          Network Simulation v1.0
        </p>
      </div>
    </aside>
  );
}
