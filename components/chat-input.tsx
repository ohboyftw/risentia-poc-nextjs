'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, isLoading, placeholder }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue('');
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-center gap-2 p-4 border-t bg-background">
        {/* AI Indicator */}
        <motion.div
          animate={isLoading ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: isLoading ? Infinity : 0, duration: 1 }}
          className={cn(
            'shrink-0 p-2 rounded-lg transition-colors',
            isLoading ? 'bg-accent/20' : 'bg-muted'
          )}
        >
          <Sparkles className={cn(
            'h-4 w-4 transition-colors',
            isLoading ? 'text-accent' : 'text-muted-foreground'
          )} />
        </motion.div>

        {/* Input Field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder || 'Describe the patient profile...'}
            disabled={isLoading}
            className={cn(
              'pr-12 h-11 text-sm',
              'focus-visible:ring-accent',
              isLoading && 'opacity-70'
            )}
          />

          {/* Character hint */}
          {value.length > 0 && (
            <span className="absolute right-14 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {value.length}
            </span>
          )}
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          variant="accent"
          disabled={isLoading || !value.trim()}
          className={cn(
            'shrink-0 h-11 w-11 rounded-lg transition-all',
            value.trim() && !isLoading && 'shadow-lg shadow-accent/25'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>

      {/* Loading indicator bar */}
      {isLoading && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute top-0 left-0 right-0 h-0.5 bg-accent origin-left"
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
      )}
    </form>
  );
}
