'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import {
  Download,
  FileJson,
  FileText,
  RotateCcw,
  CheckCircle,
  Copy,
  User,
  Check
} from 'lucide-react';

const Export: React.FC = () => {
  const {
    studyConfig,
    participantProfile,
    interviewHistory,
    questionProgress,
    behaviorData,
    synthesis,
    resetParticipant,
    reset
  } = useStore();

  const generateJSON = () => {
    // Build profile fields with labels
    const profileFields = participantProfile?.fields.map(f => {
      const schema = studyConfig?.profileSchema.find(s => s.id === f.fieldId);
      return {
        fieldId: f.fieldId,
        label: schema?.label || f.fieldId,
        value: f.value,
        status: f.status,
        extractedAt: f.extractedAt ? new Date(f.extractedAt).toISOString() : null
      };
    }) || [];

    const data = {
      study: {
        id: studyConfig?.id,
        name: studyConfig?.name,
        researchQuestion: studyConfig?.researchQuestion,
        aiBehavior: studyConfig?.aiBehavior,
        coreQuestions: studyConfig?.coreQuestions,
        topicAreas: studyConfig?.topicAreas
      },
      participant: {
        id: participantProfile?.id,
        profile: {
          fields: profileFields,
          rawContext: participantProfile?.rawContext
        }
      },
      interview: {
        messageCount: interviewHistory.length,
        questionsAsked: questionProgress.questionsAsked,
        totalQuestions: studyConfig?.coreQuestions.length || 0,
        duration: interviewHistory.length > 1
          ? (interviewHistory[interviewHistory.length - 1].timestamp - interviewHistory[0].timestamp) / 1000
          : 0,
        transcript: interviewHistory.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp).toISOString()
        }))
      },
      behavior: behaviorData,
      synthesis: synthesis,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  };

  const generateTranscript = () => {
    const lines = [
      `# Interview Transcript`,
      `Study: ${studyConfig?.name}`,
      `Research Question: ${studyConfig?.researchQuestion}`,
      `Date: ${new Date().toLocaleDateString()}`,
      ``
    ];

    // Add participant profile summary
    if (participantProfile && participantProfile.fields.length > 0) {
      lines.push(`## Participant Profile`);
      participantProfile.fields.forEach(f => {
        const schema = studyConfig?.profileSchema.find(s => s.id === f.fieldId);
        const label = schema?.label || f.fieldId;
        const value = f.status === 'extracted' ? f.value : `(${f.status})`;
        lines.push(`- **${label}**: ${value}`);
      });
      if (participantProfile.rawContext) {
        lines.push(``);
        lines.push(`**Context**: ${participantProfile.rawContext}`);
      }
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
    lines.push(`## Conversation`);
    lines.push(``);

    interviewHistory.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? 'PARTICIPANT' : 'INTERVIEWER';
      lines.push(`[${time}] ${role}:`);
      lines.push(msg.content);
      lines.push('');
    });

    if (synthesis) {
      lines.push('---');
      lines.push('');
      lines.push('## Analysis Summary');
      lines.push('');
      lines.push(`**Key Insight:** ${synthesis.bottomLine}`);
      lines.push('');
      if (synthesis.themes.length > 0) {
        lines.push('**Themes:**');
        synthesis.themes.forEach(t => {
          lines.push(`- ${t.theme}: ${t.evidence}`);
        });
        lines.push('');
      }
      if (synthesis.keyInsights.length > 0) {
        lines.push('**Key Insights:**');
        synthesis.keyInsights.forEach(insight => {
          lines.push(`- ${insight}`);
        });
      }
    }

    return lines.join('\n');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const content = generateJSON();
    const filename = `interview-${studyConfig?.id || 'export'}-${Date.now()}.json`;
    downloadFile(content, filename, 'application/json');
  };

  const handleDownloadTranscript = () => {
    const content = generateTranscript();
    const filename = `transcript-${studyConfig?.id || 'export'}-${Date.now()}.md`;
    downloadFile(content, filename, 'text/markdown');
  };

  const [jsonCopied, setJsonCopied] = useState(false);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(generateJSON());
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const handleNewParticipant = () => {
    resetParticipant();
  };

  const handleNewStudy = () => {
    reset();
  };

  // Calculate extracted profile fields
  const extractedFields = participantProfile?.fields.filter(f => f.status === 'extracted') || [];
  const totalFields = participantProfile?.fields.length || 0;

  return (
    <div className="min-h-screen bg-white px-4 py-5 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
            <CheckCircle className="text-slate-600" size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Interview Complete
          </h1>
          <p className="text-slate-500 font-medium">
            Export your data and start a new session
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-6 shadow-sm"
        >
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs">
              <div className="text-2xl font-bold text-slate-900">
                {interviewHistory.length}
              </div>
              <div className="text-xs text-slate-450 font-bold uppercase">Messages</div>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs">
              <div className="text-2xl font-bold text-slate-900">
                {questionProgress.questionsAsked.length}/{studyConfig?.coreQuestions.length || 0}
              </div>
              <div className="text-xs text-slate-450 font-bold uppercase">Questions</div>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs">
              <div className="text-2xl font-bold text-slate-900">
                {extractedFields.length}/{totalFields}
              </div>
              <div className="text-xs text-slate-450 font-bold uppercase">Profile</div>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs">
              <div className="text-2xl font-bold text-slate-900">
                {synthesis?.themes.length || 0}
              </div>
              <div className="text-xs text-slate-450 font-bold uppercase">Themes</div>
            </div>
          </div>

          {/* Participant Profile Summary */}
          {participantProfile && extractedFields.length > 0 && (
            <div className="bg-white rounded-xl p-4 space-y-3 border border-slate-200 shadow-xs">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <User size={16} className="text-slate-500" />
                Participant Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {participantProfile.fields.map(f => {
                  const schema = studyConfig?.profileSchema.find(s => s.id === f.fieldId);
                  return (
                    <div key={f.fieldId} className="flex flex-wrap justify-between gap-2 items-center py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-500 font-semibold">{schema?.label || f.fieldId}</span>
                      <span className={`font-semibold ${
                        f.status === 'extracted' ? 'text-slate-800' :
                        f.status === 'refused' ? 'text-slate-400 italic font-medium' :
                        'text-slate-400 font-medium'
                      }`}>
                        {f.status === 'extracted' ? f.value :
                         f.status === 'refused' ? 'Declined' :
                         f.status === 'vague' ? 'Unclear' : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-3">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Export Data</h2>

            <button
              onClick={handleDownloadJSON}
              className="w-full flex items-center gap-3.5 p-4 bg-white border border-slate-200/90 rounded-2xl hover:border-slate-300 hover:shadow-card-hover transition-all text-left shadow-card group"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-105 transition-transform">
                <FileJson size={22} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm">Download JSON Dataset</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Complete structured export including profile fields, metrics, and timestamps
                </div>
              </div>
              <Download size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>

            <button
              onClick={handleDownloadTranscript}
              className="w-full flex items-center gap-3.5 p-4 bg-white border border-slate-200/90 rounded-2xl hover:border-slate-300 hover:shadow-card-hover transition-all text-left shadow-card group"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-105 transition-transform">
                <FileText size={22} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm">Download Markdown Transcript</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Clean readable markdown dialogue with candidate context summary
                </div>
              </div>
              <Download size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>

            <button
              onClick={handleCopyJSON}
              className={`w-full flex items-center gap-3.5 p-4 border rounded-2xl transition-all text-left shadow-card ${
                jsonCopied
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-card-hover'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
                jsonCopied ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {jsonCopied ? (
                  <Check size={20} className="text-emerald-600" />
                ) : (
                  <Copy size={20} />
                )}
              </div>
              <div className="flex-1">
                <div className={`font-bold text-sm ${jsonCopied ? 'text-emerald-800' : 'text-slate-900'}`}>
                  {jsonCopied ? 'JSON Copied to Clipboard!' : 'Copy Raw JSON'}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Directly copy JSON payload to clipboard for instant pasting
                </div>
              </div>
              {jsonCopied ? (
                <Check size={18} className="text-emerald-600" />
              ) : (
                <Copy size={18} className="text-slate-400" />
              )}
            </button>
          </div>

          {/* Next Actions */}
          <div className="pt-4 border-t border-slate-200/80 space-y-3">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Next Actions</h2>

            <button
              onClick={handleNewParticipant}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-subtle active:scale-[0.98]"
            >
              <RotateCcw size={16} />
              New Candidate Interview (Same Study)
            </button>

            <button
              onClick={handleNewStudy}
              className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 bg-white font-semibold text-sm transition-all shadow-xs active:scale-[0.98]"
            >
              Create New Research Study
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Export;
