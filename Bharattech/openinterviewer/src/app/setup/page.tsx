import { Suspense } from 'react';
import StudySetup from '@/components/StudySetup';
import { Loader2 } from 'lucide-react';

function SetupLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={48} className="animate-spin text-blue-600" />
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<SetupLoading />}>
      <StudySetup />
    </Suspense>
  );
}
