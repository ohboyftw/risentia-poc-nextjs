'use client';

import { motion } from 'framer-motion';
import { User, Bot, Sparkles, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/hooks/use-chat-store';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = !isUser && message.content.startsWith('Error:');
  const { retryLastMessage, lastUserMessage, isLoading } = useChatStore();
  const canRetry = isError && isLatest && lastUserMessage && !isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex gap-3 p-4 rounded-xl transition-colors',
        isUser
          ? 'bg-accent/5 border border-accent/10'
          : isError
            ? 'bg-destructive/5 border border-destructive/20'
            : 'bg-muted/50'
      )}
    >
      <Avatar className={cn(
        'h-9 w-9 shrink-0 ring-2 ring-offset-2',
        isUser
          ? 'bg-accent ring-accent/20'
          : isError
            ? 'bg-destructive ring-destructive/20'
            : 'bg-primary ring-primary/20'
      )}>
        <AvatarFallback className={cn(
          'text-sm font-medium',
          isUser
            ? 'bg-accent text-accent-foreground'
            : isError
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'Risentia AI'}
          </span>
          {!isUser && !isError && (
            <Sparkles className="h-3 w-3 text-accent" />
          )}
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => retryLastMessage()}
            className="mt-2 gap-2 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            Retry matching
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}
