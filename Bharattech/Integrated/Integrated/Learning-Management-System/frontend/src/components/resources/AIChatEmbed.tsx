// import { useEffect, useState } from "react";
// import { Loader2, Bot, AlertCircle } from "lucide-react";
// import { toast } from "sonner";
// export const AIChatEmbed = () => {
//     const [token, setToken] = useState<string | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     useEffect(() => {
//         fetch("/api/ai-assistant/token", { credentials: "include" })
//         .then(r => r.json())
//         .then(data => {
//             if (data.status === "success") setToken(data.token);
//             else throw new Error(data.message);
//         })
//         .catch(err => {
//             setError(err.message);
//             toast.error("AI Assistant unavailable");
//         })
//         .finally(() => setLoading(false));
//     }, []);
//     if (loading) return (
//         <div className="flex items-center justify-center min-h-[600px]">
//             <Loader2 className="w-10 h-10 animate-spin text-[#ff5a00]" />
//         </div>
//     );
//     if (error) return (
//         <div className="flex items-center justify-center min-h-[600px] bg-red-50 rounded-2xl">
//             <div className="text-center">
//                 <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
//                 <h3 className="font-semibold text-red-900">AI Assistant Unavailable</h3>
//                 <button onClick={() => window.location.reload()}
//                     className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
//             </div>
//         </div>
//     );
//     return (
//         <div className="flex flex-col h-full rounded-2xl overflow-hidden border shadow-xl bg-white">
//         <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white px-5 py-4 flex items-center gap-3">
//             <div className="w-8 h-8 rounded-lg bg-[#ff5a00] flex items-center justify-center">
//                 <Bot className="w-5 h-5" />
//             </div>
//             <div>
//                 <h3 className="font-semibold text-sm">BharatTech AI Assistant</h3>
//                 <p className="text-xs text-gray-300">Ask about courses, code, or get help</p>
//             </div>
//             <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
//         </div>
//         <iframe
//             src={`${import.meta.env.VITE_LIBRECHAT_URL}/chat?embed=true&token=${token}`}
//             className="flex-1 w-full min-h-[600px] border-0"
//             sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
//             title="BharatTech AI"
//         />
//     </div>
//     );
// };