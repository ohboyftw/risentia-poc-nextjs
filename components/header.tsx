'use client';

import { motion } from 'framer-motion';
import {
  RotateCcw,
  Server,
  Monitor,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AppMode } from '@/types';

const MODE_CONFIG: Record<AppMode, { label: string; icon: typeof Server; color: string }> = {
  local: { label: 'Mock', icon: Monitor, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  fastapi: { label: 'FastAPI', icon: Cloud, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
};

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onReset: () => void;
}

export function Header({ mode, onModeChange, onReset }: HeaderProps) {

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 md:px-6">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect width="40" height="40" rx="10" fill="black" />
            <path d="M12 28V12h6.5c1.8 0 3.2.5 4.2 1.4 1 .9 1.5 2.2 1.5 3.7 0 1.1-.3 2-.8 2.8-.5.8-1.3 1.3-2.3 1.6l3.9 6.5h-3.5l-3.4-6H15v6h-3zm3-8.5h3.3c1 0 1.7-.2 2.2-.7.5-.5.8-1.1.8-1.9s-.3-1.4-.8-1.9c-.5-.5-1.2-.7-2.2-.7H15v5.2z" fill="white"/>
          </svg>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              <span className="text-foreground">Risentia</span>
              <span className="text-accent"> Trial Matching</span>
            </h1>
          </div>
        </motion.div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="hidden sm:flex items-center gap-1">
            {(Object.keys(MODE_CONFIG) as AppMode[]).map((m) => {
              const cfg = MODE_CONFIG[m];
              const Icon = cfg.icon;
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                    isActive
                      ? cfg.color
                      : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Mobile: compact mode badge (tap to cycle) */}
          <button
            className="sm:hidden"
            onClick={() => {
              const modes: AppMode[] = ['local', 'fastapi'];
              const next = modes[(modes.indexOf(mode) + 1) % modes.length];
              onModeChange(next);
            }}
          >
            <Badge
              variant="outline"
              className={`h-6 text-[10px] gap-1 ${MODE_CONFIG[mode].color}`}
            >
              {(() => { const Icon = MODE_CONFIG[mode].icon; return <Icon className="h-3 w-3" />; })()}
              {MODE_CONFIG[mode].label}
            </Badge>
          </button>

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">Reset conversation</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
