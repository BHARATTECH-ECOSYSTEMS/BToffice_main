import React, { useState } from "react";
import {
  Share2,
  ExternalLink,
  ShieldCheck,
  Zap,
  HardDrive,
  QrCode,
  Lock,
  ArrowUpRight,
} from "lucide-react";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const FILESYNC_PLATFORM_URL = "https://bharattech-filesync.onrender.com";

const isLocalUrl = (url = "") => /localhost|127\.0\.0\.1/i.test(url);

const getExternalUrl = (configuredUrl, localUrl, deployedUrl = "") => {
  const isLocalHost = LOCAL_HOSTS.includes(window.location.hostname);
  if (configuredUrl && (isLocalHost || !isLocalUrl(configuredUrl))) {
    return configuredUrl;
  }
  return isLocalHost ? localUrl : deployedUrl;
};

export default function FileTransfer() {
  const fileSyncUrl = getExternalUrl(
    import.meta.env.VITE_FILESYNC_URL,
    "http://localhost:8080",
    FILESYNC_PLATFORM_URL,
  );

  const [hasOpened, setHasOpened] = useState(false);

  const handleLaunch = () => {
    setHasOpened(true);
    window.open(fileSyncUrl, "_blank", "noopener,noreferrer");
  };

  const features = [
    {
      icon: ShieldCheck,
      title: "End-to-End Encrypted",
      desc: "Files transfer peer-to-peer over encrypted WebRTC data channels. No intermediary server inspects file contents.",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      icon: HardDrive,
      title: "No File Size Limit",
      desc: "Streams directly from browser to recipient disk with minimal RAM overhead, supporting multi-gigabyte transfers.",
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: Zap,
      title: "Real-Time One-to-Many",
      desc: "Drop files into a room and transmit simultaneously to multiple colleagues or student devices on the network.",
      color: "text-amber-600 bg-amber-50",
    },
    {
      icon: QrCode,
      title: "Instant Room & QR Sharing",
      desc: "No recipient registration or install needed. Share a private room link or QR code with optional password protection.",
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      {/* HERO BANNER */}
      <header className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 p-6 sm:p-10 shadow-lg text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm text-blue-200 mb-3">
              <Lock className="h-3.5 w-3.5 text-emerald-300" />
              <span>Self-Hosted &bull; FileSync Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Private P2P File Transfer
            </h1>
            <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
              Send files of any size directly between devices in real time with end-to-end
              WebRTC encryption. Powered by BharatTech self-hosted FileSync.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={handleLaunch}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-blue-700 shadow-md transition-all duration-200 hover:bg-blue-50 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Share2 className="h-4 w-4 text-blue-600" />
              <span>Launch FileSync</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <a
              href={fileSyncUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-xs text-blue-200 hover:text-white transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in new tab directly</span>
            </a>
          </div>
        </div>
      </header>

      {/* QUICK STATUS CARD */}
      <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Connected Service: FileSync
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-md">
                {fileSyncUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">
              Self-Hosted & Private
            </span>
          </div>
        </div>
      </div>

      {/* FEATURES GRID */}
      <h2 className="text-base font-bold text-slate-900 mb-4">
        Platform Highlights
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="flex gap-4 p-5 rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feat.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* HOW IT WORKS */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          How to Transfer Files
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              1
            </span>
            <div>
              <strong className="block text-slate-900">Create or Join Room</strong>
              Click Launch FileSync to get an instant encrypted room link or QR code.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              2
            </span>
            <div>
              <strong className="block text-slate-900">Share with Peers</strong>
              Send the room link or display the QR code to recipients (optional password protection).
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              3
            </span>
            <div>
              <strong className="block text-slate-900">Direct Drag & Drop</strong>
              Drop any files into the room; recipients stream and download the content in real time.
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
