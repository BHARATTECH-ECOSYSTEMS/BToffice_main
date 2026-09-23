import React from "react";
import { CheckCircle, Copy, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export default function UserResetLinkView({
  generatedResetLink,
  handleCopyLink,
  copiedLink,
  user,
  formData,
  handleSendToDashboard,
  linkSentToDashboard,
  onClose,
}) {
  const linkText = generatedResetLink.link || generatedResetLink;
  const roleName = user?.role || formData.role || "User";
  const emailName = user?.email || formData.email || "N/A";
  const expiryDate = new Date(
    generatedResetLink.expiresAt || Date.now() + 24 * 3600 * 1000
  ).toLocaleString();

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-green-700 dark:text-green-400 text-sm">
              Password Reset Link Generated
            </h4>
          </div>

          <Button
            type="button"
            onClick={() => handleCopyLink(linkText)}
            className="bg-background border border-green-500/30 text-green-600 dark:text-green-400 px-3 py-2"
          >
            {copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="mb-3">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Reset Link for {roleName} ({emailName})
          </Label>
          <Input
            value={linkText}
            readOnly
            className="flex-1 text-xs bg-background border-green-500/30 text-foreground"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Expires: {expiryDate}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSendToDashboard}
              className={`px-4 py-2 rounded-md ${linkSentToDashboard ? "bg-green-600" : "bg-blue-500"} text-white`}
              disabled={linkSentToDashboard}
            >
              {linkSentToDashboard ? "✓ Sent to Email" : "Send to Email"}
            </Button>

            <Button type="button" onClick={onClose} className="px-6 py-2 rounded-md bg-blue-600 text-white">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
