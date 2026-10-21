'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { StoredInterview, StoredStudy } from '@/types';
import { useStore } from '@/store';
import { getPaginatedInterviews, exportAllInterviews, getAllStudies } from '@/services/storageService';
import {
  Loader2,
  FileText,
  Download,
  Eye,
  Clock,
  MessageSquare,
  Lightbulb,
  ArrowLeft,
  FolderOpen,
  LogOut,
  Filter,
  BookOpen,
  Copy,
  Check,
  Mail,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const PAGE_SIZE = 10;

const Dashboard: React.FC = () => {
  const router = useRouter();
  const [interviews, setInterviews] = useState<StoredInterview[]>([]);
  const [studies, setStudies] = useState<StoredStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [participantEmail, setParticipantEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { viewMode } = useStore();

  const generateLink = async () => {
    if (!selectedStudyId) {
      alert("Please select a study first.");
      return;
    }

    const res = await fetch('/api/participant-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studyId: selectedStudyId })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error(error);
      throw Error("Failed to generate token");
    }

    const data = await res.json();
    const fullLink = `${window.location.origin}/p/${data.token}`;
    setLink(fullLink);
    setLinkCopied(false);
    setEmailStatus(null);
  };

  const handleCopyLink = async () => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) {
      setEmailStatus({ type: 'error', message: 'Generate an interview link before sending email.' });
      return;
    }

    if (!participantEmail.trim()) {
      setEmailStatus({ type: 'error', message: 'Enter at least one participant email.' });
      return;
    }

    const emailList = participantEmail
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(e => !emailRegex.test(e));

    if (invalidEmails.length > 0) {
      setEmailStatus({ type: 'error', message: `Invalid email: ${invalidEmails.slice(0, 2).join(', ')}` });
      return;
    }

    setEmailSending(true);
    setEmailStatus(null);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          emails: emailList,
          link: link
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setEmailStatus({ type: 'success', message: `Email sent to ${emailList.length} participant${emailList.length === 1 ? '' : 's'}.` });
        setParticipantEmail("");
      } else {
        setEmailStatus({ type: 'error', message: data.error || "Failed to send email." });
      }
    } catch (error) {
      console.error(error);
      setEmailStatus({ type: 'error', message: "Error sending email. Please try again." });
    } finally {
      setEmailSending(false);
    }
  };

  useEffect(() => {
    loadStudies();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    loadInterviews(selectedStudyId, 1);
  }, [selectedStudyId]);

  useEffect(() => {
    const handleNewInterview = () => {
      loadInterviews(selectedStudyId, currentPage, false);
    };

    window.addEventListener("interviewCompleted", handleNewInterview);

    return () => {
      window.removeEventListener("interviewCompleted", handleNewInterview);
    };
  }, [selectedStudyId, currentPage]);

  const loadStudies = async () => {
    try {
      const { studies: data } = await getAllStudies();
      setStudies(data);
    } catch (error) {
      console.error('Error loading studies:', error);
    }
  };

  const loadInterviews = async (studyId: string | null, page = 1, showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const data = await getPaginatedInterviews({
        studyId: studyId || undefined,
        page,
        limit: PAGE_SIZE
      });

      // Ensure strict descending order (latest first)
      const sorted = [...(data.interviews || [])].sort((a, b) => {
        const timeA = toValidDate(a.createdAt)?.getTime() || 0;
        const timeB = toValidDate(b.createdAt)?.getTime() || 0;
        return timeB - timeA;
      });

      setInterviews(sorted);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (error) {
      console.error('Error loading interviews:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || loading) return;
    setCurrentPage(newPage);
    loadInterviews(selectedStudyId, newPage, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const blob = await exportAllInterviews();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interviews-export-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toValidDate = (value: unknown): Date | null => {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDuration = (start: unknown, end: unknown) => {
    const startDate = toValidDate(start);
    const endDate = toValidDate(end);
    if (!startDate || !endDate) return 'In progress';
    const diff = endDate.getTime() - startDate.getTime();
    if (diff < 0) return 'In progress';
    return `${Math.max(0, Math.round(diff / 1000 / 60))} minutes`;
  };

  const formatDate = (value: unknown) => {
    const date = toValidDate(value);
    if (!date) return 'Unknown date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatus = (interview: StoredInterview) => (
    interview.status || (interview.completedAt ? 'completed' : 'in_progress')
  );

  const getStatusBadgeClass = (interview: StoredInterview) => {
    const status = getStatus(interview);
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'terminated': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getProfileSummary = (interview: StoredInterview) => {
    if (Array.isArray(interview.participantProfile?.fields) && interview.participantProfile.fields.length > 0) {
      const extracted = interview.participantProfile.fields
        .filter(f => f.status === 'extracted' && f.value)
        .slice(0, 3)
        .map(f => f.value);
      if (extracted.length > 0) return extracted.join(' • ');
    }
    if (interview.participantProfile?.rawContext) return interview.participantProfile.rawContext.slice(0, 80) + '...';
    return null;
  };

  const getMessageCount = (interview: StoredInterview) => {
    return interview.messages?.length || interview.history?.length || 0;
  };

  const selectedStudy = studies.find(s => s.id === selectedStudyId);

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 sm:p-8 lg:p-10">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                  Researcher Console
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Interviews Dashboard
              </h1>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">
                {totalCount} total interview{totalCount === 1 ? '' : 's'} across active studies
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push('/studies')}
                className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-xs hover:border-slate-300 active:scale-[0.98]"
              >
                <FolderOpen size={16} className="text-slate-500" />
                All Studies
              </button>
              <button
                onClick={handleExportAll}
                disabled={exporting || totalCount === 0}
                className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-xs hover:border-slate-300 active:scale-[0.98]"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-slate-500" />}
                {exporting ? 'Exporting...' : 'Export All'}
              </button>
              <button
                onClick={handleLogout}
                className="px-3.5 py-2 text-sm bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-xs active:scale-[0.98]"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </motion.div>

        {warning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs"
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 text-sm">Storage Configuration Notice</h4>
              <p className="text-xs text-amber-800 font-medium mt-0.5">{warning}</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-card"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                <Filter size={15} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Filter By Cohort</span>
                <span className="text-sm font-semibold text-slate-900">
                  {selectedStudyId ? selectedStudy?.config.name : 'All Research Studies'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedStudyId || ''}
                onChange={(e) => setSelectedStudyId(e.target.value || null)}
                className="px-3.5 py-2 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all w-full sm:w-auto"
              >
                <option value="">All Studies ({studies.length})</option>
                {studies.map((study) => (
                  <option key={study.id} value={study.id}>
                    {study.config.name} ({study.interviewCount || 0})
                  </option>
                ))}
              </select>

              {selectedStudyId && (
                <button
                  onClick={() => setSelectedStudyId(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {selectedStudy && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                  <BookOpen size={14} />
                  <span>Selected Study</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 break-words">{selectedStudy.config.name}</h2>
                <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-3xl">
                  {selectedStudy.config.researchQuestion}
                </p>
              </div>

              <button
                onClick={() => router.push(`/studies/${selectedStudy.id}`)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 flex-shrink-0 active:scale-[0.98]"
              >
                View Study Overview
                <ArrowLeft size={14} className="rotate-180" />
              </button>
            </div>
          </motion.div>
        )}

        {selectedStudyId && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Invite Participants</h3>
                  <p className="text-xs text-slate-500 font-medium">Generate link and dispatch invitation emails</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Candidate Access Link</span>
                {link ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={link}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono select-all shadow-xs"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      {linkCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {linkCopied ? 'Copied to Clipboard!' : 'Copy Link'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generateLink}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    Generate Active Link
                  </button>
                )}
              </div>

              <form onSubmit={handleSendEmail} className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Direct Email Invite</span>
                <input
                  type="text"
                  placeholder="candidate@example.com"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  disabled={!link || emailSending}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!link || !participantEmail.trim() || emailSending}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  {emailSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  {emailSending ? 'Sending...' : 'Send Invitation Email'}
                </button>
              </form>
            </div>

            {emailStatus && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                emailStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {emailStatus.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                {emailStatus.message}
              </div>
            )}
          </motion.div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-card">
            <Loader2 size={36} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold text-sm">Loading interviews...</p>
          </div>
        ) : interviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-card"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4 shadow-xs">
              <FileText size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Interviews Collected</h3>
            <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-sm mx-auto mb-6 leading-relaxed">
              {selectedStudyId
                ? 'No participant interviews recorded yet for this selected study. Generate a link above to get started.'
                : 'No interviews found across your research studies.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {interviews.map((interview, index) => (
                <motion.div
                  key={interview.id || interview._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => router.push(`/dashboard/interview/${interview.id || interview._id}`)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-slate-300 hover:shadow-card-hover transition-all duration-200 cursor-pointer shadow-card group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-2">
                        <h3 className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-blue-600 transition-colors break-words">
                          {interview.participantName || "Unknown Participant"}
                        </h3>
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(interview)}`}>
                          {getStatus(interview).replace('_', ' ')}
                        </span>
                      </div>

                      {getProfileSummary(interview) && (
                        <div className="text-xs text-slate-500 mb-3 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                          {getProfileSummary(interview)}
                        </div>
                      )}

                      {interview.synthesis?.bottomLine && (
                        <div className="flex items-start gap-2.5 text-sm text-slate-700 bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 mb-3">
                          <Lightbulb size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed text-slate-800 font-medium">
                            {interview.synthesis.bottomLine}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                          <Clock size={13} className="text-slate-400" />
                          {formatDuration(interview.createdAt, interview.completedAt)}
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                          <MessageSquare size={13} className="text-slate-400" />
                          {getMessageCount(interview)} messages
                        </div>
                        <div className="text-slate-400">
                          {formatDate(interview.createdAt)}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/interview/${interview.id || interview._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex-shrink-0 group-hover:text-blue-600"
                      title="View Full Report"
                    >
                      <Eye size={20} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/80 bg-white rounded-2xl p-4 sm:p-5 border shadow-card">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Showing <span className="text-slate-900 font-bold">{Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}</span>–<span className="text-slate-900 font-bold">{Math.min(currentPage * PAGE_SIZE, totalCount)}</span> of <span className="text-slate-900 font-bold">{totalCount}</span> interviews
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1 active:scale-[0.98]"
                    title="Previous Page"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) => (
                        typeof item === 'number' ? (
                          <button
                            key={idx}
                            onClick={() => handlePageChange(item)}
                            disabled={loading}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                              item === currentPage
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {item}
                          </button>
                        ) : (
                          <span key={idx} className="px-1 text-slate-400 font-bold text-xs">...</span>
                        )
                      ))
                    }
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1 active:scale-[0.98]"
                    title="Next Page"
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
