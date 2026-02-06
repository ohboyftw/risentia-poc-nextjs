'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Building2,
  Beaker,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TrialMatch } from '@/types';

interface TrialCardProps {
  trial: TrialMatch;
  index: number;
}

export function TrialCard({ trial, index }: TrialCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scorePercent = Math.round(trial.matchScore * 100);

  const scoreColor = getScoreColor(trial.matchScore);
  const scoreLabel = getScoreLabel(trial.matchScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            {/* Trial Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <a
                  href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-accent hover:underline flex items-center gap-1"
                >
                  {trial.nctId}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Badge
                  variant={trial.status === 'RECRUITING' ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {trial.status}
                </Badge>
                {trial.phase && (
                  <Badge variant="outline" className="text-xs">
                    {trial.phase}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-sm leading-tight line-clamp-2">
                {trial.title}
              </h4>
            </div>

            {/* Score Circle */}
            <div className="shrink-0">
              <ScoreIndicator score={trial.matchScore} />
            </div>
          </div>

          {/* Sponsor & Location Summary */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {trial.sponsor && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{trial.sponsor}</span>
              </div>
            )}
            {trial.locations && trial.locations.length > 0 && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  {trial.locations.length === 1
                    ? trial.locations[0]
                    : `${trial.locations.length} locations`}
                </span>
              </div>
            )}
          </div>

          {/* Match Score Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Match Score</span>
              <span className={cn('font-semibold', scoreColor.text)}>
                {scorePercent}% - {scoreLabel}
              </span>
            </div>
            <Progress
              value={scorePercent}
              className="h-2"
              indicatorClassName={scoreColor.bar}
            />
          </div>
        </CardHeader>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 rounded-none border-t text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show match details
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="p-4 pt-0 space-y-3">
              {/* Match Reasons */}
              {trial.matchReasons.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-success mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Matching Criteria
                  </div>
                  <ul className="space-y-1">
                    {trial.matchReasons.slice(0, 5).map((reason, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="text-xs text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-success mt-0.5">+</span>
                        <span>{reason}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {trial.concerns.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-warning mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Potential Concerns
                  </div>
                  <ul className="space-y-1">
                    {trial.concerns.map((concern, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="text-xs text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-warning mt-0.5">!</span>
                        <span>{concern}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Locations */}
              {trial.locations && trial.locations.length > 1 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Available Locations
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {trial.locations.slice(0, 5).map((location, idx) => (
                      <Badge key={idx} variant="muted" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                    {trial.locations.length > 5 && (
                      <Badge variant="muted" className="text-xs">
                        +{trial.locations.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              <Separator />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  Review full eligibility on ClinicalTrials.gov
                </span>
                <Button
                  variant="accent"
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                >
                  <a
                    href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Trial
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}

function ScoreIndicator({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  const { ring, text, bg } = getScoreColor(score);

  return (
    <div
      className={cn(
        'relative w-14 h-14 rounded-full flex items-center justify-center',
        'ring-4 ring-offset-2',
        ring, bg
      )}
    >
      <span className={cn('text-lg font-bold', text)}>
        {percent}
      </span>
      <span className={cn('absolute -bottom-0 text-[10px] font-medium', text)}>
        %
      </span>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 0.85) {
    return {
      ring: 'ring-success/30',
      bg: 'bg-success/10',
      bar: 'bg-success',
      text: 'text-success',
    };
  }
  if (score >= 0.7) {
    return {
      ring: 'ring-accent/30',
      bg: 'bg-accent/10',
      bar: 'bg-accent',
      text: 'text-accent',
    };
  }
  if (score >= 0.5) {
    return {
      ring: 'ring-warning/30',
      bg: 'bg-warning/10',
      bar: 'bg-warning',
      text: 'text-warning',
    };
  }
  return {
    ring: 'ring-destructive/30',
    bg: 'bg-destructive/10',
    bar: 'bg-destructive',
    text: 'text-destructive',
  };
}

function getScoreLabel(score: number): string {
  if (score >= 0.85) return 'Excellent';
  if (score >= 0.7) return 'Good';
  if (score >= 0.5) return 'Fair';
  return 'Low';
}
