'use client';

import React, { useEffect, useState } from 'react';
import { useRef } from 'react';
import jsPDF from "jspdf";
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StoredInterview } from '@/types';
import ReactMarkdown from 'react-markdown';
import { markdownComponents } from './markdownCodeBlock';
import { formatMessageForMarkdown } from '@/lib/formatChatMarkdown';
import { PDF_PAGE_BOTTOM, renderPdfMessage } from '@/lib/pdfMessageRenderer';
import {
  Loader2,
  ArrowLeft,
  Download,
  Clock,
  MessageSquare,
  User,
  Bot,
  Target,
  TrendingUp,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';

interface InterviewDetailProps {
  interviewId: string;
}

const InterviewDetail: React.FC<InterviewDetailProps> = ({ interviewId }) => {
  const router = useRouter();
  const loaded = useRef(false);
  const [interview, setInterview] = useState<StoredInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis'>('transcript');

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    loadInterview();
  }, [interviewId]);

  const loadInterview = async () => {
  setLoading(true);
  try {
    const res = await fetch(`/api/interviews/${interviewId}`, {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error('Failed to fetch interview');
    }

    const data = await res.json();
    setInterview(data.interview || data);
  } catch (error) {
    console.error('Error loading interview:', error);
    setInterview(null);
  } finally {
    setLoading(false);
  }
};


  const handleDownloadJSON = () => {
    if (!interview) return;

    const doc = new jsPDF();

    const jsonText = JSON.stringify(interview, null, 2);

    const lines = doc.splitTextToSize(jsonText, 180);

    doc.text(lines, 10, 10);

    doc.save(`interview-${interview.id}.pdf`);
    };

  const loadImageAsDataURL = (url: string): Promise<string> => {
    return fetch(url)
      .then(res => res.blob())
      .then(
        blob =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      );
  };

  const handleDownloadTranscript = async () => {
    if (!interview) return;

    // Prefer the server-computed participantName (has a fallback chain that
    // also checks the raw transcript), same as the on-screen header above.
    const pdfNameField = interview.participantProfile?.fields?.find(
      (f: any) => f.fieldId === "name"
    );
    const participantName =
      interview.participantName ||
      (typeof pdfNameField?.value === "string" && pdfNameField.value.trim()) ||
      "Participant";

    const doc = new jsPDF();
    const state = { y: 20, pageNumber: 1 };

    // ===== LOGO =====
    // jsPDF needs actual image data, not a bare path - fetch it and convert
    // to a data URL first, otherwise addImage silently fails to render.
    try {
      const logoDataUrl = await loadImageAsDataURL("/bharattech-logo.png");
      doc.addImage(logoDataUrl, "PNG", 10, 10, 45, 20);
    } catch (err) {
      console.warn("Could not load logo for PDF:", err);
    }

    // ===== HEADER =====
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text("Interview Research Report", 65, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      65,
      27
    );

    // Study / topic name, shown right under the generated-on date so the
    // report identifies which study it's from at a glance.
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(
      `Study: ${interview.studyName || 'Untitled Study'}`,
      65,
      33
    );

    state.y = 42;

    // Divider
    doc.setDrawColor(200);
    doc.line(10, state.y, 200, state.y);

    state.y += 10;

    // ===== PARTICIPANT NAME (HEADER) =====
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130);
    doc.text("PARTICIPANT", 10, state.y);
    state.y += 8;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20);
    doc.text(participantName, 10, state.y);
    doc.setFont('helvetica', 'normal');

    state.y += 8;

    // Divider
    doc.setDrawColor(220);
    doc.line(10, state.y, 200, state.y);

    state.y += 10;

    // ===== ANALYSIS =====

    // ===== ANALYSIS =====

    if (interview.synthesis) {
      const isPlaceholder = (value: unknown) =>
        typeof value === 'string' &&
        /analysis pending|synthesis in progress|no .* extracted yet/i.test(value);

      const statedPreferences = (interview.synthesis.statedPreferences || []).filter(v => !isPlaceholder(v));
      const revealedPreferences = (interview.synthesis.revealedPreferences || []).filter(v => !isPlaceholder(v));
      const themes = (interview.synthesis.themes || []).filter(
        (t: any) => !isPlaceholder(t.theme) && !isPlaceholder(t.evidence)
      );
      const contradictions = interview.synthesis.contradictions || [];
      const keyInsights = (interview.synthesis.keyInsights || []).filter(v => !isPlaceholder(v));

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Analysis", 10, state.y);
      state.y += 8;

      doc.setFontSize(11);

      const insight = doc.splitTextToSize(interview.synthesis.bottomLine || '', 180);

      doc.text("Key Insight:", 10, state.y);
      state.y += 6;

      if (state.y + insight.length * 6 > PDF_PAGE_BOTTOM) {
        doc.addPage();
        state.pageNumber++;
        state.y = 20;
      }
      doc.text(insight, 10, state.y);
      state.y += insight.length * 6 + 6;

      // --- Stated vs Revealed ---
      if (statedPreferences.length > 0 || revealedPreferences.length > 0) {
        if (state.y + 12 > PDF_PAGE_BOTTOM) {
          doc.addPage(); state.pageNumber++; state.y = 20;
        }
        doc.setFontSize(12);
        doc.text("Stated vs Revealed", 10, state.y);
        state.y += 7;
        doc.setFontSize(11);

        if (statedPreferences.length > 0) {
          doc.setTextColor(90);
          doc.text("What they said:", 10, state.y);
          state.y += 6;
          doc.setTextColor(20);
          statedPreferences.forEach((item: string) => {
            const lines = doc.splitTextToSize(`• ${item}`, 180);
            if (state.y + lines.length * 6 > PDF_PAGE_BOTTOM) {
              doc.addPage(); state.pageNumber++; state.y = 20;
            }
            doc.text(lines, 10, state.y);
            state.y += lines.length * 6;
          });
          state.y += 4;
        }

        if (revealedPreferences.length > 0) {
          doc.setTextColor(90);
          doc.text("What behavior revealed:", 10, state.y);
          state.y += 6;
          doc.setTextColor(20);
          revealedPreferences.forEach((item: string) => {
            const lines = doc.splitTextToSize(`• ${item}`, 180);
            if (state.y + lines.length * 6 > PDF_PAGE_BOTTOM) {
              doc.addPage(); state.pageNumber++; state.y = 20;
            }
            doc.text(lines, 10, state.y);
            state.y += lines.length * 6;
          });
          state.y += 4;
        }
      }

      // --- Key Themes ---
      if (themes.length > 0) {
        if (state.y + 12 > PDF_PAGE_BOTTOM) {
          doc.addPage(); state.pageNumber++; state.y = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Key Themes", 10, state.y);
        state.y += 7;
        doc.setFontSize(11);

        themes.forEach((theme: any) => {
          const titleLines = doc.splitTextToSize(theme.theme || '', 180);
          const evidenceLines = doc.splitTextToSize(theme.evidence || '', 180);
          const needed = (titleLines.length + evidenceLines.length) * 6 + 4;
          if (state.y + needed > PDF_PAGE_BOTTOM) {
            doc.addPage(); state.pageNumber++; state.y = 20;
          }
          doc.setTextColor(20);
          doc.text(titleLines, 10, state.y);
          state.y += titleLines.length * 6;
          doc.setTextColor(100);
          doc.text(evidenceLines, 10, state.y);
          state.y += evidenceLines.length * 6 + 4;
          doc.setTextColor(20);
        });
      }

      // --- Potential Contradictions ---
      if (contradictions.length > 0) {
        if (state.y + 12 > PDF_PAGE_BOTTOM) {
          doc.addPage(); state.pageNumber++; state.y = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Potential Contradictions", 10, state.y);
        state.y += 7;
        doc.setFontSize(11);
        doc.setTextColor(20);

        contradictions.forEach((c: string) => {
          const lines = doc.splitTextToSize(`• ${c}`, 180);
          if (state.y + lines.length * 6 > PDF_PAGE_BOTTOM) {
            doc.addPage(); state.pageNumber++; state.y = 20;
          }
          doc.text(lines, 10, state.y);
          state.y += lines.length * 6;
        });
        state.y += 4;
      }

      // --- Additional Insights ---
      if (keyInsights.length > 0) {
        if (state.y + 12 > PDF_PAGE_BOTTOM) {
          doc.addPage(); state.pageNumber++; state.y = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Additional Insights", 10, state.y);
        state.y += 7;
        doc.setFontSize(11);
        doc.setTextColor(20);

        keyInsights.forEach((item) => {
          const lines = doc.splitTextToSize(`• ${item}`, 180);
          if (state.y + lines.length * 6 > PDF_PAGE_BOTTOM) {
            doc.addPage();
            state.pageNumber++;
            state.y = 20;
          }
          doc.text(lines, 10, state.y);
          state.y += lines.length * 6;
        });
      }

      state.y += 10;
      doc.line(10, state.y, 200, state.y);
      state.y += 10;
    }
    // ===== TRANSCRIPT =====

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Interview Transcript", 10, state.y);

    state.y += 10;

    interview.messages?.forEach((msg: { role: string; content: string }) => {
      const role = msg.role === "user" ? "Participant" : "Interviewer";
      renderPdfMessage(doc, state, role, msg.content || '');
      state.y += 4; // gap between messages
    });

    // ===== FINAL PAGE NUMBER =====

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Page ${state.pageNumber}`, 180, 290);

    doc.save(`research-report-${interview._id}.pdf`);
  };

  const toValidDate = (value: unknown): Date | null => {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDuration = (start: unknown, end: unknown) => {
    const startDate = toValidDate(start);
    const endDate = toValidDate(end);

    if (!startDate || !endDate) return 'Unknown duration';

    const diff = endDate.getTime() - startDate.getTime();

    return `${Math.max(0, Math.round(diff / 1000 / 60))} minutes`;
  };

  const formatDate = (value: unknown) => {
    const date = toValidDate(value);
    if (!date) return 'Unknown date';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isPlaceholderAnalysis = (value: unknown) => {
    return typeof value === 'string' &&
      /analysis pending|synthesis in progress|no .* extracted yet/i.test(value);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-5 sm:p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Interview Not Found</h1>
          <p className="text-gray-500 mb-4">This interview may have been deleted.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // interview.participantName is computed server-side (see
  // /api/interview/complete) with a fallback chain that also checks the raw
  // transcript when the profile field wasn't populated, so it's more
  // reliable than reading participantProfile.fields directly - prefer it,
  // and only fall back to the field / generic label for older records that
  // predate that computed field.
  const nameField = interview?.participantProfile?.fields?.find(
    (f: any) => f.fieldId === "name"
  );

  const participantName =
    interview?.participantName ||
    (typeof nameField?.value === "string" && nameField.value.trim()) ||
    "Participant";
  const synthesis = interview.synthesis;
  const statedPreferences = (synthesis?.statedPreferences || [])
    .filter(item => !isPlaceholderAnalysis(item));
  const revealedPreferences = (synthesis?.revealedPreferences || [])
    .filter(item => !isPlaceholderAnalysis(item));
  const themes = (synthesis?.themes || [])
    .filter(theme => !isPlaceholderAnalysis(theme.theme) && !isPlaceholderAnalysis(theme.evidence));
  const contradictions = synthesis?.contradictions || [];
  const keyInsights = (synthesis?.keyInsights || [])
    .filter(item => !isPlaceholderAnalysis(item));
  const bottomLine = synthesis?.bottomLine && !isPlaceholderAnalysis(synthesis.bottomLine)
    ? synthesis.bottomLine
    : keyInsights[0] || 'Analysis is being regenerated from the interview transcript.';

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
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 mb-4 text-xs font-semibold uppercase tracking-wider transition-colors w-fit"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                  {interview.studyName}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
                {participantName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  <Clock size={13} className="text-slate-400" />
                  {formatDuration(interview.createdAt, interview.completedAt)}
                </span>
                <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  <MessageSquare size={13} className="text-slate-400" />
                  {interview.messages?.length ?? 0} messages
                </span>
                <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  {formatDate(interview.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadTranscript}
                className="w-full sm:w-auto px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Download size={15} />
                Download Report (PDF)
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tabs & Content */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-4 pt-2 shadow-card">
          <div className="flex gap-4 border-b border-slate-100">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`pb-3.5 pt-2 flex items-center gap-2 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'transcript'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={16} />
              Interview Transcript
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`pb-3.5 pt-2 flex items-center gap-2 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'analysis'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Target size={16} />
              Synthesis & Insights
            </button>
          </div>

          <div className="py-6">
            {/* Tab Content */}
            {activeTab === 'transcript' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {interview.messages?.map((msg: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role !== 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5 shadow-xs">
                        <Bot size={16} />
                      </div>
                    )}

                    <div
                      className={`min-w-0 max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-slate-50 border border-slate-200/90 text-slate-900 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
                        msg.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                      }`}>
                        {msg.role === 'user' ? participantName : 'AI Interviewer'}
                      </div>

                      <div className="prose prose-sm max-w-none break-words">
                        <ReactMarkdown
                          className={`text-sm leading-relaxed font-medium break-words ${
                            msg.role === 'user'
                              ? 'text-white [&_*]:text-white [&_strong]:text-white'
                              : 'text-slate-900 [&_*]:text-slate-900'
                          }`}
                          components={markdownComponents}
                        >
                          {formatMessageForMarkdown(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {synthesis ? (
                  <>
                    {/* Key Insight */}
                    <div className="bg-blue-50/70 border border-blue-200 text-slate-900 rounded-2xl p-5 sm:p-6 shadow-xs">
                      <div className="flex items-center gap-2 mb-2 text-blue-900">
                        <Target size={18} className="text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Key Bottom Line
                        </span>
                      </div>
                      <p className="text-base sm:text-lg font-bold leading-relaxed break-words text-slate-900">
                        {bottomLine}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Stated vs Revealed */}
                      <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                          <TrendingUp size={18} className="text-blue-600" />
                          Stated vs. Revealed Behaviors
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Explicitly Stated
                            </div>
                            <div className="space-y-1.5">
                              {statedPreferences.length > 0 ? statedPreferences.map((item, i) => (
                                <div
                                  key={i}
                                  className="text-xs font-medium bg-white text-slate-800 px-3 py-2 rounded-xl border border-slate-200 shadow-xs leading-relaxed"
                                >
                                  {item}
                                </div>
                              )) : (
                                <div className="text-xs text-slate-500 font-medium">No stated preferences extracted yet.</div>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Revealed in Practice
                            </div>
                            <div className="space-y-1.5">
                              {revealedPreferences.length > 0 ? revealedPreferences.map((item, i) => (
                                <div
                                  key={i}
                                  className="text-xs font-medium bg-white text-slate-800 px-3 py-2 rounded-xl border border-slate-200 shadow-xs leading-relaxed"
                                >
                                  {item}
                                </div>
                              )) : (
                                <div className="text-xs text-slate-500 font-medium">No revealed preferences extracted yet.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Themes */}
                      <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                          <Lightbulb size={18} className="text-blue-600" />
                          Key Observed Themes
                        </h3>

                        <div className="space-y-3">
                          {themes.length > 0 ? themes.map((theme, i) => (
                            <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                              <div className="font-bold text-slate-900 text-xs">{theme.theme}</div>
                              <div className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">{theme.evidence}</div>
                            </div>
                          )) : (
                            <div className="text-xs text-slate-500 font-medium">No themes extracted yet.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contradictions */}
                    {contradictions.length > 0 && (
                      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 shadow-xs">
                        <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2 text-sm">
                          <AlertTriangle size={18} className="text-amber-600" />
                          Potential Cognitive Contradictions
                        </h3>
                        <ul className="space-y-2">
                          {contradictions.map((c, i) => (
                            <li key={i} className="text-slate-800 text-xs font-medium flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Insights */}
                    <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h3 className="font-bold text-slate-900 mb-3 text-sm">
                        Additional Qualitative Insights
                      </h3>
                      <ul className="space-y-2">
                        {keyInsights.length > 0 ? keyInsights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-blue-600 font-bold">•</span>
                            <span className="leading-relaxed">{insight}</span>
                          </li>
                        )) : (
                          <li className="text-xs text-slate-500 font-medium">No additional insights generated yet.</li>
                        )}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center">
                    <p className="text-slate-500 text-sm font-medium">
                      No analysis available for this interview yet.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetail;

