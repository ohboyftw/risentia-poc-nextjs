'use client';

import { motion } from 'framer-motion';
import {
  Dna,
  Settings,
  RotateCcw,
  ChevronDown,
  Server,
  Cpu,
  Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AppMode } from '@/types';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onReset: () => void;
}

export function Header({ mode, onModeChange, onReset }: HeaderProps) {
  const modeConfig: Record<AppMode, { label: string; icon: React.ReactNode; color: string }> = {
    local: {
      label: 'Local (Mock)',
      icon: <Cpu className="h-3 w-3" />,
      color: 'text-amber-600',
    },
    fastapi: {
      label: 'FastAPI (Live)',
      icon: <Server className="h-3 w-3" />,
      color: 'text-green-600',
    },
    remote: {
      label: 'LangGraph SDK',
      icon: <Cloud className="h-3 w-3" />,
      color: 'text-blue-600',
    },
  };

  const modes: AppMode[] = ['local', 'fastapi', 'remote'];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 md:px-6">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-teal-700">
            <Dna className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              <span className="text-foreground">Risentia</span>
              <span className="text-accent"> Trial Matching</span>
            </h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              LangGraph JS SDK - Multi-Model Orchestration
            </p>
          </div>
        </motion.div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="relative">
            <select
              value={mode}
              onChange={(e) => onModeChange(e.target.value as AppMode)}
              className={cn(
                'appearance-none pl-7 pr-8 py-1.5 text-xs font-medium rounded-md border bg-background cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'transition-colors hover:bg-muted/50'
              )}
            >
              {modes.map((m) => (
                <option key={m} value={m}>
                  {modeConfig[m].label}
                </option>
              ))}
            </select>
            <div className={cn('absolute left-2 top-1/2 -translate-y-1/2', modeConfig[mode].color)}>
              {modeConfig[mode].icon}
            </div>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Mode Status Badge */}
          <Badge
            variant={mode === 'fastapi' ? 'success' : mode === 'remote' ? 'accent' : 'secondary'}
            className="hidden sm:flex h-6 text-[10px]"
          >
            {mode === 'fastapi' ? 'Live' : mode === 'remote' ? 'Cloud' : 'Mock'}
          </Badge>

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
