'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useStore } from '@/store';
import { InterviewMessage, InterviewPhase } from '@/types';
import ReactMarkdown from 'react-markdown';
import { markdownComponents } from './markdownCodeBlock';
import { formatMessageForMarkdown } from '@/lib/formatChatMarkdown';
import {
  Send,
  Loader2,
  Bot,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  User
} from 'lucide-react';
import { data } from 'framer-motion/m';

// Phase display labels
const phaseLabels: Record<InterviewPhase, string> = {
  introduction: 'Introduction',
  education: 'Education & Skills',
  project: 'Project Deep-Dive',
  functionality: 'Technical Questions',
  ending: 'Wrapping up'
};

const TERMINATION_STORAGE_PREFIX = 'openinterviewer:terminated:';

function getTerminationStorageKey(token: string | null | undefined) {
  return token ? `${TERMINATION_STORAGE_PREFIX}${token}` : null;
}

function readStoredTermination(token: string | null | undefined) {
  if (typeof window === 'undefined') return null;

  const key = getTerminationStorageKey(token);
  try {
    return key ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function storeTermination(token: string | null | undefined, reason: string) {
  if (typeof window === 'undefined') return;

  const key = getTerminationStorageKey(token);
  try {
    if (key) {
      window.localStorage.setItem(key, reason);
    }
  } catch {
    // If localStorage is unavailable, the in-memory termination screen still applies.
  }
}

function persistTerminationToServer(token: string | null | undefined, reason: string) {
  if (!token || typeof window === 'undefined') return;

  const state = useStore.getState();
  const body = JSON.stringify({
    token,
    reason,
    history: state.interviewHistory,
    participantProfile: state.participantProfile,
    behaviorData: state.behaviorData
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/participant-token/terminate', blob);
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  fetch('/api/participant-token/terminate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
  }).catch((error) => {
    console.error('Failed to persist participant termination:', error);
  });
}

const InterviewChat: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const tokenFromUrl = params.token as string;
  const [warnings, setWarnings] = useState(0);

  const triggerWarning = useCallback(() => {
    setWarnings((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (warnings >= 3) {
      terminateInterview('The interview was terminated because restricted keyboard actions (Ctrl C / Ctrl V) were detected 3 times.');
    }
  }, [warnings]);

  const {
    studyConfig,
    participantProfile,
    questionProgress,
    interviewHistory,
    addMessage,
    setStep,
    isAiThinking,
    setAiThinking,
    contextEntries,
    appendContext,
    setInterviewPhase,
    markQuestionAsked,
    completeInterview,
    updateProfileField,
    setProfileRawContext,
    participantToken,
    setParticipantToken,
    viewMode
  } = useStore();

  useEffect(() => {
    console.log("Current participantToken:", participantToken);
  }, [participantToken]);

  useEffect(() => {
  if (tokenFromUrl && participantToken !== tokenFromUrl) {
    setParticipantToken(tokenFromUrl);
  }
}, [participantToken, tokenFromUrl, setParticipantToken]);

  useEffect(() => {
    const token = tokenFromUrl || participantToken;
    const storedTermination = readStoredTermination(token);

    if (!storedTermination) return;

    terminatedRef.current = true;
    interviewActiveRef.current = false;
    setTerminationReason(storedTermination);
    setAiThinking(false);
    completeInterview();
  }, [participantToken, tokenFromUrl, setAiThinking, completeInterview]);


  const [input, setInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showFinishOption, setShowFinishOption] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const greetingSent = useRef(false);
  const interviewActiveRef = useRef(false);
  const terminatedRef = useRef(false);

  const [onboardingStep, setOnboardingStep] = useState<
    "start" | "done"
  >("start");

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewHistory, isAiThinking]);

  // Show finish option
  useEffect(() => {
    if (questionProgress.currentPhase !== 'introduction') {
      setShowFinishOption(true);
    }
  }, [questionProgress.currentPhase]);

  useEffect(() => {
    interviewActiveRef.current =
      viewMode === 'participant' &&
      onboardingStep !== 'start' &&
      !isFinishing &&
      !terminationReason;
  }, [viewMode, onboardingStep, isFinishing, terminationReason]);

  const terminateInterview = (reason: string) => {
    if (terminatedRef.current) return;

    terminatedRef.current = true;
    interviewActiveRef.current = false;
    storeTermination(tokenFromUrl || participantToken, reason);
    persistTerminationToServer(tokenFromUrl || participantToken, reason);
    setTerminationReason(reason);
    setAiThinking(false);
    completeInterview();
  };

  const requestInterviewFullscreen = async () => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) return;

    try {
      await document.documentElement.requestFullscreen?.();
    } catch (error) {
      console.warn('Fullscreen request was blocked by the browser:', error);
    }
  };

  useEffect(() => {
    if (viewMode !== 'participant') return;

    const terminateIfActive = (reason: string) => {
      if (interviewActiveRef.current) {
        terminateInterview(reason);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        terminateIfActive('The interview was terminated because the tab was switched or minimized.');
      }
    };

    const handleBlur = () => {
      window.setTimeout(() => {
        if (!document.hasFocus()) {
          terminateIfActive('The interview was terminated because the browser window lost focus.');
        }
      }, 200);
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        terminateIfActive('The interview was terminated because fullscreen mode was exited.');
      }
    };

    const handleBlockedClipboardAction = (event: Event) => {
      event.preventDefault();
      if (interviewActiveRef.current) {
        triggerWarning();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedShortcut = (event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(key);

      if (blockedShortcut && interviewActiveRef.current) {
        event.preventDefault();
        triggerWarning();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleBlockedClipboardAction);
    document.addEventListener('cut', handleBlockedClipboardAction);
    document.addEventListener('paste', handleBlockedClipboardAction);
    document.addEventListener('drop', handleBlockedClipboardAction);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleBlockedClipboardAction);
      document.removeEventListener('cut', handleBlockedClipboardAction);
      document.removeEventListener('paste', handleBlockedClipboardAction);
      document.removeEventListener('drop', handleBlockedClipboardAction);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [viewMode, onboardingStep, isFinishing, terminationReason, participantToken, tokenFromUrl, triggerWarning]);

  // useEffect(() => {

  //     if (viewMode !== "participant") return;
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (
  //       e.ctrlKey &&
  //       ["c", "v", "x", "a"].includes(e.key.toLowerCase())
  //     ) {
  //       e.preventDefault();
  //       triggerWarning();
  //     }
  //   };

  //   const handlePaste = (e: ClipboardEvent) => {
  //     e.preventDefault();
  //     triggerWarning();
  //   };

  //   const handleCopy = (e: ClipboardEvent) => {
  //     e.preventDefault();
  //     triggerWarning();
  //   };

  //   const handleDrop = (e: DragEvent) => {
  //     e.preventDefault();
  //     triggerWarning();
  //   };

  //   const disableRightClick = (e: MouseEvent) => {
  //     e.preventDefault();
  //     triggerWarning();
  //   };

  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       setWarnings((prev) => {
  //         const newWarnings = prev + 1;

  //         if (newWarnings === 1) {
  //           alert("Warning: Switching tabs is not allowed during the interview.");
  //         }

  //         if (newWarnings >= 2) {
  //           alert("You switched tabs again. The interview will now be submitted.");
  //           router.push("/synthesis");
  //         }

  //         return newWarnings;
  //       });
  //     }
  //   };

  //   document.addEventListener("visibilitychange", handleVisibilityChange);

  //   document.addEventListener("keydown", handleKeyDown);
  //   document.addEventListener("paste", handlePaste);
  //   document.addEventListener("copy", handleCopy);
  //   document.addEventListener("drop", handleDrop);
  //   document.addEventListener("contextmenu", disableRightClick);

  //   return () => {
  //     document.removeEventListener("keydown", handleKeyDown);
  //     document.removeEventListener("paste", handlePaste);
  //     document.removeEventListener("copy", handleCopy);
  //     document.removeEventListener("drop", handleDrop);
  //     document.removeEventListener("contextmenu", disableRightClick);
  //     document.removeEventListener("visibilitychange", handleVisibilityChange);
  //   };

  // }, []);

  // 🔥 ADD THIS EFFECT RIGHT HERE
  useEffect(() => {
    if (viewMode !== 'participant') {
      setAiThinking(false);
    }
  }, [viewMode]);

  // Greeting initialization (AI starts the interview)
  useEffect(() => {
    const startInterview = async () => {

      if (greetingSent.current) return;   // ✅ stop second call
      greetingSent.current = true;

      if (!studyConfig) return;
      if (!participantToken) return;
      if (readStoredTermination(tokenFromUrl || participantToken)) return;
      if (viewMode !== "participant") return;
      if (interviewHistory.length > 0) return; // ✅ prevents duplicate greeting

      try {
        setAiThinking(true);

        // Greeting is AI-generated (via /api/greeting -> lib/prompts/greeting.ts),
        // not a fixed sentence. Falls back to a plain readiness question only
        // if that call fails for some reason.
        let greetingMessage = "Should we begin the interview?";

        try {
          const response = await fetch('/api/greeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studyConfig })
          });
          const data = await response.json();
          if (data?.message) {
            greetingMessage = data.message;
          }
        } catch (greetingFetchError) {
          console.error("Failed to fetch AI greeting, using fallback:", greetingFetchError);
        }

        addMessage({
          id: `msg-${Date.now()}`,
          role: "ai",
          content: greetingMessage,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error("Greeting error:", error);
      } finally {
        setAiThinking(false);
      }
    };

    startInterview();
  }, [studyConfig, participantToken, tokenFromUrl, viewMode]);

  const handleSend = async (textOverride?: string) => {

    const text = textOverride || input;
    if (!text.trim()) return;
    if (terminationReason) return;

    // ✅ ADD USER MESSAGE FIRST (IMPORTANT)
    const userMsg: InterviewMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now()
    };

    addMessage(userMsg);
    setInput("");

    // STEP 0: Start confirmation. On a positive reply, this message becomes
    // the trigger for the real AI-driven Introduction phase question (see
    // lib/prompts/interview.ts) via the normal /api/interview call below -
    // it does NOT ask a hardcoded "What is your name?" question anymore.
    // (Previously this hardcoded "What is your name?" then "Can you tell me
    // about your skillset?", completely bypassing the prompt/phase system -
    // that's why the flow looked scrambled. Removed.)
    if (onboardingStep === "start") {
      const positive = ["yes", "y", "ok", "sure", "start"];

      if (!positive.some(p => text.toLowerCase().includes(p))) {
        addMessage({
          id: `msg-${Date.now()}`,
          role: "ai",
          content: "No problem. Let me know when you're ready.",
          timestamp: Date.now()
        });
        return;
      }

      await requestInterviewFullscreen();
      setOnboardingStep("done");
      // Falls through intentionally - no return here, so this same message
      // continues on to the /api/interview call below.
    }

    console.log("participantToken at send:", participantToken);

    if (isFinishing) return;
    if (!studyConfig) return;

    appendContext(text, 'text');
    setAiThinking(true);

    try {
      const currentContext =
        Array.isArray(contextEntries)
          ? contextEntries.map((e: any) => e.text).join('\n')
          : '';

      const latestHistory = useStore.getState().interviewHistory;
      const updatedHistory = latestHistory;

      const latestProfile = useStore.getState().participantProfile;

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${participantToken}`
        },
        body: JSON.stringify({
          history: updatedHistory,
          studyConfig,
          participantProfile: latestProfile, 
          questionProgress,
          currentContext
        })
      });

      const response = await res.json();
      response.shouldConclude = response.shouldConclude === true || response.shouldConclude === "true";

      console.log("FULL FRONTEND RESPONSE:", response);
      
        addMessage({
          id: `msg-${Date.now()}`,
          role: "ai",
          content: response.message,
          timestamp: Date.now()
        });

      console.log("TYPE OF shouldConclude:", typeof response.shouldConclude);
      console.log("VALUE:", response.shouldConclude);

      if (response.profileUpdates?.length) {
  response.profileUpdates.forEach((update: any) => {
    updateProfileField(update.fieldId, update.value, update.status);
  });
}

      if (response.participantProfile) {
        useStore.setState({
          participantProfile: response.participantProfile
        });
      }

      if (response.phaseTransition) {
        setInterviewPhase(response.phaseTransition);
      }

      if (response.questionAddressed !== null && response.questionAddressed !== undefined) {
        markQuestionAsked(response.questionAddressed);
      }

      const msg = response.message?.toLowerCase() || "";

      const isClosingMessage =
        msg.includes("conclude") ||
        msg.includes("concludes") ||
        msg.includes("thank you for your time") ||
        msg.includes("that concludes our interview") ||
        msg.includes("interview is complete");

      console.log("CHECK TRIGGER:", {
        shouldConclude: response.shouldConclude,
        isClosingMessage
      });

      console.log("🚨 FINAL CHECK:", {
        shouldConclude: response.shouldConclude,
        isClosingMessage,
        message: response.message
      });

      if (response.shouldConclude || isClosingMessage) {
        console.log("🔥 ENTERED COMPLETE BLOCK");

        setIsFinishing(true);     // 🔥 show loader immediately
        completeInterview();      // lock input

        const finalHistory = useStore.getState().interviewHistory;

        const currentProfile = useStore.getState().participantProfile;

        console.log("🔥 CALLING /complete API");

        const completeResponse = await fetch('/api/interview/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${participantToken}`
          },
          body: JSON.stringify({
            history: finalHistory,
            studyConfig,
            participantProfile: currentProfile,
            studyId: studyConfig.id
          })
        });

        console.log("COMPLETE RES STATUS:", completeResponse.status);

        if (!completeResponse.ok) {
          const error = await completeResponse.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to save completed interview');
        }

        const { interviewId } = await completeResponse.json();
        const redirectUrl = `/p/${participantToken}/complete${interviewId ? `?interviewId=${interviewId}` : ''}`;
        router.replace(redirectUrl);
      }

    } catch (error) {
      console.error('Interview error:', error);
      setIsFinishing(false);

      addMessage({
        id: `msg-${Date.now()}`,
        role: 'ai',
        content: "Something went wrong. Let's continue.",
        timestamp: Date.now()
      });
    } finally {
      setAiThinking(false);
    }
  };


  if (!studyConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">No study configured.</p>
      </div>
    );
  }

const totalQuestions = studyConfig?.coreQuestions?.length ?? 0;
  const questionsCompleted = questionProgress.questionsAsked.length;
  const isComplete = isFinishing || Boolean(terminationReason);

  const getProgressDisplay = () => {
    if (questionProgress.currentPhase === 'introduction') {
      return phaseLabels.introduction;
    }
    if (totalQuestions > 0 && questionProgress.currentPhase === 'functionality') {
      // Legacy hand-typed core questions are ground through during the
      // functionality phase - show a numeric counter for that case.
      return `Question ${Math.min(questionsCompleted + 1, totalQuestions)} of ${totalQuestions}`;
    }
    return phaseLabels[questionProgress.currentPhase];
  };

  if (isFinishing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="animate-spin text-blue-600" />
          <p className="text-sm text-slate-600 font-medium">
            Generating your interview analysis...
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

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col bg-slate-50/40">
      {/* Header */}
      <div className="min-h-16 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Logo */}
          <div className="relative h-10 w-28 sm:w-32 flex-shrink-0 flex items-center">
            <Image
              src="/bharattech-logo.png"
              alt="BharatTech"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>
          <div className="min-w-0 border-l border-slate-200 pl-3">
            <h1 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
              {studyConfig.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {getProgressDisplay()}
              </p>
            </div>
          </div>
        </div>

        {warnings > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-pulse shadow-xs flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Copy/Paste restriction: {3 - warnings} left</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5 bg-transparent max-w-4xl w-full mx-auto">
        {interviewHistory.map(msg => (
          msg.role === 'system' ? (
            <div key={msg.id} className="flex justify-center py-1">
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-100/80 border border-slate-200 rounded-full px-3.5 py-1 shadow-xs">
                {msg.content}
              </div>
            </div>
          ) : (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5 shadow-xs">
                <Bot size={16} />
              </div>
            )}

            <div
              className={`min-w-0 max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 sm:p-4.5 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-xs shadow-card'
                  : 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-xs shadow-card'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">
                {msg.role === 'user' ? 'You' : 'AI Interviewer'}
              </div>
              <ReactMarkdown
                className={`text-sm sm:text-[15px] leading-relaxed font-medium break-words ${
                  msg.role === 'user'
                    ? 'text-white [&_*]:text-white [&_strong]:text-white [&_code]:bg-blue-700/60 [&_code]:border-blue-500 [&_code]:text-white'
                    : 'text-slate-900 [&_*]:text-slate-900'
                }`}
                components={markdownComponents}
              >
                {formatMessageForMarkdown(msg.content)}
              </ReactMarkdown>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                <User size={15} />
              </div>
            )}
          </div>
          )
        ))}

        {isAiThinking && (
          <div className="flex items-start gap-2.5 sm:gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5 shadow-xs">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-200/90 shadow-card rounded-2xl rounded-tl-xs px-4 py-3.5 text-slate-600 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 typing-dot-1" />
                <span className="w-2 h-2 rounded-full bg-blue-600 typing-dot-2" />
                <span className="w-2 h-2 rounded-full bg-blue-600 typing-dot-3" />
              </div>
              <span className="text-xs font-semibold text-slate-500 ml-1">AI Interviewer is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isComplete && !isFinishing && (
        <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white/95 backdrop-blur-md sticky bottom-0 z-20">
          <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAiThinking && handleSend()}
              placeholder="Type your response here..."
              disabled={isAiThinking}
              className="min-w-0 flex-1 px-4 py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium shadow-xs transition-all disabled:opacity-60"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isAiThinking}
              className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-subtle transition-all active:scale-[0.96]"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewChat;

