'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PipelineStep, ModelId, MODEL_CONFIGS } from '@/types';

interface PipelineTrackerProps {
  steps: PipelineStep[];
  isRunning: boolean;
  className?: string;
}

export function PipelineTracker({ steps, isRunning, className }: PipelineTrackerProps) {
  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const progressPercent = (completedSteps / steps.length) * 100;

  const currentStep = steps.find(s => s.status === 'running');

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="p-4 pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={isRunning ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: 'linear' }}
              className="p-1.5 bg-accent/10 rounded-lg"
            >
              <Zap className="h-4 w-4 text-accent" />
            </motion.div>
            <CardTitle className="text-sm font-semibold">
              Pipeline Execution
            </CardTitle>
          </div>
          <Badge variant={isRunning ? 'accent' : completedSteps === steps.length ? 'success' : 'secondary'}>
            {isRunning
              ? 'Running'
              : completedSteps === steps.length
              ? 'Complete'
              : `${completedSteps}/${steps.length}`}
          </Badge>
        </div>

        {/* Overall Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              {currentStep ? `Running: ${currentStep.name}` : 'Overall Progress'}
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <TooltipProvider delayDuration={200}>
          {/* Desktop: Horizontal Pipeline */}
          <div className="hidden md:flex items-center justify-between gap-1">
            {steps.map((step, index) => (
              <PipelineStepItem
                key={step.name}
                step={step}
                isLast={index === steps.length - 1}
                layout="horizontal"
              />
            ))}
          </div>

          {/* Mobile: Vertical Pipeline */}
          <div className="md:hidden space-y-2">
            {steps.map((step, index) => (
              <PipelineStepItem
                key={step.name}
                step={step}
                isLast={index === steps.length - 1}
                layout="vertical"
              />
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

interface PipelineStepItemProps {
  step: PipelineStep;
  isLast: boolean;
  layout: 'horizontal' | 'vertical';
}

function PipelineStepItem({ step, isLast, layout }: PipelineStepItemProps) {
  const modelColors: Record<ModelId, string> = {
    'qwen-flash': 'bg-amber-500',
    'qwen-plus': 'bg-orange-500',
    'rule-based': 'bg-gray-400',
    'claude-sonnet': 'bg-violet-500',
    'claude-haiku': 'bg-purple-400',
  };

  const modelNames: Record<ModelId, string> = {
    'qwen-flash': 'Qwen Flash',
    'qwen-plus': 'Qwen Plus',
    'rule-based': 'Rule-based',
    'claude-sonnet': 'Claude Sonnet',
    'claude-haiku': 'Claude Haiku',
  };

  const statusIcon = {
    pending: <Circle className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 text-accent animate-spin" />,
    complete: <CheckCircle2 className="h-4 w-4 text-success" />,
    error: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  if (layout === 'horizontal') {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0',
                step.status === 'running' && 'bg-accent/10',
                step.status === 'complete' && 'bg-success/5',
              )}
            >
              <div className="relative">
                {statusIcon[step.status]}
                {step.status === 'running' && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-accent/20"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium truncate max-w-[60px] text-center">
                {step.status === 'running' && step.detail ? step.detail : step.name.split(' ')[0]}
              </span>
              <Badge
                className={cn('h-4 text-[9px] px-1', modelColors[step.model])}
              >
                {modelNames[step.model].split(' ')[0]}
              </Badge>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p className="font-medium">{step.name}</p>
            <p className="text-muted-foreground">{step.description}</p>
            <p className="text-muted-foreground mt-1">Model: {modelNames[step.model]}</p>
            {step.cost !== undefined && (
              <p className="text-success mt-1">Cost: ${step.cost.toFixed(4)}</p>
            )}
          </TooltipContent>
        </Tooltip>

        {!isLast && (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </>
    );
  }

  // Vertical layout for mobile
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        step.status === 'running' && 'bg-accent/10',
        step.status === 'complete' && 'bg-success/5',
      )}
    >
      <div className="relative shrink-0">
        {statusIcon[step.status]}
        {step.status === 'running' && (
          <motion.div
            className="absolute inset-0 rounded-full bg-accent/20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{step.name}</span>
          <Badge
            className={cn('h-4 text-[9px] px-1 shrink-0', modelColors[step.model])}
          >
            {modelNames[step.model]}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {step.status === 'running' && step.detail ? step.detail : step.description}
        </p>
      </div>

      {step.cost !== undefined && (
        <span className="text-[10px] text-success font-medium shrink-0">
          ${step.cost.toFixed(4)}
        </span>
      )}
    </motion.div>
  );
}
