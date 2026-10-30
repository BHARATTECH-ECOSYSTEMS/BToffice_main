'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { StoredStudy } from '@/types';
import { getAllStudies, deleteStudy, setStudyLocked } from '@/services/storageService';
import AppBar, { PageHeader } from './AppBar';
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
    <div className="min-h-screen bg-slate-50">
      {/* the shared top bar: sections, Create Study and Logout (components/AppBar.tsx) */}
      <AppBar />
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-6">
        <PageHeader
          title="My Studies"
          subtitle={`${studies.length} research ${studies.length === 1 ? 'study' : 'studies'} configured`}
          actions={
            hasDemoData ? (
              <button
                onClick={handleClearDemo}
                disabled={loadingDemo}
                className="px-3.5 py-2 text-sm rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2 disabled:opacity-50 font-medium"
              >
                {loadingDemo ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                Clear Demo
              </button>
            ) : (
              <button
                onClick={handleLoadDemo}
                disabled={loadingDemo || !!kvWarning}
                className="px-3.5 py-2 text-sm rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2 disabled:opacity-50 font-medium"
              >
                {loadingDemo ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Load Demo
              </button>
            )
          }
        />

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
          // one calm list instead of a grid of boxes: a row per study
          <div className="oi-rise overflow-hidden rounded-2xl bg-white shadow-card">
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_110px_120px_44px] gap-4 px-5 py-3 text-xs font-medium text-slate-500 border-b border-slate-200/70">
              <span>Study</span>
              <span>Interviews</span>
              <span>Status</span>
              <span>Created</span>
              <span />
            </div>
            {studies.map((study) => (
              <div
                key={study.id}
                onClick={() => router.push(`/studies/${study.id}`)}
                className="group relative grid cursor-pointer grid-cols-[minmax(0,1fr)_44px] items-center gap-4 border-b border-slate-200/70 px-5 py-4 transition-colors last:border-b-0 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_110px_110px_120px_44px]"
              >
                {/* Menu button; its clicks stay in the menu instead of opening the study */}
                <div className="relative z-10 order-last justify-self-end" onClick={(e) => e.stopPropagation()}>
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

                {/* the study: its name opens it from the keyboard too */}
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => router.push(`/studies/${study.id}`)}
                    className="block max-w-full text-left text-[15px] font-semibold text-slate-900 break-words transition-colors group-hover:text-blue-700"
                  >
                    {study.config.name}
                  </button>
                  {study.config.description && (
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{study.config.description}</p>
                  )}
                  {/* phones: the details sit under the name */}
                  <p className="mt-1 text-xs text-slate-500 sm:hidden">
                    {study.interviewCount} {study.interviewCount === 1 ? 'interview' : 'interviews'}, {study.isLocked ? 'locked' : 'editable'}
                  </p>
                </div>
                <span className="hidden text-sm tabular-nums text-slate-700 sm:block">{study.interviewCount}</span>
                <span className="hidden items-center gap-2 text-sm text-slate-700 sm:flex">
                  <span className={`h-2 w-2 rounded-full ${study.isLocked ? 'bg-slate-400' : 'bg-emerald-500'}`} aria-hidden="true" />
                  {study.isLocked ? 'Locked' : 'Editable'}
                </span>
                <span className="hidden text-sm text-slate-500 sm:block">{formatDate(study.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudyList;

