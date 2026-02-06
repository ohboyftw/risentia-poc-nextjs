'use client';

import { motion } from 'framer-motion';
import {
  Dna,
  MessageSquare,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeScreenProps {
  onQuickAction: (message: string) => void;
  disabled?: boolean;
}

export function WelcomeScreen({ onQuickAction, disabled }: WelcomeScreenProps) {
  const features = [
    {
      icon: MessageSquare,
      title: 'Natural Language',
      description: 'Describe patients in plain text',
    },
    {
      icon: Search,
      title: 'Smart Matching',
      description: 'AI-powered eligibility analysis',
    },
    {
      icon: Sparkles,
      title: 'Cost Optimized',
      description: 'Multi-model routing for 60% savings',
    },
  ];

  const examples = [
    {
      label: 'NSCLC with EGFR mutation',
      message: '58yo female with metastatic NSCLC adenocarcinoma. EGFR L858R positive, PD-L1 TPS 45%. Prior carboplatin/pemetrexed. ECOG 1.',
    },
    {
      label: 'Triple-negative breast cancer',
      message: '45yo female with triple-negative breast cancer, Stage III. No prior systemic therapy. BRCA1 mutation. ECOG 0.',
    },
    {
      label: 'Advanced melanoma',
      message: '62yo male with metastatic melanoma, BRAF V600E mutation. Failed ipilimumab/nivolumab. Brain metastases controlled. ECOG 1.',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Logo & Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-teal-700 mb-4">
          <Dna className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Clinical Trial Matching
        </h2>
        <p className="text-muted-foreground max-w-md">
          Powered by AI orchestration. Describe a patient profile to find
          matching clinical trials instantly.
        </p>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-8 max-w-lg"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
            className="text-center p-4 rounded-lg bg-muted/50"
          >
            <feature.icon className="h-5 w-5 text-accent mx-auto mb-2" />
            <h3 className="text-xs font-medium mb-1">{feature.title}</h3>
            <p className="text-[10px] text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Example Prompts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-lg"
      >
        <p className="text-xs font-medium text-muted-foreground text-center mb-3">
          Try an example patient profile
        </p>
        <div className="grid gap-2">
          {examples.map((example, index) => (
            <motion.div
              key={example.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full justify-between text-left h-auto py-3 px-4 group hover:border-accent hover:bg-accent/5"
                onClick={() => onQuickAction(example.message)}
                disabled={disabled}
              >
                <span className="text-sm">{example.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="text-xs text-muted-foreground text-center mt-6 italic"
      >
        Or type your own patient description below
      </motion.p>
    </div>
  );
}
