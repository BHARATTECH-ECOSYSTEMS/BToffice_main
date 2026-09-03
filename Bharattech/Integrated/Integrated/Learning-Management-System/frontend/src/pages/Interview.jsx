import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { buildFallbackLaunchUrl } from "../utils/openInterviewer";
import { useAuth } from "../LMS/context/AuthContext";

export default function Interview() {
  const { hasRole, loading } = useAuth();
  const [interviewUrl, setInterviewUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;

    const launchInterview = async () => {
      if (!hasRole?.("Admin")) {
        setError("Admin or Superadmin access is required.");
        return;
      }

      try {
        const { data } = await api.post("/openinterviewer/launch-token");
        const launchUrl =
          data?.launchUrl ||
          (data?.token ? buildFallbackLaunchUrl(data.token) : null);

        if (!launchUrl) {
          throw new Error("Interview launch URL was not returned");
        }

        setInterviewUrl(launchUrl);
      } catch (err) {
        console.error("Interview launch failed", err);
        setError(
          err?.response?.data?.message ||
            "Could not open the interview tool. Please try again."
        );
      }
    };

    launchInterview();
  }, [hasRole, loading]);

  if (loading || (!interviewUrl && !error)) {
    return (
      <div className="flex h-[calc(100vh-72px)] items-center justify-center text-gray-600">
        Opening interview tool...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-72px)] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-72px)]">
      <iframe
        src={interviewUrl}
        className="h-full w-full border-0"
        title="OpenInterviewer"
      />
    </div>
  );
}
