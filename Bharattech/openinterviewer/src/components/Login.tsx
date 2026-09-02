'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import keycloak from '@/keycloak';
import logo from '../../assets/BHARATTECH ORIGIN Logo-01.png';

let keycloakInitPromise: Promise<boolean> | null = null;

function getKeycloakSession() {
  if (keycloak.authenticated) {
    return Promise.resolve(true);
  }

  if (keycloak.didInitialize) {
    return Promise.resolve(Boolean(keycloak.authenticated));
  }

  if (!keycloakInitPromise) {
    keycloakInitPromise = keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      silentCheckSsoFallback: false,
      checkLoginIframe: false,
      pkceMethod: 'S256'
    }).catch(error => {
      keycloakInitPromise = null;
      throw error;
    });
  }

  return keycloakInitPromise;
}

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [checkingSso, setCheckingSso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const launchToken = searchParams.get('launchToken') || searchParams.get('bt_token');
    if (!launchToken) return;

    const authenticateLaunch = async () => {
      setLaunching(true);
      setError(null);

      try {
        const response = await fetch('/api/auth/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ launchToken })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(data.error || 'Could not authenticate BharatTech launch token.');
          return;
        }

        router.replace('/dashboard?mode=admin');
      } catch {
        setError('Could not authenticate BharatTech launch token.');
      } finally {
        setLaunching(false);
      }
    };

    authenticateLaunch();
  }, [router, searchParams]);

  useEffect(() => {
    const launchToken = searchParams.get('launchToken') || searchParams.get('bt_token');
    if (launchToken) return;

    let cancelled = false;

    const authenticateExistingBharatTechSession = async () => {
      setCheckingSso(true);

      try {
        const authenticated = await getKeycloakSession();
        if (cancelled || !authenticated || !keycloak.token) return;

        const response = await fetch('/api/auth/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ launchToken: keycloak.token })
        });

        if (cancelled || !response.ok) return;

        router.replace('/dashboard?mode=admin');
      } catch (error) {
        console.warn('BharatTech SSO check failed:', error);
      } finally {
        if (!cancelled) {
          setCheckingSso(false);
        }
      }
    };

    authenticateExistingBharatTechSession();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      // Redirect to studies on success
      router.push('/studies');
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center px-4 py-8 sm:p-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card">
          <div className="text-center mb-6">
            <div className="w-44 mx-auto mb-4">
              <Image src={logo} alt="BharatTech Origin" className="w-full h-auto" priority />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Researcher Portal</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
              {launching
                ? 'Authenticating BharatTech session...'
                : checkingSso
                  ? 'Verifying active single sign-on...'
                : 'Enter your researcher credentials to access studies and analytics'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold shadow-xs transition-all"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!password.trim() || loading || launching || checkingSso}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-subtle active:scale-[0.98]"
            >
              {loading || launching || checkingSso ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{launching || checkingSso ? 'Authenticating...' : 'Signing in...'}</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              onClick={() => router.push('/setup')}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold uppercase tracking-wider"
            >
              ← Back to Study Setup
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

