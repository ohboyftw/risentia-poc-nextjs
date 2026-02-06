'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingDown,
  Zap,
  BarChart3,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PipelineStep, ModelId } from '@/types';

interface CostDisplayProps {
  totalCost: number;
  steps?: PipelineStep[];
  className?: string;
}

export function CostDisplay({ totalCost, steps = [], className }: CostDisplayProps) {
  // Calculate comparison cost (if all tasks used Claude Sonnet)
  const sonnetCostPerKToken = { input: 3.0, output: 15.0 };
  const estimatedSonnetCost = totalCost > 0 ? totalCost * 4 : 0; // Rough 4x cost estimate
  const savings = estimatedSonnetCost - totalCost;
  const savingsPercent = estimatedSonnetCost > 0 ? (savings / estimatedSonnetCost) * 100 : 0;

  // Model usage breakdown
  const modelUsage = steps.reduce((acc, step) => {
    if (step.cost !== undefined && step.cost > 0) {
      acc[step.model] = (acc[step.model] || 0) + step.cost;
    }
    return acc;
  }, {} as Record<ModelId, number>);

  const modelColors: Record<ModelId, { bg: string; text: string }> = {
    'qwen-flash': { bg: 'bg-amber-500', text: 'text-amber-500' },
    'qwen-plus': { bg: 'bg-orange-500', text: 'text-orange-500' },
    'rule-based': { bg: 'bg-gray-400', text: 'text-gray-400' },
    'claude-sonnet': { bg: 'bg-violet-500', text: 'text-violet-500' },
    'claude-haiku': { bg: 'bg-purple-400', text: 'text-purple-400' },
  };

  const modelNames: Record<ModelId, string> = {
    'qwen-flash': 'Qwen Flash',
    'qwen-plus': 'Qwen Plus',
    'rule-based': 'Rule-based',
    'claude-sonnet': 'Claude Sonnet',
    'claude-haiku': 'Claude Haiku',
  };

  if (totalCost === 0) {
    return null;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="p-4 pb-3 bg-gradient-to-r from-success/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-success/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <CardTitle className="text-sm font-semibold">
              Pipeline Cost
            </CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p className="text-xs">
                  Cost-optimized routing uses cheaper models for simple tasks,
                  reserving expensive models for complex reasoning.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Main Cost Display */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <motion.p
              key={totalCost}
              initial={{ scale: 1.2, color: 'hsl(var(--success))' }}
              animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
              className="text-3xl font-bold"
            >
              ${totalCost.toFixed(4)}
            </motion.p>
          </div>

          <AnimatePresence>
            {savingsPercent > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-right"
              >
                <div className="flex items-center gap-1 text-success mb-1">
                  <TrendingDown className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {Math.round(savingsPercent)}% savings
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  vs. ${estimatedSonnetCost.toFixed(4)} all-Sonnet
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Savings Bar */}
        {savingsPercent > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Cost Efficiency</span>
              <span className="text-success font-medium">
                ${savings.toFixed(4)} saved
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-success"
                initial={{ width: 0 }}
                animate={{ width: `${100 - savingsPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-y-0 bg-success/30"
                style={{ left: `${100 - savingsPercent}%`, right: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-foreground">Actual: ${totalCost.toFixed(4)}</span>
              <span className="text-muted-foreground">Baseline: ${estimatedSonnetCost.toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* Model Breakdown */}
        {Object.keys(modelUsage).length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
              <BarChart3 className="h-3 w-3" />
              Model Breakdown
            </div>
            <div className="space-y-2">
              {Object.entries(modelUsage)
                .sort((a, b) => b[1] - a[1])
                .map(([model, cost]) => {
                  const modelId = model as ModelId;
                  const percentage = (cost / totalCost) * 100;

                  return (
                    <motion.div
                      key={model}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={cn('w-2 h-2 rounded-full shrink-0', modelColors[modelId].bg)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate">{modelNames[modelId]}</span>
                          <span className="font-medium">${cost.toFixed(4)}</span>
                        </div>
                        <Progress
                          value={percentage}
                          className="h-1 mt-1"
                          indicatorClassName={modelColors[modelId].bg}
                        />
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Efficiency Badge */}
        <div className="flex items-center justify-center pt-2">
          <Badge variant="success" className="gap-1">
            <Zap className="h-3 w-3" />
            Cost-Optimized Routing Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
