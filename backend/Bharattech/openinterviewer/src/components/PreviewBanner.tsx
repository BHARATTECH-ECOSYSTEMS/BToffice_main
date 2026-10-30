'use client';

import { useStore } from '@/store';
import { showsPreviewBanner } from '@/lib/previewBanner';
import { useRouter, usePathname } from 'next/navigation';
import { Eye, ArrowLeft } from 'lucide-react';

export default function PreviewBanner() {
  const { viewMode, participantToken, setViewMode, setStep, resetParticipant } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  // the researcher's own Preview only, never a candidate who came in through their link
  if (!showsPreviewBanner({ viewMode, participantToken, pathname })) {
    return null;
  }

  const handleExit = () => {
    setViewMode('researcher');
    setStep('setup');
    resetParticipant(); // Clear participant data but keep study config
    router.push('/setup');
  };

  return (
    <div className="preview-banner sticky top-0 z-50 px-3 sm:px-4 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-blue-100">
        <Eye size={16} className="preview-banner-pulse" />
        <span className="text-sm font-medium">Preview Mode - Participant View</span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-white hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all shadow-sm"
      >
        <ArrowLeft size={14} />
        Exit Preview
      </button>
    </div>
  );
}
