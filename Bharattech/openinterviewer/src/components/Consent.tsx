'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { Shield, ArrowRight, ArrowLeft, MessageSquare, Clock, HelpCircle } from 'lucide-react';

const Consent: React.FC = () => {
  const router = useRouter();
  const { studyConfig, giveConsent, setStep, viewMode, initializeProfile } = useStore();

  const handleConsent = () => {
    giveConsent();
    // Initialize profile structure from study schema
    if (studyConfig?.profileSchema) {
      initializeProfile(studyConfig.profileSchema);
    }
    // Skip directly to interview (merged intake/profile into conversation)
    setStep('interview');
    router.push('/interview');
  };

  const handleBack = () => {
    setStep('setup');
    router.push('/setup');
  };

  if (!studyConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 text-center">
        <p className="text-slate-500 font-medium">No study configured. Please set up a study first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-5 sm:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield size={28} className="text-blue-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Research Consent</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">
              {studyConfig.name}
            </p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            <div className="prose prose-sm max-w-none text-slate-700">
              <p className="whitespace-pre-wrap leading-relaxed">{studyConfig.consentText}</p>
            </div>

            {/* Interview Structure Foreshadowing */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-slate-500" />
                Interview Structure
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-700 flex-shrink-0 mt-0.5 font-semibold">1</div>
                  <div>
                    <div className="text-slate-700 font-medium">Brief background questions</div>
                    <div className="text-slate-500 text-xs">Help us understand your context</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-700 flex-shrink-0 mt-0.5 font-semibold">2</div>
                  <div>
                    <div className="text-slate-700 font-medium">{studyConfig?.coreQuestions?.length ?? 0} core questions about your experiences</div>
                    <div className="text-slate-500 text-xs">The heart of the interview</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-700 flex-shrink-0 mt-0.5 font-semibold">
                    <HelpCircle size={12} />
                  </div>
                  <div>
                    <div className="text-slate-700 font-medium">The AI may ask follow-up questions</div>
                    <div className="text-slate-500 text-xs">To better understand your perspective</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-700 flex-shrink-0 mt-0.5 font-semibold">3</div>
                  <div>
                    <div className="text-slate-700 font-medium">A final question for your feedback</div>
                    <div className="text-slate-500 text-xs">Your thoughts on the interview itself</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-slate-500 text-sm font-medium">
                <Clock size={14} />
                <span>Estimated time: 10-15 minutes</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Privacy:</strong> Your responses will be used for research purposes only.
              No personally identifying information will be shared without your consent.
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row gap-3">
            {viewMode !== 'participant' && (
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <ArrowLeft size={18} /> Back
              </button>
            )}
            <button
              onClick={handleConsent}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              I Consent - Begin Interview <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Consent;
