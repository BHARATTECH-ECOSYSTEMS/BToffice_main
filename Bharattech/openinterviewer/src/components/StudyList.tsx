'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { StoredStudy } from '@/types';
import { getAllStudies, deleteStudy, setStudyLocked } from '@/services/storageService';
import {
  Loader2,
  Plus,
  BookOpen,
  Users,
  Calendar,
  Lock,
  Unlock,
  Trash2,
  Eye,
  Link as LinkIcon,
  MoreVertical,
  LogOut,
  AlertTriangle,
  Database,
  Sparkles
} from 'lucide-react';

const StudyList: React.FC = () => {
  const router = useRouter();
  const { reset } = useStore();
  const [studies, setStudies] = useState<StoredStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [kvWarning, setKvWarning] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStudies();
  }, []);

  // "Create Study" must start from a blank form. Without this, the store still
  // holds whichever study was last created/edited (it's persisted to
  // sessionStorage), so StudySetup would pre-fill with that old study's data
  // and, worse, reuse its id — meaning "save" would overwrite the old study
  // instead of creating a new one, and no new entry would show up here.
  const handleCreateStudy = () => {
    reset();
    router.push('/setup');
  };

  const loadStudies = async () => {
    setLoading(true);
    try {
      const { studies: data, warning } = await getAllStudies();
      setStudies(data);
      setKvWarning(warning || null);
    } catch (error) {
      console.error('Error loading studies:', error);
    } finally {
      setLoading(false);
    }
  };

  const [togglingLockId, setTogglingLockId] = useState<string | null>(null);

  const handleToggleLock = async (id: string, currentlyLocked: boolean) => {
    setTogglingLockId(id);
    try {
      const result = await setStudyLocked(id, !currentlyLocked);
      if (result.success) {
        setStudies(studies.map(s => s.id === id ? { ...s, isLocked: !currentlyLocked } : s));
      } else {
        alert(result.error || 'Failed to update lock state');
      }
    } catch (error) {
      console.error('Error toggling study lock:', error);
      alert('Failed to update lock state');
    } finally {
      setTogglingLockId(null);
      setMenuOpenId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const result = await deleteStudy(id);
      if (result.success) {
        setStudies(studies.filter(s => s.id !== id));
      } else {
        alert(result.error || 'Failed to delete study');
      }
    } catch (error) {
      console.error('Error deleting study:', error);
      alert('Failed to delete study');
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
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

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    setDemoMessage(null);
    try {
      const response = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setDemoMessage({
          type: 'success',
          text: `Demo data loaded: ${data.data.studiesSeeded} study, ${data.data.interviewsSeeded} interviews`
        });
        await loadStudies(); // Refresh the list
      } else {
        setDemoMessage({ type: 'error', text: data.error || 'Failed to load demo data' });
      }
    } catch (error) {
      console.error('Error loading demo:', error);
      setDemoMessage({ type: 'error', text: 'Failed to load demo data' });
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleClearDemo = async () => {
    if (!confirm('Are you sure you want to clear all demo data?')) return;

    setLoadingDemo(true);
    setDemoMessage(null);
    try {
      const response = await fetch('/api/demo/seed', { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        setDemoMessage({ type: 'success', text: 'Demo data cleared' });
        await loadStudies(); // Refresh the list
      } else {
        setDemoMessage({ type: 'error', text: data.error || 'Failed to clear demo data' });
      }
    } catch (error) {
      console.error('Error clearing demo:', error);
      setDemoMessage({ type: 'error', text: 'Failed to clear demo data' });
    } finally {
      setLoadingDemo(false);
    }
  };

  // Check if demo data exists
  const hasDemoData = studies.some(s => s.id.startsWith('demo-'));

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-xs">
                <BookOpen size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
                  My Studies
                </h1>
                <p className="text-slate-500 font-medium text-sm mt-0.5">
                  {studies.length} research {studies.length === 1 ? 'study' : 'studies'} configured
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleCreateStudy}
                className="px-3.5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold shadow-xs hover:shadow-subtle active:scale-[0.98]"
              >
                <Plus size={16} />
                Create Study
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-xs hover:border-slate-300 active:scale-[0.98]"
              >
                <Users size={16} className="text-slate-500" />
                All Interviews
              </button>
              {hasDemoData ? (
                <button
                  onClick={handleClearDemo}
                  disabled={loadingDemo}
                  className="px-3.5 py-2 text-sm border border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-medium active:scale-[0.98]"
                >
                  {loadingDemo ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                  Clear Demo
                </button>
              ) : (
                <button
                  onClick={handleLoadDemo}
                  disabled={loadingDemo || !!kvWarning}
                  className="px-3.5 py-2 text-sm border border-purple-200 bg-purple-50/50 text-purple-800 hover:bg-purple-100/60 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-medium active:scale-[0.98]"
                >
                  {loadingDemo ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Load Demo
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-3.5 py-2 text-sm border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-2 font-medium active:scale-[0.98]"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </motion.div>

        {/* Storage Warning Banner */}
        {kvWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs"
          >
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 text-sm mb-0.5">MongoDB Not Connected</h4>
              <p className="text-sm text-amber-800 font-medium">{kvWarning}</p>
              <p className="text-xs text-amber-700/90 mt-1.5 font-medium">
                Use your Atlas database user's real password in MONGODB_URI, not your MongoDB website login password.
              </p>
            </div>
          </motion.div>
        )}

        {/* Demo Message Banner */}
        {demoMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 flex items-center gap-3 border shadow-xs ${
              demoMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {demoMessage.type === 'success' ? (
              <Sparkles size={20} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">
              {demoMessage.text}
            </p>
            <button
              onClick={() => setDemoMessage(null)}
              className="ml-auto text-slate-400 hover:text-slate-600 font-bold p-1"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin text-blue-600" />
            <p className="text-xs text-slate-400 font-medium">Loading studies...</p>
          </div>
        ) : studies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-card"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <BookOpen size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1.5">No Studies Yet</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto font-medium">
              Create your first study or load demo data to explore AI-assisted interview intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                onClick={handleCreateStudy}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold shadow-xs active:scale-[0.98]"
              >
                <Plus size={18} />
                Create Study
              </button>
              {!kvWarning && (
                <button
                  onClick={handleLoadDemo}
                  disabled={loadingDemo}
                  className="px-6 py-2.5 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100/70 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-semibold active:scale-[0.98]"
                >
                  {loadingDemo ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Load Demo Data
                </button>
              )}
            </div>
            {!kvWarning && (
              <p className="text-slate-400 text-xs mt-4 font-medium">
                Demo includes a sample study with 3 completed interviews and AI analysis
              </p>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {studies.map((study, index) => (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-slate-300 hover:shadow-card-hover transition-all duration-200 relative shadow-card group"
              >
                {/* Menu button */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === study.id ? null : study.id);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuOpenId === study.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                        <button
                          onClick={() => {
                            router.push(`/studies/${study.id}`);
                            setMenuOpenId(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                        >
                          <Eye size={15} className="text-slate-500" />
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            sessionStorage.setItem('prefillStudyConfig', JSON.stringify(study.config));
                            router.push(`/setup?prefill=edit&studyId=${study.id}`);
                            setMenuOpenId(null);
                          }}
                          disabled={study.isLocked}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          <LinkIcon size={15} className="text-slate-500" />
                          Edit & Generate Link
                        </button>
                        <button
                          onClick={() => handleToggleLock(study.id, !!study.isLocked)}
                          disabled={togglingLockId === study.id}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          {togglingLockId === study.id ? (
                            <Loader2 size={15} className="animate-spin text-blue-600" />
                          ) : study.isLocked ? (
                            <Unlock size={15} className="text-slate-500" />
                          ) : (
                            <Lock size={15} className="text-slate-500" />
                          )}
                          {study.isLocked ? 'Unlock Study' : 'Lock Study'}
                        </button>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={() => handleDelete(study.id)}
                          disabled={deletingId === study.id || study.isLocked}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50/70 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          {deletingId === study.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                          Delete Study
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Content */}
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/studies/${study.id}`)}
                >
                  <div className="flex items-start gap-3 mb-3 pr-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-blue-600 transition-colors break-words">
                        {study.config.name}
                      </h3>
                      {study.config.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 font-medium">
                          {study.config.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mb-4">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <Users size={13} className="text-slate-400" />
                      <span>{study.interviewCount} {study.interviewCount === 1 ? 'interview' : 'interviews'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{formatDate(study.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                      study.isLocked
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {study.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                      {study.isLocked ? 'Locked' : 'Editable'}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {study.config.coreQuestions?.length || 0} core questions
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyList;

