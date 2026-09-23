import React from "react";
import {
  Code2, Bot, Sparkles, Receipt, FileSpreadsheet,
  FolderKanban, KanbanSquare, ShieldCheck, Wallet,
  MessagesSquare, MessageSquareText,
  AppWindow, Command, Download, ExternalLink, Loader2
} from "lucide-react";
import { Btn, Eyebrow, IconBadge, cardShell } from "../ui/ButtonPrimitive";

export default function IntegratedToolsSection({
  openCoder,
  downloadBharatTechApp,
  openLibreChat,
  isLaunchingLibreChat,
  openChatwoot,
  isLaunchingChatwoot,
  openPlane,
  isLaunchingPlane,
  openSecuro,
  isLaunchingSecuro,
  openInvoiceBuilder,
  canAccessInvoice,
}) {
  const openDirect = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <>
      {/* CODER CARD */}
      <div className={cardShell}>
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
        <div className="flex h-full flex-col p-5">
          <IconBadge icon={Code2} className="mb-4 bg-blue-50 text-blue-600" />
          <Eyebrow className="text-blue-500">Tool</Eyebrow>
          <h3 className="mb-1.5 text-[17px] font-bold tracking-tight text-slate-900">Coder</h3>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">Open the BharatTech Coding Workspace</p>

          <div className="mt-auto flex flex-col gap-2.5">
            <Btn variant="primary" onClick={openCoder} className="w-full">Open</Btn>
            <p className="py-3.5 text-center text-xs font-medium text-slate-500">Don't have an app yet?</p>
            <Btn variant="outline" onClick={downloadBharatTechApp} className="w-full">
              <Download className="h-3.5 w-3.5" /> Install / Update app
            </Btn>
            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><AppWindow className="h-3.5 w-3.5" /> Windows</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1"><Command className="h-3.5 w-3.5" /> macOS</span>
            </div>
          </div>
        </div>
      </div>

      {/* LIBRECHAT AI CARD */}
      <div className={cardShell}>
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
        <div className="flex h-full flex-col p-5">
          <IconBadge icon={Bot} className="mb-4 bg-blue-50 text-blue-600" />
          <Eyebrow className="text-blue-500">AI Assistant</Eyebrow>
          <h3 className="mb-1.5 text-[17px] font-bold tracking-tight text-slate-900">LibreChat</h3>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">Open BharatTech AI Assistant with Keycloak SSO</p>

          <div className="mt-auto flex flex-col gap-2.5">
            <Btn variant="primary" onClick={openLibreChat} disabled={isLaunchingLibreChat} className="w-full">
              {isLaunchingLibreChat ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Connecting SSO...</span></>
              ) : (
                <><ExternalLink className="h-3.5 w-3.5" /><span>Open</span></>
              )}
            </Btn>
            <p className="py-3.5 text-center text-xs font-medium text-slate-500">Enterprise AI & Code Assistant</p>
            <Btn variant="outline" onClick={openLibreChat} className="w-full">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Direct Web Access
            </Btn>
            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> GPT & Claude</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1"><span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> SSO Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHATWOOT SUPPORT & LIVE CHAT CARD */}
      <div className={cardShell}>
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
        <div className="flex h-full flex-col p-5">
          <IconBadge icon={MessagesSquare} className="mb-4 bg-blue-50 text-blue-600" />
          <Eyebrow className="text-blue-500">Support & Engagement</Eyebrow>
          <h3 className="mb-1.5 text-[17px] font-bold tracking-tight text-slate-900">Chatwoot</h3>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">Self-hosted customer engagement suite with omnichannel live chat, inboxes & Keycloak SSO</p>

          <div className="mt-auto flex flex-col gap-2.5">
            <Btn variant="primary" onClick={openChatwoot} disabled={isLaunchingChatwoot} className="w-full">
              {isLaunchingChatwoot ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Connecting SSO...</span></>
              ) : (
                <><ExternalLink className="h-3.5 w-3.5" /><span>Open Platform</span></>
              )}
            </Btn>
            <p className="py-3.5 text-center text-xs font-medium text-slate-500">Omnichannel Customer Support</p>
            <Btn variant="outline" onClick={() => openDirect(import.meta.env.VITE_CHATWOOT_URL || "http://localhost:3000")} className="w-full">
              <MessageSquareText className="h-3.5 w-3.5 text-blue-600" /> Direct Web Access
            </Btn>
            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" /> Live Chat</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1"><span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> SSO Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* INVOICE BUILDER (ADMIN ONLY) */}
      {canAccessInvoice && (
        <div className={cardShell}>
          <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
          <div className="flex h-full flex-col p-5">
            <IconBadge icon={Receipt} className="mb-4 bg-blue-50 text-blue-600" />
            <Eyebrow className="text-blue-500">Finance & Invoicing</Eyebrow>
            <h3 className="mb-1.5 text-[17px] font-bold tracking-tight text-slate-900">Invoice Builder</h3>
            <p className="mb-5 text-sm leading-relaxed text-slate-500">Self-hosted offline-first invoicing and quotation platform with PDF export</p>

            <div className="mt-auto flex flex-col gap-2.5">
              <Btn variant="primary" onClick={openInvoiceBuilder} className="w-full">
                <ExternalLink className="h-3.5 w-3.5" /><span>Open Platform</span>
              </Btn>
              <p className="py-3.5 text-center text-xs font-medium text-slate-500">Self-Hosted Finance Suite</p>
              <Btn variant="outline" onClick={openInvoiceBuilder} className="w-full">
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" /> Invoices & Quotes
              </Btn>
              <div className="flex items-center justify-center gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> PDF Export</span>
                <span className="h-3 w-px bg-slate-200" />
                <span>Electron-based app</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLANE PROJECT MANAGEMENT */}
      <div className={cardShell}>
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
        <div className="flex h-full flex-col p-5">
          <IconBadge icon={FolderKanban} className="mb-4 bg-blue-50 text-blue-600" />
          <Eyebrow className="text-blue-500">Project Management</Eyebrow>
          <h3 className="mb-1.5 text-[17px] font-bold tracking-tight text-slate-900">Plane</h3>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">Self-hosted agile project management platform with issues, cycles, modules & Keycloak SSO</p>

          <div className="mt-auto flex flex-col gap-2.5">
            <Btn variant="primary" onClick={openPlane} disabled={isLaunchingPlane} className="w-full">
              {isLaunchingPlane ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Connecting SSO...</span></>
              ) : (
                <><ExternalLink className="h-3.5 w-3.5" /><span>Open Platform</span></>
              )}
            </Btn>
            <p className="py-3.5 text-center text-xs font-medium text-slate-500">Self-Hosted Workspace Suite</p>
            <Btn variant="outline" onClick={() => openDirect(import.meta.env.VITE_PLANE_URL || "http://localhost:8090")} className="w-full">
              <FolderKanban className="h-3.5 w-3.5 text-blue-600" /> Direct Web Access
            </Btn>
            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><KanbanSquare className="h-3.5 w-3.5" /> Kanban & Cycles</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1"><span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> SSO Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECURO PERSONAL FINANCE */}
      <div className={cardShell}>
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
        <div className="flex h-full flex-col p-5">
          <IconBadge icon={ShieldCheck} className="mb-4 bg-blue-50 text-blue-600" />
          <Eyebrow className="text-blue-500">Personal Finance & Privacy</Eyebrow>
          <h3 className="mb-1.5 text-[17px] font-bold tracking-tight text-slate-900">Securo</h3>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">Self-hosted personal finance manager for tracking accounts, spending, budgets & transactions with Keycloak SSO</p>

          <div className="mt-auto flex flex-col gap-2.5">
            <Btn variant="primary" onClick={openSecuro} disabled={isLaunchingSecuro} className="w-full">
              {isLaunchingSecuro ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Connecting SSO...</span></>
              ) : (
                <><ExternalLink className="h-3.5 w-3.5" /><span>Open Platform</span></>
              )}
            </Btn>
            <p className="py-3.5 text-center text-xs font-medium text-slate-500">Self-Hosted Finance Suite</p>
            <Btn variant="outline" onClick={() => openDirect(import.meta.env.VITE_SECURO_URL || "http://localhost:3002")} className="w-full">
              <Wallet className="h-3.5 w-3.5 text-blue-600" /> Direct Web Access
            </Btn>
            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Accounts & Budgets</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1"><span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> SSO Ready</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
