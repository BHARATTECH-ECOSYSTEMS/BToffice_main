'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import {
  StudyConfig,
  ProfileField,
  AIBehavior,
  AIProviderType,
  LinkExpirationOption,
  GEMINI_MODELS,
  CLAUDE_MODELS,
  MISTRAL_MODELS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_MISTRAL_MODEL
} from '@/types';

import {
  FileText,
  Plus,
  X,
  ArrowLeft,
  Sparkles,
  Eye,
  Lightbulb,
  User,
  ToggleLeft,
  ToggleRight,
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  LogIn,
  Save,
  CheckCircle,
  GitBranch,
  Clock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

// Common profile field presets
const PROFILE_PRESETS: ProfileField[] = [
  {
    id: 'name',
    label: 'Name',
    extractionHint: 'The participant\'s name, as they introduce themselves',
    required: true
  },
  {
    id: 'role',
    label: 'Current Role',
    extractionHint: 'Their job title or position',
    required: true
  },
  {
    id: 'industry',
    label: 'Industry',
    extractionHint: 'The industry they work in',
    required: true
  },
  {
    id: 'years_experience',
    label: 'Years of Experience',
    extractionHint: 'How many years of professional experience they have',
    required: true
  },
  {
    id: 'ai_frequency',
    label: 'AI Usage Frequency',
    extractionHint: 'How often they use AI (daily, weekly, rarely, etc.)',
    required: false
  },
  {
    id: 'comfort_level',
    label: 'Comfort Level with AI',
    extractionHint: 'How comfortable they feel using AI (low, medium, high)',
    required: false
  }
];


const StudySetup: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setStudyConfig, setStep, studyConfig, loadExampleStudy, setViewMode } = useStore();

  // Follow-up study state
  const [parentStudyInfo, setParentStudyInfo] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState(studyConfig?.name || '');
  const [description, setDescription] = useState(studyConfig?.description || '');
  const [researchQuestion, setResearchQuestion] = useState(studyConfig?.researchQuestion || '');
  const [jobTitle, setJobTitle] = useState(studyConfig?.jobTitle || '');
  const [jobRequirements, setJobRequirements] = useState(studyConfig?.jobRequirements || '');
  const [coreQuestions, setCoreQuestions] = useState<string[]>(
    studyConfig?.coreQuestions || []
  );
  const [topicAreas, setTopicAreas] = useState<string[]>(
    studyConfig?.topicAreas || ['']
  );
  const [profileSchema, setProfileSchema] = useState<ProfileField[]>(
    studyConfig?.profileSchema || PROFILE_PRESETS
  );
  const [aiBehavior, setAiBehavior] = useState<AIBehavior>(
    studyConfig?.aiBehavior || 'standard'
  );
  const [aiProvider, setAiProvider] = useState<AIProviderType>(
    studyConfig?.aiProvider || 'gemini'
  );
  const [aiModel, setAiModel] = useState<string>(
    studyConfig?.aiModel ||
      (studyConfig?.aiProvider === 'claude'
        ? DEFAULT_CLAUDE_MODEL
        : studyConfig?.aiProvider === 'mistral'
        ? DEFAULT_MISTRAL_MODEL
        : DEFAULT_GEMINI_MODEL)
  );
  const [enableReasoning, setEnableReasoning] = useState<boolean | undefined>(
    studyConfig?.enableReasoning
  );
  const [linkExpiration, setLinkExpiration] = useState<LinkExpirationOption>(
    studyConfig?.linkExpiration || 'never'
  );
  const [consentText, setConsentText] = useState(
    studyConfig?.consentText ||
    'Thank you for participating in this research study. Your responses will be used to understand [research topic]. You may stop at any time. Do you consent to participate?'
  );

  // Participant link generation
  const [participantLink, setParticipantLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Preview state
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Study save state
  const [savedStudyId, setSavedStudyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Config status (API keys)
  const [configStatus, setConfigStatus] = useState<{
    hasAnthropicKey: boolean;
    hasGeminiKey: boolean;
    hasMistralKey: boolean;
  } | null>(null);


  // Sync savedStudyId with persisted config
  // Server-assigned IDs are UUIDs, client-side IDs start with "study-"
  useEffect(() => {
    if (studyConfig?.id && !studyConfig.id.startsWith('study-')) {
      // Server UUID - this is a saved study
      setSavedStudyId(studyConfig.id);
    } else {
      // No config or client-generated ID - clear to prevent overwriting other studies
      setSavedStudyId(null);
    }
  }, [studyConfig?.id]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth', { method: 'GET' });
        setIsAuthenticated(res.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch config status when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchConfigStatus = async () => {
        try {
          const res = await fetch('/api/config/status');
          if (res.ok) {
            const data = await res.json();
            setConfigStatus(data);
          }
        } catch {
          // Silently fail - warnings just won't show
        }
      };
      fetchConfigStatus();
    }
  }, [isAuthenticated]);

  // Check for follow-up or edit prefill on mount
  useEffect(() => {
    const prefillType = searchParams.get('prefill');
    if (prefillType === 'followup' || prefillType === 'edit') {
      const prefillData = sessionStorage.getItem('prefillStudyConfig');
      if (prefillData) {
        try {
          const config = JSON.parse(prefillData) as Partial<StudyConfig>;
          // Populate form fields
          if (config.name) setName(config.name);
          if (config.description) setDescription(config.description);
          if (config.researchQuestion) setResearchQuestion(config.researchQuestion);
          if (config.jobTitle) setJobTitle(config.jobTitle);
          if (config.jobRequirements) setJobRequirements(config.jobRequirements);
          if (config.coreQuestions?.length) setCoreQuestions(config.coreQuestions);
          if (config.topicAreas?.length) setTopicAreas(config.topicAreas);
          if (config.profileSchema?.length) setProfileSchema(config.profileSchema);
          if (config.aiBehavior) setAiBehavior(config.aiBehavior);
          if (config.aiProvider) setAiProvider(config.aiProvider);
          if (config.aiModel) setAiModel(config.aiModel);
          if (config.enableReasoning !== undefined) setEnableReasoning(config.enableReasoning);
          if (config.linkExpiration) setLinkExpiration(config.linkExpiration);
          if (config.consentText) setConsentText(config.consentText);

          // Store parent study info for display and saving (followup only)
          if (prefillType === 'followup' && config.parentStudyId && config.parentStudyName) {
            setParentStudyInfo({
              id: config.parentStudyId,
              name: config.parentStudyName
            });
          }

          // For edit mode, set the study ID so saves become updates
          if (prefillType === 'edit') {
            const studyId = searchParams.get('studyId');
            if (studyId) {
              setSavedStudyId(studyId);
              setIsDirty(false); // Not dirty initially - matches saved state
            }
          } else {
            // Mark as dirty since we loaded prefill data that needs saving
            setIsDirty(true);
          }

          // Clear sessionStorage after loading
          sessionStorage.removeItem('prefillStudyConfig');
        } catch (error) {
          console.error('Error parsing prefill config:', error);
        }
      }
    }
  }, [searchParams]);

  // Sync form with studyConfig when it changes (e.g., after loading example)
  useEffect(() => {
    if (studyConfig) {
      setName(studyConfig.name);
      setDescription(studyConfig.description);
      setResearchQuestion(studyConfig.researchQuestion);
      setJobTitle(studyConfig.jobTitle || '');
      setJobRequirements(studyConfig.jobRequirements || '');
      setCoreQuestions(studyConfig.coreQuestions || []);
      setTopicAreas(studyConfig.topicAreas.length > 0 ? studyConfig.topicAreas : ['']);
      setProfileSchema(studyConfig.profileSchema || []);
      setAiBehavior(studyConfig.aiBehavior);
      setAiProvider(studyConfig.aiProvider || 'gemini');
      setAiModel(
      studyConfig.aiModel ||
        (studyConfig.aiProvider === 'claude'
          ? DEFAULT_CLAUDE_MODEL
          : studyConfig.aiProvider === 'mistral'
          ? DEFAULT_MISTRAL_MODEL
          : DEFAULT_GEMINI_MODEL)
    );
      setEnableReasoning(studyConfig.enableReasoning);
      setLinkExpiration(studyConfig.linkExpiration || 'never');
      setConsentText(studyConfig.consentText);
    }
  }, [studyConfig]);

  // Question management
  const addQuestion = () => { setCoreQuestions([...coreQuestions, '']); setIsDirty(true); };
  const removeQuestion = (index: number) => {
    setCoreQuestions(coreQuestions.filter((_, i) => i !== index));
    setIsDirty(true);
  };
  const updateQuestion = (index: number, value: string) => {
    const updated = [...coreQuestions];
    updated[index] = value;
    setCoreQuestions(updated);
    setIsDirty(true);
  };

  // Topic management
  const addTopic = () => { setTopicAreas([...topicAreas, '']); setIsDirty(true); };
  const removeTopic = (index: number) => {
    if (topicAreas.length > 1) {
      setTopicAreas(topicAreas.filter((_, i) => i !== index));
      setIsDirty(true);
    }
  };
  const updateTopic = (index: number, value: string) => {
    const updated = [...topicAreas];
    updated[index] = value;
    setTopicAreas(updated);
    setIsDirty(true);
  };

  // Profile field management
  const addProfileField = (preset?: ProfileField) => {
    if (preset) {
      if (!profileSchema.some(f => f.id === preset.id)) {
        setProfileSchema([...profileSchema, preset]);
        setIsDirty(true);
      }
    } else {
      const newField: ProfileField = {
        id: `field-${Date.now()}`,
        label: '',
        extractionHint: '',
        required: false
      };
      setProfileSchema([...profileSchema, newField]);
      setIsDirty(true);
    }
  };

  const removeProfileField = (id: string) => {
    setProfileSchema(profileSchema.filter(f => f.id !== id));
    setIsDirty(true);
  };

  const updateProfileField = (id: string, updates: Partial<ProfileField>) => {
    setProfileSchema(profileSchema.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
    setIsDirty(true);
  };

  const toggleFieldRequired = (id: string) => {
    setProfileSchema(profileSchema.map(f =>
      f.id === id ? { ...f, required: !f.required } : f
    ));
    setIsDirty(true);
  };

  const buildConfig = (): StudyConfig => ({
    id: studyConfig?.id || `study-${Date.now()}`,
    name: name || 'Untitled Study',
    description,
    researchQuestion,
    jobTitle: jobTitle.trim() || undefined,
    jobRequirements: jobRequirements.trim() || undefined,
    coreQuestions: coreQuestions.filter(q => q.trim()),
    topicAreas: topicAreas.filter(t => t.trim()),
    profileSchema: profileSchema.filter(f => f.label.trim()),
    aiBehavior,
    aiProvider,
    aiModel,
    enableReasoning,
    linkExpiration,
    linksEnabled: true, // Always true when creating/editing (revocation is in StudyDetail)
    consentText,
    createdAt: studyConfig?.createdAt || Date.now(),
    // Include parent study info if this is a follow-up
    ...(parentStudyInfo && {
      parentStudyId: parentStudyInfo.id,
      parentStudyName: parentStudyInfo.name,
      generatedFrom: 'synthesis' as const
    }),
    _id: ''
  });

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    const config = buildConfig();
    setStudyConfig(config);

    // Generate a temporary preview token for API authentication

    setIsPreviewLoading(false);
    setViewMode('participant');
    setStep('consent');
    router.push('/consent');
  };

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    setLinkError(null);
    try {
      const config = buildConfig();
      setStudyConfig(config);

      const response = await fetch('/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyConfig: config })
      });

      if (!response.ok) {
        if (response.status === 401) {
          setLinkError('auth');
          setIsAuthenticated(false);
        } else {
          const data = await response.json();
          setLinkError(data.error || 'Failed to generate link');
        }
        return;
      }

      const data = await response.json();
      setParticipantLink(data.url);
    } catch (error) {
      console.error('Error generating link:', error);
      setLinkError('Network error. Please try again.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (participantLink) {
      navigator.clipboard.writeText(participantLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleSaveStudy = async () => {
    // Fix auth race condition: check for explicit false, not falsy
    if (isAuthenticated === false) {
      router.push('/login');
      return;
    }
    if (isAuthenticated === null) {
      return; // Auth check in progress - button should be disabled anyway
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const config = buildConfig();
      const isUpdate = !!savedStudyId;

      // For updates, the API may return 409 if study has interviews
      const response = await fetch(
        isUpdate ? `/api/studies/${savedStudyId}` : '/api/studies',
        {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          router.push('/login');
          return;
        }

        // Handle storage not configured (503)
        if (response.status === 503) {
          setSaveError('Storage not configured. Please set MONGODB_URI in your environment.');
          return;
        }

        // Handle confirmation required (409) - study has interviews
        if (response.status === 409) {
          const data = await response.json();
          if (data.requiresConfirmation) {
            const confirmed = window.confirm(
              `${data.warning}\n\nDo you want to continue?`
            );
            if (confirmed) {
              // Retry with confirmed: true
              const retryResponse = await fetch(`/api/studies/${savedStudyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, confirmed: true })
              });
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                setSavedStudyId(retryData.study.id);
                setStudyConfig(retryData.study.config);
                setSaveSuccess(true);
                setIsDirty(false);
                // Navigate to study detail page after confirmed save
                router.push(`/studies/${retryData.study.id}`);
              }
            }
            return;
          }
        }

        // Generic error
        const data = await response.json().catch(() => ({}));
        setSaveError(data.error || 'Failed to save study. Please try again.');
        return;
      }

      const data = await response.json();
      setSavedStudyId(data.study.id);
      setSaveSuccess(true);
      setStudyConfig(data.study.config);
      setIsDirty(false);

      // Navigate to study detail page after successful save
      router.push(`/studies/${data.study.id}`);
    } catch (error) {
      console.error('Error saving study:', error);
      setSaveError('Network error. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = name.trim() && researchQuestion.trim();

  const behaviorOptions: { id: AIBehavior; label: string; desc: string }[] = [
    {
      id: 'structured',
      label: 'Focus on covering all questions (Structured)',
      desc: 'Prioritize completion. Minimal follow-ups, redirect tangents.'
    },
    {
      id: 'standard',
      label: 'Balance coverage and depth (Standard)',
      desc: 'Default mode. Follow up on key insights, then move on.'
    },
    {
      id: 'exploratory',
      label: 'Focus on uncovering new insights (Exploratory)',
      desc: 'Prioritize depth. Chase interesting threads, probe emotions.'
    }
  ];

   const providerOptions: { id: AIProviderType; label: string; desc: string }[] = [
    {
      id: 'gemini',
      label: 'Google Gemini',
      desc: 'Fast, cost-effective. Best for high-volume studies.'
    },
    {
      id: 'claude',
      label: 'Anthropic Claude',
      desc: 'Nuanced reasoning. Best for complex, exploratory interviews.'
    },
    {
      id: 'mistral',
      label: 'Mistral AI',
      desc: 'Open-weight models. Balanced performance and cost.'
    }
  ];


  const availablePresets = PROFILE_PRESETS.filter(
    preset => !profileSchema.some(f => f.id === preset.id)
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 sm:p-8 lg:p-10">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                onClick={() => router.push('/studies')}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
                title="Back to All Studies"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-xs">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
                  Study Setup
                </h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">
                  Configure research objectives, candidate profile fields, and interview parameters
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={loadExampleStudy}
                className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-xs hover:border-slate-300 active:scale-[0.98]"
              >
                <Lightbulb size={16} className="text-slate-500" />
                Load Example
              </button>
              {isValid && (
                <>
                  <button
                    onClick={handleSaveStudy}
                    disabled={!isAuthenticated || isSaving || (!!savedStudyId && !isDirty)}
                    className={`px-4 py-2 text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed font-semibold shadow-xs active:scale-[0.98] ${
                      savedStudyId && !isDirty
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : saveSuccess
                        ? 'bg-emerald-600 text-white shadow-subtle'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-subtle'
                    } ${isSaving || isAuthenticated === null ? 'opacity-50' : ''}`}
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : savedStudyId && !isDirty ? (
                      <CheckCircle size={16} />
                    ) : saveSuccess ? (
                      <Check size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    {isSaving ? 'Saving...' : savedStudyId && isDirty ? 'Update Study' : savedStudyId ? 'Saved' : saveSuccess ? 'Saved!' : 'Save Study'}
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                    className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-xs hover:border-slate-300 active:scale-[0.98]"
                  >
                    {isPreviewLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Eye size={16} className="text-slate-500" />
                    )}
                    {isPreviewLoading ? 'Loading...' : 'Preview'}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Save Error Banner */}
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs"
          >
            <div className="text-red-600 flex-shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 text-sm">Save Failed</h4>
              <p className="text-xs text-red-800 font-medium mt-0.5">{saveError}</p>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              ×
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-8 space-y-8 shadow-card"
        >
          {/* Follow-up Study Banner */}
          {parentStudyInfo && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <GitBranch size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">Follow-up Study</h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Derived from synthesis insights from{' '}
                  <button
                    onClick={() => router.push(`/studies/${parentStudyInfo.id}`)}
                    className="text-blue-600 hover:text-blue-700 underline font-semibold"
                  >
                    {parentStudyInfo.name}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Sparkles size={18} className="text-blue-600" />
              Study Details
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Study / Post Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                placeholder="e.g., AI Adoption in Healthcare"
                className="w-full px-4 py-3 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium shadow-xs transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Research Objective / Topic *
              </label>
              <textarea
                value={researchQuestion}
                onChange={(e) => { setResearchQuestion(e.target.value); setIsDirty(true); }}
                placeholder="What core insights or answers are you seeking to discover?"
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-sm font-medium shadow-xs transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                placeholder="Brief internal context about the research cohort or criteria..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-sm font-medium shadow-xs transition-all"
              />
            </div>
          </div>

          {/* Profile Fields */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <User size={18} className="text-blue-600" />
                  Candidate Profile Fields
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Information the AI should naturally extract and structure from candidate responses
                </p>
              </div>
              <button
                onClick={() => addProfileField()}
                className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors"
              >
                <Plus size={15} /> Add Custom Field
              </button>
            </div>

            {availablePresets.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-bold">Quick add preset:</span>
                {availablePresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => addProfileField(preset)}
                    className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold rounded-lg transition-all border border-slate-200 shadow-xs"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {profileSchema.map((field) => (
                <div
                  key={field.id}
                  className="bg-slate-50/70 rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateProfileField(field.id, { label: e.target.value })}
                        placeholder="Field Label (e.g., Current Role)"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                      <input
                        type="text"
                        value={field.extractionHint}
                        onChange={(e) => updateProfileField(field.id, { extractionHint: e.target.value })}
                        placeholder="Extraction hint for AI (e.g., Job title or position)"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      <button
                        onClick={() => toggleFieldRequired(field.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 font-semibold transition-all ${
                          field.required
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                        title={field.required ? 'Required field' : 'Optional field'}
                      >
                        {field.required ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        {field.required ? 'Required' : 'Optional'}
                      </button>
                      <button
                        onClick={() => removeProfileField(field.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove field"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {profileSchema.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-xs font-medium">
                  No profile fields defined yet. Add some above to structure candidate metadata.
                </div>
              )}
            </div>
          </div>

          {/* Role Details */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                Target Role Details (AI Adaptive Questioning)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Fill these in to allow the AI to adaptively synthesize technical interview questions matching the candidate's exact tools and background.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => { setJobTitle(e.target.value); setIsDirty(true); }}
                placeholder="e.g. Senior Frontend Engineer (React / TypeScript)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs font-medium text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Job Description / Technical Requirements
              </label>
              <textarea
                value={jobRequirements}
                onChange={(e) => { setJobRequirements(e.target.value); setIsDirty(true); }}
                placeholder="Paste the job description, required skill sets, and interview rubric..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none shadow-xs font-medium text-sm"
              />
            </div>
          </div>

          {/* Core Questions */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="font-bold text-base sm:text-lg text-slate-900">
                  Fixed Core Questions
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Optional — only if you require specific verbatim questions to be asked in order.
                </p>
              </div>
              <button
                onClick={addQuestion}
                className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors"
              >
                <Plus size={15} /> Add Question
              </button>
            </div>
            <div className="space-y-2.5">
              {coreQuestions.map((q, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="text-slate-400 text-xs pt-3 w-6 text-right flex-shrink-0 font-bold">{i + 1}.</span>
                  <textarea
                    value={q}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    placeholder={`Specific question ${i + 1}...`}
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none shadow-xs font-medium text-sm"
                  />
                  {coreQuestions.length > 0 && (
                    <button
                      onClick={() => removeQuestion(i)}
                      className="p-2.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 mt-1 transition-colors"
                      title="Remove question"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Topic Areas */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="font-bold text-base sm:text-lg text-slate-900">
                  Probe Topic Areas
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Focus themes the AI should dig deep into during dialogue
                </p>
              </div>
              <button
                onClick={addTopic}
                className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors"
              >
                <Plus size={15} /> Add Topic
              </button>
            </div>
            <div className="space-y-2.5">
              {topicAreas.map((t, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="text-slate-400 text-xs pt-3 w-6 text-right flex-shrink-0 font-bold">{i + 1}.</span>
                  <textarea
                    value={t}
                    onChange={(e) => updateTopic(i, e.target.value)}
                    placeholder={`Theme / topic area ${i + 1}...`}
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none shadow-xs font-medium text-sm"
                  />
                  {topicAreas.length > 1 && (
                    <button
                      onClick={() => removeTopic(i)}
                      className="p-2.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 mt-1 transition-colors"
                      title="Remove topic"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Provider & Models */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="font-bold text-base sm:text-lg text-slate-900">AI Intelligence Provider</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Select LLM engine powering interview interactions and synthesis
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {providerOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    aiProvider === option.id
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">{option.label}</span>
                    <input
                      type="radio"
                      name="aiProvider"
                      checked={aiProvider === option.id}
                      onChange={() => {
                        setAiProvider(option.id);
                        setAiModel(
                          option.id === 'claude'
                            ? DEFAULT_CLAUDE_MODEL
                            : option.id === 'mistral'
                            ? DEFAULT_MISTRAL_MODEL
                            : DEFAULT_GEMINI_MODEL
                        );
                        setIsDirty(true);
                      }}
                      className="accent-blue-600"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium leading-relaxed">{option.desc}</span>
                </label>
              ))}
            </div>

            {/* Model Selection */}
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Specific Model Version
              </label>
              <select
                value={aiModel}
                onChange={(e) => { setAiModel(e.target.value); setIsDirty(true); }}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs text-sm font-semibold"
              >
                {(
                  aiProvider === 'gemini'
                    ? GEMINI_MODELS
                    : aiProvider === 'claude'
                    ? CLAUDE_MODELS
                    : MISTRAL_MODELS
                ).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Style */}
          <div className="space-y-4">
            <h2 className="font-bold text-base sm:text-lg text-slate-900 border-b border-slate-100 pb-2.5">
              AI Interview Style
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {behaviorOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    aiBehavior === option.id
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">{option.label}</span>
                    <input
                      type="radio"
                      name="aiBehavior"
                      checked={aiBehavior === option.id}
                      onChange={() => { setAiBehavior(option.id); setIsDirty(true); }}
                      className="accent-blue-600"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium leading-relaxed">{option.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Link Expiration & Consent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Link Expiration
              </label>
              <select
                value={linkExpiration}
                onChange={(e) => { setLinkExpiration(e.target.value as LinkExpirationOption); setIsDirty(true); }}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs text-sm font-semibold"
              >
                <option value="never">Never expire</option>
                <option value="7days">Expire after 7 days</option>
                <option value="30days">Expire after 30 days</option>
                <option value="90days">Expire after 90 days</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Participant Consent Text
              </label>
              <textarea
                value={consentText}
                onChange={(e) => { setConsentText(e.target.value); setIsDirty(true); }}
                rows={3}
                className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-xs font-medium shadow-xs"
              />
            </div>
          </div>

          {/* Generate Participant Link */}
          {isValid && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <LinkIcon size={16} className="text-blue-600" />
                    Participant Link Dispatch
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Generate link directly with this configuration
                  </p>
                </div>
              </div>

              {participantLink ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <input
                    type="text"
                    value={participantLink}
                    readOnly
                    className="w-full min-w-0 sm:flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {linkCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={isGeneratingLink}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  <LinkIcon size={16} />
                  {isGeneratingLink ? 'Generating Link...' : 'Generate Participant Link'}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StudySetup;

