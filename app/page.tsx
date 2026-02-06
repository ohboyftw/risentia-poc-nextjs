'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelRightClose,
  PanelRightOpen,
  FlaskConical,
  TrendingUp,
} from 'lucide-react';
import { useChatStore } from '@/hooks/use-chat-store';
import { cn } from '@/lib/utils';

// Components
import { Header } from '@/components/header';
import { ChatMessage } from '@/components/chat-message';
import { ChatInput } from '@/components/chat-input';
import { WelcomeScreen } from '@/components/welcome-screen';
import { PatientCard } from '@/components/patient-card';
import { TrialCard } from '@/components/trial-card';
import { PipelineTracker } from '@/components/pipeline-tracker';
import { CostDisplay } from '@/components/cost-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatPage() {
  const {
    messages,
    patientProfile,
    pipelineSteps,
    isPipelineRunning,
    trials,
    totalCost,
    isLoading,
    sendMessage,
    reset,
    mode,
    setMode,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPipelineRunning]);

  // Close sidebar on mobile when trials appear
  useEffect(() => {
    if (trials.length > 0 && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [trials.length]);

  const hasContent = messages.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <Header mode={mode} onModeChange={setMode} onReset={reset} />

      {/* Main Content */}
      <main className="flex-1 container px-4 py-4 md:py-6">
        <div className="flex gap-4 lg:gap-6 h-[calc(100vh-8rem)]">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col min-w-0">
            <Card className="flex-1 flex flex-col overflow-hidden">
              {/* Messages Area */}
              <ScrollArea className="flex-1">
                <div className="p-4 md:p-6 space-y-4">
                  {!hasContent ? (
                    <WelcomeScreen
                      onQuickAction={sendMessage}
                      disabled={isLoading}
                    />
                  ) : (
                    <>
                      {/* Chat Messages */}
                      {messages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                      ))}

                      {/* Pipeline Visualization (inline when running) */}
                      <AnimatePresence>
                        {isPipelineRunning && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <PipelineTracker
                              steps={pipelineSteps}
                              isRunning={isPipelineRunning}
                              className="my-4"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Trial Results */}
                      <AnimatePresence>
                        {trials.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FlaskConical className="h-4 w-4 text-accent" />
                                <h3 className="font-semibold text-sm">
                                  Matching Trials
                                </h3>
                                <Badge variant="accent" className="text-xs">
                                  {trials.length} found
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3" />
                                Sorted by match score
                              </div>
                            </div>

                            <div className="grid gap-3">
                              {trials.map((trial, index) => (
                                <TrialCard
                                  key={trial.nctId}
                                  trial={trial}
                                  index={index}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Loading skeleton for trials */}
                      {isLoading && !isPipelineRunning && trials.length === 0 && (
                        <div className="space-y-3">
                          <Skeleton className="h-32 w-full rounded-lg" />
                          <Skeleton className="h-32 w-full rounded-lg" />
                        </div>
                      )}
                    </>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <ChatInput
                onSend={sendMessage}
                isLoading={isLoading}
                placeholder={
                  hasContent
                    ? 'Ask a follow-up or describe another patient...'
                    : 'Describe the patient profile...'
                }
              />
            </Card>
          </div>

          {/* Sidebar */}
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 320 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:block shrink-0 overflow-hidden"
              >
                <div className="w-80 space-y-4 h-full overflow-y-auto custom-scrollbar pr-2">
                  {/* Patient Profile Card */}
                  <PatientCard profile={patientProfile} />

                  {/* Cost Display */}
                  <AnimatePresence>
                    {totalCost > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <CostDisplay
                          totalCost={totalCost}
                          steps={pipelineSteps}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sidebar Toggle (Desktop) */}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex fixed right-4 top-20 z-40 bg-background shadow-sm border"
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-3 px-4">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Risentia</span>
            <Separator orientation="vertical" className="h-4" />
            <span>AI Orchestration for Life Sciences</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>Brussels</span>
            <span>|</span>
            <span>Dubai</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
