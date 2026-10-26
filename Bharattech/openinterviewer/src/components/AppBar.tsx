'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Plus } from 'lucide-react';
import { useStore } from '@/store';
import { NAV_LINKS, activeSection } from '@/lib/nav';
import logo from '../../assets/BHARATTECH ORIGIN Logo-01.png';

/**
 * The researcher screens' slim top bar, in the BharatTech portal's style: logo, the two sections as pills, the one
 * main action, and sign out. Each screen keeps its own title below it (PageHeader).
 */
export default function AppBar() {
  const router = useRouter();
  const pathname = usePathname();
  const reset = useStore((state) => state.reset);
  const current = activeSection(pathname || '');

  // a new study starts from an empty form, not the last one edited (as StudyList's Create Study did)
  const createStudy = () => {
    reset();
    router.push('/setup');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-8">
        <Link href="/studies" className="flex-shrink-0" aria-label="Studies">
          <Image src={logo} alt="BharatTech" className="h-7 w-auto" priority />
        </Link>

        <nav className="ml-2 flex items-center gap-1 rounded-full bg-slate-100 p-1" aria-label="Sections">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current === link.label ? 'page' : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                current === link.label
                  ? 'bg-white text-slate-900 shadow-subtle'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={createStudy}
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create Study</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/** A screen's title, free on the page (no box around it), with its own actions on the right. */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { label: string; onClick: () => void };
  actions?: React.ReactNode;
}) {
  return (
    <div className="oi-rise flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <button
            onClick={back.onClick}
            className="mb-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← {back.label}
          </button>
        )}
        <h1 className="break-words font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.5rem] sm:leading-[1.1]">
          {title}
        </h1>
        {subtitle && <div className="mt-2 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
