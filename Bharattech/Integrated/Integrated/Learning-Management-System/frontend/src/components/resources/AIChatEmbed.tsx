import { useEffect, useState, useCallback } from "react";
import { Loader2, Bot, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

interface AIChatEmbedProps {
  className?: string;
  minHeight?: string | number;
}

export const AIChatEmbed: React.FC<AIChatEmbedProps> = ({
  className = "",
  minHeight = "650px",
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmbedToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIframeLoaded(false);

    try {
      const response = await api.get("/ai-assistant/token");
      const data = response.data;

      if (data?.status === "success" && data?.token) {
        setToken(data.token);
        const resolvedUrl =
          data.librechatUrl ||
          import.meta.env.VITE_LIBRECHAT_URL ||
          "";
        setTargetUrl(resolvedUrl.replace(/\/+$/, ""));
      } else {
        throw new Error(data?.message || "Failed to acquire AI session token");
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "AI Assistant unavailable";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmbedToken();
  }, [fetchEmbedToken]);

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm ${className}`}
        style={{ minHeight }}
      >
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full bg-orange-100 animate-ping opacity-30" />
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#ff5a00] to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        </div>
        <h4 className="text-base font-bold text-slate-800">
          Connecting to BharatTech AI...
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Securing session with Keycloak SSO
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center ${className}`}
        style={{ minHeight }}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-sm">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-red-900">
          AI Assistant Unavailable
        </h3>
        <p className="mt-1 max-w-md text-xs text-red-700 leading-relaxed">
          {error === "AI not configured"
            ? "The AI assistant service has not been configured yet. Please ensure LibreChat environment variables and keys are configured."
            : error}
        </p>
        <button
          onClick={fetchEmbedToken}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  const resolvedTarget = targetUrl || import.meta.env.VITE_LIBRECHAT_URL || "";

  if (!resolvedTarget) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center ${className}`}
        style={{ minHeight }}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-amber-900">
          LibreChat URL Not Configured
        </h3>
        <p className="mt-1 max-w-md text-xs text-amber-700 leading-relaxed">
          Please set VITE_LIBRECHAT_URL in your frontend .env or LIBRECHAT_URL in your backend environment.
        </p>
        <button
          onClick={fetchEmbedToken}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-amber-600/20 transition hover:bg-amber-700 hover:shadow-lg"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const iframeSrc = `${resolvedTarget.replace(/\/+$/, "")}/c/new?embed=true&token=${encodeURIComponent(token || "")}`;

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden transition-all duration-300 ${className}`}
      style={{ minHeight }}
    >
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff5a00] to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm tracking-tight">
                BharatTech AI Assistant
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" />
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Ask about courses, code, projects, or get instant assistance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-slate-300 hidden sm:inline">
            Connected
          </span>
        </div>
      </div>

      {/* Embedded LibreChat Iframe Container */}
      <div className="relative flex-1 w-full bg-slate-900 min-h-[550px]">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff5a00] mb-2" />
            <p className="text-xs text-slate-400 font-medium">
              Initializing conversational interface...
            </p>
          </div>
        )}
        <iframe
          src={iframeSrc}
          onLoad={() => setIframeLoaded(true)}
          className="w-full h-full min-h-[550px] border-0 bg-transparent"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
          allow="clipboard-read; clipboard-write; microphone"
          title="BharatTech AI Assistant"
        />
      </div>
    </div>
  );
};

export default AIChatEmbed;