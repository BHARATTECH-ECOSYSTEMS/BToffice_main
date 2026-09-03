'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StoredStudy, StoredInterview, AggregateSynthesisResult } from '@/types';
import { getStudy, getStudyInterviews } from '@/services/storageService';
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  Users,
  Settings,
  BarChart3,
  Calendar,
  Lock,
  Unlock,
  Eye,
  Clock,
  MessageSquare,
  Lightbulb,
  Sparkles,
  AlertCircle,
  GitBranch,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check
} from 'lucide-react';

interface StudyDetailProps {
  studyId: string;
}

type TabType = 'overview' | 'interviews' | 'settings';

const StudyDetail: React.FC<StudyDetailProps> = ({ studyId }) => {
  const router = useRouter();
  const [study, setStudy] = useState<StoredStudy | null>(null);
  const [interviews, setInterviews] = useState<StoredInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [aggregateSynthesis, setAggregateSynthesis] = useState<AggregateSynthesisResult | null>(null);
  const [isGeneratingAggregate, setIsGeneratingAggregate] = useState(false);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [isTogglingLinks, setIsTogglingLinks] = useState(false);
  const [participantLink, setParticipantLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    loadStudyData();
  }, [studyId]);

  const loadStudyData = async () => {
    setLoading(true);
    try {
      const [studyData, interviewData] = await Promise.all([
        getStudy(studyId),
        getStudyInterviews(studyId)
      ]);
      setStudy(studyData ? { ...studyData, interviewCount: interviewData.length } : null);
      setInterviews(interviewData);
    } catch (error) {
      console.error('Error loading study:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLinksEnabled = async () => {
    if (!study) return;

    const newLinksEnabled = !(study.config.linksEnabled ?? true);
    setIsTogglingLinks(true);

    try {
      const response = await fetch(`/api/studies/${studyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            ...study.config,
            linksEnabled: newLinksEnabled
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update study');
      }

      // Update local state
      setStudy({
        ...study,
        config: {
          ...study.config,
          linksEnabled: newLinksEnabled
        }
      });
    } catch (error) {
      console.error('Error toggling links:', error);
      alert('Failed to update link settings');
    } finally {
      setIsTogglingLinks(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!study) return;

    setGeneratingLink(true);
    try {
      const response = await fetch('/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyConfig: study.config })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate link');
      }

      const data = await response.json();
      if (data.url) {
        setParticipantLink(data.url);
      }
    } catch (error) {
      console.error('Error generating link:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (participantLink) {
      navigator.clipboard.writeText(participantLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateAggregateSynthesis = async () => {
    if (interviews.length < 2) {
      alert('Need at least 2 interviews to generate aggregate synthesis');
      return;
    }

    setIsGeneratingAggregate(true);
    try {
      const response = await fetch('/api/synthesis/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate synthesis');
      }

      const data = await response.json();
      setAggregateSynthesis(data.synthesis);
    } catch (error) {
      console.error('Error generating aggregate synthesis:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate synthesis');
    } finally {
      setIsGeneratingAggregate(false);
    }
  };

  const handleGenerateFollowup = async () => {
    if (!aggregateSynthesis) {
      alert('Generate aggregate analysis first');
      return;
    }

    setIsGeneratingFollowup(true);
    try {
      const response = await fetch(`/api/studies/${studyId}/generate-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synthesis: aggregateSynthesis })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate follow-up study');
      }

      const data = await response.json();

      // Store prefill config in sessionStorage and navigate to setup
      sessionStorage.setItem('prefillStudyConfig', JSON.stringify(data.followUpConfig));
      router.push('/setup?prefill=followup');
    } catch (error) {
      console.error('Error generating follow-up study:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate follow-up study');
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start: number, end: number) => {
    const minutes = Math.round((end - start) / 1000 / 60);
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Study Not Found</h2>
          <p className="text-slate-500 mb-4 font-medium">The study you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/studies')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-sm"
          >
            Back to Studies
          </button>
        </div>
      </div>
    );
  }

  const interviewCount = interviews.length;
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview & Synthesis', icon: <BarChart3 size={16} /> },
    { id: 'interviews', label: `Interviews (${interviewCount})`, icon: <Users size={16} /> },
    { id: 'settings', label: 'Study Settings', icon: <Settings size={16} /> }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 sm:p-8 lg:p-10">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card"
        >
          <button
            onClick={() => router.push('/studies')}
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-4 text-xs font-semibold uppercase tracking-wider transition-colors w-fit"
          >
            <ArrowLeft size={14} />
            Back to Studies
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-xs">
                <BookOpen size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
                  {study.config.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                    <Users size={13} className="text-slate-400" />
                    {interviewCount} {interviewCount === 1 ? 'interview' : 'interviews'}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                    <Calendar size={13} className="text-slate-400" />
                    Created {formatDate(study.createdAt)}
                  </span>
                  <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold ${
                    study.isLocked
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {study.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                    {study.isLocked ? 'Locked' : 'Editable'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/setup?prefill=edit&studyId=${studyId}`)}
                disabled={study.isLocked}
                className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-xs hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <Settings size={15} className="text-slate-500" />
                Edit Configuration
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-4 pt-2 shadow-card">
          <div className="flex gap-4 border-b border-slate-100 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3.5 pt-2 flex items-center gap-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Research Question */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                    <h3 className="font-bold text-slate-900 mb-1.5 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-600">
                      <Sparkles size={16} className="text-blue-600" />
                      Research Question
                    </h3>
                    <p className="text-slate-800 text-base font-medium leading-relaxed">
                      {study.config.researchQuestion}
                    </p>
                  </div>

                  {/* Stats Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
                      <div className="text-3xl font-extrabold tracking-tight text-slate-900">{interviewCount}</div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Interviews</div>
                    </div>
                    <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
                      <div className="text-3xl font-extrabold tracking-tight text-slate-900">{study.config.coreQuestions?.length || 0}</div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Core Questions</div>
                    </div>
                    <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
                      <div className="text-3xl font-extrabold tracking-tight text-slate-900">{study.config.topicAreas?.length || 0}</div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Topic Areas</div>
                    </div>
                  </div>

                  {/* Aggregate Synthesis */}
                  <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <BarChart3 size={18} className="text-blue-600" />
                          Cross-Interview Aggregate Analysis
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Synthesize patterns, themes, and candidate comparisons across all participant sessions.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateAggregateSynthesis}
                        disabled={isGeneratingAggregate || interviewCount < 2}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xs active:scale-[0.98]"
                      >
                        {isGeneratingAggregate ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Sparkles size={15} />
                        )}
                        {isGeneratingAggregate ? 'Analyzing...' : 'Analyze All Interviews'}
                      </button>
                    </div>

                    {interviewCount < 2 ? (
                      <p className="text-slate-500 text-sm font-medium py-4 text-center">
                        Need at least 2 completed interviews to generate aggregate synthesis.
                      </p>
                    ) : aggregateSynthesis ? (
                      <div className="space-y-6">
                        {/* Bottom Line */}
                        <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 shadow-xs">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1.5 flex items-center gap-1.5">
                            <Lightbulb size={16} className="text-blue-600" />
                            Executive Bottom Line
                          </h4>
                          <p className="text-slate-900 text-base font-semibold leading-relaxed">
                            {aggregateSynthesis.bottomLine}
                          </p>
                        </div>

                        {/* Key Findings */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Key Findings</h4>
                          <div className="grid gap-2.5">
                            {aggregateSynthesis.keyFindings.map((finding, i) => (
                              <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 font-medium flex items-start gap-2.5 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                                <span className="leading-relaxed">{finding}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Participant Comparisons */}
                        {aggregateSynthesis.participantComparisons?.length ? (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Participant Benchmarking</h4>
                            {aggregateSynthesis.topParticipantSummary && (
                              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm text-emerald-900 font-medium">
                                🏆 {aggregateSynthesis.topParticipantSummary}
                              </div>
                            )}
                            <div className="grid gap-3">
                              {aggregateSynthesis.participantComparisons.map((participant) => (
                                <div key={`${participant.rank}-${participant.participantName}`} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <div className="font-bold text-slate-900 text-base">
                                        #{participant.rank} {participant.participantName}
                                      </div>
                                      <p className="mt-0.5 text-xs text-slate-500 font-medium">{participant.summary}</p>
                                    </div>
                                    <div className="rounded-xl bg-blue-50 px-3.5 py-1 text-sm font-bold text-blue-700 border border-blue-100 w-fit">
                                      Score: {participant.score}/100
                                    </div>
                                  </div>
                                  <div className="mt-3.5 grid gap-3 md:grid-cols-2 border-t border-slate-100 pt-3">
                                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3">
                                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Key Strengths</div>
                                      <ul className="space-y-1">
                                        {participant.strengths.map((strength, i) => (
                                          <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-1.5">
                                            <span className="text-emerald-600 font-bold">•</span>
                                            <span>{strength}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3">
                                      <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Areas for Development</div>
                                      <ul className="space-y-1">
                                        {participant.gaps.map((gap, i) => (
                                          <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-1.5">
                                            <span className="text-amber-600 font-bold">•</span>
                                            <span>{gap}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Common Themes */}
                        {aggregateSynthesis.commonThemes?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recurring Themes</h4>
                            <div className="grid gap-3 md:grid-cols-2">
                              {aggregateSynthesis.commonThemes.map((theme, i) => (
                                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                                  <div className="font-bold text-slate-900 text-sm">{theme.theme}</div>
                                  <div className="text-xs text-blue-600 font-semibold mt-0.5">
                                    Mentioned in {theme.frequency} interview{theme.frequency === 1 ? '' : 's'}
                                  </div>
                                  {theme.representativeQuotes?.length > 0 && (
                                    <p className="text-xs text-slate-600 mt-2.5 italic border-l-2 border-slate-200 pl-2.5 leading-relaxed">
                                      "{theme.representativeQuotes[0]}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Divergent Views */}
                        {aggregateSynthesis.divergentViews?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Divergent Perspectives</h4>
                            <div className="space-y-3">
                              {aggregateSynthesis.divergentViews.map((view, i) => (
                                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                                  <div className="font-bold text-slate-900 text-sm mb-2">{view.topic}</div>
                                  <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2 border-t border-slate-100 pt-2.5">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                      <span className="font-bold text-slate-800 block mb-0.5">Perspective A:</span> {view.viewA}
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                      <span className="font-bold text-slate-800 block mb-0.5">Perspective B:</span> {view.viewB}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Research Implications */}
                        {aggregateSynthesis.researchImplications?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Actionable Implications</h4>
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
                              {aggregateSynthesis.researchImplications.map((item, i) => (
                                <div key={i} className="text-slate-800 text-xs font-medium flex items-start gap-2">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Follow-up CTA */}
                        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Explore Further</h4>
                            <p className="text-xs text-slate-500 font-medium">
                              Generate a follow-up study tailored to the findings and open questions above.
                            </p>
                          </div>
                          <button
                            onClick={handleGenerateFollowup}
                            disabled={isGeneratingFollowup}
                            className="px-4 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold shadow-xs active:scale-[0.98]"
                          >
                            {isGeneratingFollowup ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <GitBranch size={15} />
                            )}
                            {isGeneratingFollowup ? 'Generating...' : 'Create Follow-up Study'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm font-medium py-4 text-center">
                        Click "Analyze All Interviews" to synthesize patterns across completed participant sessions.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'interviews' && (
                <div className="space-y-4">
                  {interviews.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                      <Users size={32} className="text-slate-400 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-slate-900 mb-1">No Interviews Yet</h3>
                      <p className="text-slate-500 text-xs font-medium max-w-sm mx-auto">
                        Share your participant link to start collecting interviews for this study.
                      </p>
                    </div>
                  ) : (
                    interviews.map((interview, index) => (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-slate-300 hover:shadow-card-hover transition-all duration-200 cursor-pointer shadow-card group"
                        onClick={() => router.push(`/dashboard/interview/${interview.id}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Participant Name */}
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {interview.participantName || "Participant"}
                              </h4>
                            </div>

                            {/* Participant info */}
                            {Array.isArray(interview.participantProfile?.fields) && interview.participantProfile.fields.length > 0 && (
                              <div className="text-xs text-slate-500 mb-3 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 w-fit">
                                {interview.participantProfile.fields
                                  .filter(f => f.status === 'extracted' && f.value)
                                  .slice(0, 3)
                                  .map(f => f.value)
                                  .join(' • ')}
                              </div>
                            )}

                            {/* Key insight */}
                            {interview.synthesis?.bottomLine && (
                              <div className="flex items-start gap-2 text-xs text-slate-800 bg-blue-50/40 border border-blue-100 rounded-xl p-3 mb-3">
                                <Lightbulb size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2 leading-relaxed font-medium">{interview.synthesis.bottomLine}</span>
                              </div>
                            )}

                            {/* Stats */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                              <div className="flex items-center gap-1">
                                <Clock size={12} className="text-slate-400" />
                                {formatDuration(interview.createdAt, interview.completedAt)}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare size={12} className="text-slate-400" />
                                {interview.history?.length ?? 0} messages
                              </div>
                              <div className="text-slate-400">
                                {formatDate(interview.createdAt)}
                              </div>
                            </div>
                          </div>

                          <button
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/interview/${interview.id}`);
                            }}
                            title="View Interview"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {/* Study Config Display */}
                  <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Study Name</label>
                      <p className="text-slate-900 font-semibold text-base">{study.config.name}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                      <p className="text-slate-700 text-sm font-medium">{study.config.description || 'No description provided.'}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Research Question</label>
                      <p className="text-slate-800 text-sm font-medium">{study.config.researchQuestion}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Core Questions ({study.config.coreQuestions?.length || 0})
                      </label>
                      <ul className="space-y-2">
                        {study.config.coreQuestions?.map((q, i) => (
                          <li key={i} className="text-slate-700 text-sm pl-3 border-l-2 border-blue-500 font-medium">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Topic Areas ({study.config.topicAreas?.length || 0})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {study.config.topicAreas?.map((topic, i) => (
                          <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs rounded-lg font-semibold border border-slate-200 shadow-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">AI Interview Behavior</label>
                      <p className="text-slate-800 font-semibold text-sm capitalize">{study.config.aiBehavior}</p>
                    </div>
                  </div>

                  {/* Link Management */}
                  <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <LinkIcon size={16} className="text-blue-600" />
                      Participant Link Access
                    </h3>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm">Enable Participant Access</div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {(study.config.linksEnabled ?? true)
                            ? 'Links are active and candidates can start interviews.'
                            : 'Links are disabled. Candidates will see an inactive message.'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggleLinksEnabled}
                        disabled={isTogglingLinks}
                        className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${
                          (study.config.linksEnabled ?? true)
                            ? 'bg-blue-600'
                            : 'bg-slate-300'
                        } ${isTogglingLinks ? 'opacity-50' : ''}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-xs transition-transform ${
                          (study.config.linksEnabled ?? true) ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Participant Link Generator */}
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <button
                        onClick={handleGenerateLink}
                        disabled={generatingLink || !(study.config.linksEnabled ?? true)}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-xs transition-all active:scale-[0.98]"
                      >
                        {generatingLink ? <Loader2 size={15} className="animate-spin" /> : <LinkIcon size={15} />}
                        Generate New Participant Link
                      </button>

                      {participantLink && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={participantLink}
                            readOnly
                            className="w-full min-w-0 sm:flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs font-mono shadow-xs"
                          />
                          <button
                            onClick={handleCopyLink}
                            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold shadow-xs active:scale-[0.98]"
                          >
                            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyDetail;

