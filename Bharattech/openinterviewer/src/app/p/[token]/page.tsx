'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { ParticipantToken } from '@/types';
import Consent from '@/components/Consent';
import InterviewChat from '@/components/InterviewChat';
import Synthesis from '@/components/Synthesis';
import Export from '@/components/Export';
import { Loader2 } from 'lucide-react';
import keycloak from '@/keycloak';

export default function ParticipantPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const {
    currentStep,
    setStep,
    setStudyConfig,
    setViewMode,
    setParticipantToken,
    studyConfig
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);

  // Verify token and load study config on mount
  useEffect(() => {
    const loadStudyFromToken = async () => {
      if (!token) {
        setError('No token provided');
        setLoading(false);
        return;
      }

      try {
        // Check OpenInterviewer's own researcher session (same-origin cookie,
        // so it's sent reliably — unlike the cross-origin Keycloak iframe
        // check below, which silently fails when third-party cookies are
        // blocked, letting the creator slip through unblocked).
        try {
          const ownSessionRes = await fetch('/api/auth');
          const ownSession = await ownSessionRes.json();
          if (ownSession?.authenticated) {
            setError('Admin and Super-admin accounts are not permitted to participate in the interview test.');
            setLoading(false);
            return;
          }
        } catch (ownSessionError) {
          console.warn('Failed to check researcher session:', ownSessionError);
        }

        // Check Keycloak SSO session to block Admins and Super-admins from taking the test
        try {
          let authenticated = false;
          if (!keycloak.didInitialize) {
            authenticated = await keycloak.init({
              onLoad: 'check-sso',
              silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
              silentCheckSsoFallback: false,
              checkLoginIframe: false,
              pkceMethod: 'S256'
            });
          } else {
            authenticated = Boolean(keycloak.authenticated);
          }

          if (authenticated) {
            const roles = (keycloak.tokenParsed?.realm_access?.roles || []).map((r: string) =>
              r.toLowerCase()
            );
            const isAdminOrSuperAdmin = roles.includes('admin') || roles.includes('super-admin');

            if (isAdminOrSuperAdmin) {
              setError('Admin and Super-admin accounts are not permitted to participate in the interview test.');
              setLoading(false);
              return;
            }
          }
        } catch (keycloakError) {
          console.warn('Failed to check Keycloak session:', keycloakError);
        }

        // Verify and decode the token
        const response = await fetch(`/api/participant-token?token=${encodeURIComponent(token)}`);
        const result = await response.json();

        if (!result.valid || !result.studyConfig) {
          setError('Invalid or expired link');
          setLoading(false);
          return;
        }

        if (result.terminated) {
          setStudyConfig(result.studyConfig);
          setParticipantToken(token);
          setViewMode('participant');
          setTerminationReason(
            result.terminationReason || 'The interview was terminated because a restricted action was detected.'
          );
          setLoading(false);
          return;
        }

        // Directly use studyConfig from response
        setStudyConfig(result.studyConfig);
        setParticipantToken(token);
        setViewMode('participant');
        setStep('consent');
        setLoading(false);
      } catch (err) {
        console.error('Error loading study from token:', err);
        setError('Failed to load study configuration');
        setLoading(false);
      }
    };

    loadStudyFromToken();
  }, [token]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 text-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading interview...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-5 sm:p-8">
        <div className="max-w-md w-full text-center p-6 bg-white border border-slate-200 shadow-md rounded-xl">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Interview</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <p className="text-slate-500 text-sm">
            Please check that you have the correct link or contact the researcher.
          </p>
        </div>
      </div>
    );
  }

  if (terminationReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
          <h1 className="text-xl font-semibold text-slate-900">Interview Terminated</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {terminationReason}
          </p>
          <p className="mt-3 text-xs text-slate-500 font-medium">
            Please contact the research team if you need a new participant link.
          </p>
        </div>
      </div>
    );
  }

  // No study config loaded
  if (!studyConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 text-center">
        <p className="text-slate-500 font-medium">Study configuration not found.</p>
      </div>
    );
  }

  // Render the appropriate step
  switch (currentStep) {
    case 'consent':
      return <Consent />;
    case 'interview':
      return <InterviewChat />;
    case 'synthesis':
      return <Synthesis />;
    case 'export':
      return <Export />;
    default:
      return <Consent />;
  }
}
