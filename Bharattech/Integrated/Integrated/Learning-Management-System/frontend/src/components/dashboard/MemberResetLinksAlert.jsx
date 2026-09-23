import React from "react";
import { Link as LinkIcon, Clock } from "lucide-react";

export default function MemberResetLinksAlert({ resetLinks }) {
  return (
    <div className="mt-4 sm:mt-6 md:mt-10 bg-white shadow rounded-lg p-3 sm:p-4 md:p-6">
      <h2 className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
        <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
        <span>Your Password Reset Links</span>
      </h2>

      {resetLinks.length === 0 ? (
        <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3">No reset links found.</p>
      ) : (
        <div className="mt-3 sm:mt-4 md:mt-5 space-y-2 sm:space-y-3 md:space-y-4">
          {resetLinks.map((link) => (
            <div key={link.id} className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-gray-50">
              <p className="font-medium text-xs sm:text-sm md:text-base text-gray-900 break-words">
                {link.userEmail}
              </p>
              <a
                href={link.link}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline break-all text-[10px] sm:text-xs md:text-sm block mt-1.5 sm:mt-2"
              >
                {link.link}
              </a>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex gap-1.5 sm:gap-2 items-center mt-1.5 sm:mt-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="break-words">
                  Expires: {new Date(link.expiresAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
