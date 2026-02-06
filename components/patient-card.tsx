'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Activity,
  Dna,
  Pill,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { PatientProfile } from '@/types';

interface PatientCardProps {
  profile: PatientProfile;
  className?: string;
}

export function PatientCard({ profile, className }: PatientCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasData = profile.age || profile.cancerType || Object.keys(profile.biomarkers).length > 0;

  const dataCompleteness = calculateCompleteness(profile);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="bg-gradient-to-r from-accent to-teal-700 text-white p-4">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full p-0 h-auto hover:bg-transparent flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <User className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold text-white">
                    Patient Profile
                  </CardTitle>
                  <p className="text-xs text-white/80">
                    {dataCompleteness}% complete
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-white/80" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/80" />
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Completeness bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${dataCompleteness}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-4 space-y-4">
            <AnimatePresence mode="wait">
              {!hasData ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 text-center"
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No patient data yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe a patient to get started
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="data"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Demographics */}
                  {(profile.age || profile.sex) && (
                    <ProfileSection
                      icon={User}
                      title="Demographics"
                    >
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {profile.age && (
                          <div>
                            <span className="text-muted-foreground">Age: </span>
                            <span className="font-medium">{profile.age}</span>
                          </div>
                        )}
                        {profile.sex && (
                          <div>
                            <span className="text-muted-foreground">Sex: </span>
                            <span className="font-medium">{profile.sex}</span>
                          </div>
                        )}
                      </div>
                    </ProfileSection>
                  )}

                  {/* Diagnosis */}
                  {(profile.cancerType || profile.stage || profile.histology) && (
                    <ProfileSection
                      icon={Activity}
                      title="Diagnosis"
                    >
                      <div className="space-y-2 text-sm">
                        {profile.cancerType && (
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="accent" className="text-xs">
                              {profile.cancerType}
                            </Badge>
                            {profile.histology && (
                              <Badge variant="secondary" className="text-xs">
                                {profile.histology}
                              </Badge>
                            )}
                          </div>
                        )}
                        {profile.stage && (
                          <div>
                            <span className="text-muted-foreground">Stage: </span>
                            <span className="font-medium">{profile.stage}</span>
                          </div>
                        )}
                        {profile.ecog !== undefined && (
                          <div>
                            <span className="text-muted-foreground">ECOG PS: </span>
                            <Badge
                              variant={profile.ecog <= 1 ? 'success' : profile.ecog <= 2 ? 'warning' : 'destructive'}
                              className="text-xs"
                            >
                              {profile.ecog}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </ProfileSection>
                  )}

                  {/* Biomarkers */}
                  {Object.keys(profile.biomarkers).length > 0 && (
                    <ProfileSection
                      icon={Dna}
                      title="Biomarkers"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(profile.biomarkers).map(([key, value]) => (
                          <Badge
                            key={key}
                            variant="teal"
                            className="text-xs font-normal"
                          >
                            <span className="font-medium">{key}:</span>
                            <span className="ml-1">{value}</span>
                          </Badge>
                        ))}
                      </div>
                      {profile.pdl1Score && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">PD-L1 TPS: </span>
                          <span className="font-medium">{profile.pdl1Score}</span>
                        </div>
                      )}
                    </ProfileSection>
                  )}

                  {/* Prior Treatments */}
                  {profile.priorTreatments.length > 0 && (
                    <ProfileSection
                      icon={Pill}
                      title="Prior Treatments"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {profile.priorTreatments.map((treatment, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            {treatment}
                          </Badge>
                        ))}
                      </div>
                    </ProfileSection>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ProfileSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

function ProfileSection({ icon: Icon, title, children }: ProfileSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>
      {children}
      <Separator className="mt-3" />
    </motion.div>
  );
}

function calculateCompleteness(profile: PatientProfile): number {
  const fields = [
    profile.age,
    profile.sex,
    profile.cancerType,
    profile.stage,
    profile.ecog !== undefined,
    Object.keys(profile.biomarkers).length > 0,
    profile.priorTreatments.length > 0,
  ];

  const filledCount = fields.filter(Boolean).length;
  return Math.round((filledCount / fields.length) * 100);
}
