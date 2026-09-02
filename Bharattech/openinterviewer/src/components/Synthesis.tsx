'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { synthesizeInterview } from '@/services/mistralService';
import { saveCompletedInterview } from '@/services/storageService';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart3,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const Synthesis: React.FC = () => {
  const router = useRouter();
  const {
    studyConfig,
    participantProfile,
    interviewHistory,
    behaviorData,
    synthesis,
    setSynthesis,
    setStep,
    participantToken,
    viewMode
  } = useStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'pending' | 'saved' | 'failed' | null>(null);
  const [analysisError, setAnalysisError] = useState(false);

  // Track if analysis has been attempted to prevent re-running
  const hasAttemptedAnalysis = useRef(false);

  // Counter to trigger re-analysis when retry is clicked
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Extract save logic into a reusable function for retry
  const doSave = async (synthesisToSave: typeof synthesis) => {
    if (!studyConfig) return;

    setIsSaving(true);
    setSaveStatus('pending');
    try {
      const interviewId = participantProfile?.id || crypto.randomUUID();
      const saveResult = await saveCompletedInterview({
        id: interviewId,
        history: interviewHistory,
        messages: interviewHistory,
        studyId: studyConfig.id || String(studyConfig._id),
        studyName: studyConfig.name,
        participantProfile: participantProfile || {
          id: interviewId,
          fields: [],
          rawContext: '',
          timestamp: Date.now()
        },
        transcript: interviewHistory,
        synthesis: synthesisToSave,
        behaviorData: behaviorData,
        createdAt: participantProfile?.timestamp || Date.now()
      } as any, participantToken);

      setSaveStatus(saveResult.success ? 'saved' : 'failed');
      if (saveResult.success) {
        window.dispatchEvent(new Event("interviewCompleted"));
      }
    } catch (error) {
      console.error('Error saving interview:', error);
      setSaveStatus('failed');
    } finally {
      setIsSaving(false);
    }
  };

  // Retry save handler
  const handleRetrySave = () => {
    if (synthesis) {
      doSave(synthesis);
    }
  };

  // Retry analysis handler (for when synthesis itself fails)
  const handleRetryAnalysis = () => {
    setAnalysisError(false);
    hasAttemptedAnalysis.current = false;
    setRetryTrigger(prev => prev + 1);  // Trigger effect re-run
  };

  useEffect(() => {
    const analyzeAndSave = async () => {
      if (!studyConfig || interviewHistory.length === 0) return;

      // If we already have synthesis, try to save if not already saved
      if (synthesis) {
        if (saveStatus === null && !hasAttemptedAnalysis.current) {
          // Page was refreshed with synthesis in store but save never attempted
          hasAttemptedAnalysis.current = true;
          doSave(synthesis);
        }
        return;
      }

      // Prevent re-running analysis if already attempted
      if (hasAttemptedAnalysis.current) return;
      hasAttemptedAnalysis.current = true;

      setIsAnalyzing(true);
      try {
        // Save transcript first (prevents data loss)
        if (saveStatus === null) {
          await doSave(null);
        }

        const result = await synthesizeInterview(
          interviewHistory,
          studyConfig,
          behaviorData,
          participantProfile,
          participantToken
        );

        setSynthesis(result);

        // Save again with synthesis
        await doSave(result);
      } catch (error) {
        console.error('Error synthesizing interview:', error);
        setAnalysisError(true);
        hasAttemptedAnalysis.current = false;  // Allow retry
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeAndSave();
    // Note: behaviorData, participantProfile, participantToken are intentionally
    // not in deps - we only want to analyze once when the page loads, not on updates
    // retryTrigger is included to allow manual retry after failure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyConfig, interviewHistory, synthesis, saveStatus, setSynthesis, retryTrigger]);

  const handleBack = () => {
    setStep('interview');
    router.push('/interview');
  };

  const handleExport = () => {
    setStep('export');
    router.push('/export');
  };

  // 🔒 Hide analytics for participants
  if (viewMode !== 'researcher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 px-4 text-center">
        <p className="font-semibold text-lg">Thank you for completing the interview.</p>
      </div>
    );
  }

  if (!studyConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-semibold">No study configured.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-5 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="text-slate-600" size={20} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900 break-words">Interview Analysis</h1>
          </div>
          <p className="text-slate-500 sm:ml-13 font-medium">
            Patterns and insights from the conversation
          </p>
        </motion.div>

        {isAnalyzing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-50 rounded-xl border border-slate-200 p-6 sm:p-12 text-center shadow-sm"
          >
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Analyzing Interview...
            </h2>
            <p className="text-slate-500 font-medium">
              Looking for patterns, themes, and insights
            </p>
          </motion.div>
        ) : synthesis ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Save Status Banner */}
            {saveStatus === 'saved' && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3 shadow-xs font-semibold text-sm">
                <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                <span>Interview saved successfully. View it in the researcher dashboard.</span>
              </div>
            )}
            {saveStatus === 'failed' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <XCircle size={20} className="text-amber-600 flex-shrink-0" />
                  <span className="font-semibold text-sm">Could not save interview. You can still export locally below.</span>
                </div>
                <button
                  onClick={handleRetrySave}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Retry Save
                </button>
              </div>
            )}
            {saveStatus === 'pending' && isSaving && (
              <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl p-4 flex items-center gap-3 shadow-xs font-medium">
                <Loader2 size={20} className="animate-spin text-blue-600 flex-shrink-0" />
                <span>Saving interview...</span>
              </div>
            )}

            {/* Bottom Line */}
            <div className="bg-blue-50 border border-blue-200 text-slate-900 rounded-xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-slate-500 font-semibold">
                <Target size={18} />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Key Insight
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold break-words">{synthesis.bottomLine}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stated vs Revealed */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-slate-500" />
                  Stated vs Revealed
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                      What they said
                    </div>
                    <div className="space-y-1">
                      {synthesis.statedPreferences.map((item, i) => (
                        <div
                          key={i}
                          className="text-sm bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm font-medium"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                      What their behavior revealed
                    </div>
                    <div className="space-y-1">
                      {synthesis.revealedPreferences.map((item, i) => (
                        <div
                          key={i}
                          className="text-sm bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg shadow-sm font-medium"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Themes */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Lightbulb size={18} className="text-slate-500" />
                  Key Themes
                </h3>

                <div className="space-y-3">
                  {synthesis.themes.map((theme, i) => (
                    <div key={i} className="border-b border-slate-200 pb-3 last:border-0">
                      <div className="font-semibold text-slate-900">{theme.theme}</div>
                      <div className="text-sm text-slate-500 mt-1 font-medium">{theme.evidence}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contradictions */}
            {synthesis.contradictions.length > 0 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 sm:p-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  Potential Contradictions
                </h3>
                <ul className="space-y-2">
                  {synthesis.contradictions.map((c, i) => (
                    <li key={i} className="text-slate-700 text-sm font-medium">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Insights */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">
                Additional Insights
              </h3>
              <ul className="space-y-2">
                {synthesis.keyInsights.map((insight, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-slate-700 text-sm font-medium"
                  >
                    <span className="text-slate-400 font-bold">-</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 bg-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <ArrowLeft size={18} /> Continue Interview
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Export Data <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        ) : analysisError ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-50 rounded-xl border border-slate-200 p-6 sm:p-12 text-center shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Analysis Failed
            </h2>
            <p className="text-slate-500 mb-6 font-medium">
              There was an error analyzing the interview. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 bg-white font-semibold transition-colors"
              >
                Back to Interview
              </button>
              <button
                onClick={handleRetryAnalysis}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <RefreshCw size={18} />
                Retry Analysis
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 sm:p-12 text-center shadow-sm">
            <p className="text-slate-500 font-semibold">
              No interview data to analyze yet.
            </p>
            <button
              onClick={handleBack}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-sm transition"
            >
              Go to Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Synthesis;
