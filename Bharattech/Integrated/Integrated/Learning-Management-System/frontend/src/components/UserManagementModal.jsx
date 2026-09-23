import React, { useState, useEffect } from "react";
import { X, Save, UserCheck, Key } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { markResetLinkAsSent } from "../services/passwordResetService";
import UserFormFields from "./user/UserFormFields";
import UserResetLinkView from "./user/UserResetLinkView";

export default function UserManagementModal({
  user,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onGenerateLink,
  currentUserRole,
}) {
  const normCurrentUserRole = String(currentUserRole || localStorage.getItem("role") || "")
    .trim()
    .toLowerCase()
    .replace(/[-_\s]/g, "");
  const isActorSuperAdmin = normCurrentUserRole === "superadmin";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
    status: "Active",
  });
  const [errors, setErrors] = useState({});
  const [generatedResetLink, setGeneratedResetLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [linkSentToDashboard, setLinkSentToDashboard] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "employee",
        status: user.status || "Active",
      });
    } else {
      setFormData({ name: "", email: "", role: "employee", status: "Active" });
    }
    setErrors({});
    setGeneratedResetLink(null);
    setCopiedLink(false);
    setLinkSentToDashboard(false);
  }, [user, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";

    const allowedRoles = isActorSuperAdmin
      ? ["employee", "intern", "subadmin", "admin", "superadmin"]
      : ["employee", "intern", "subadmin", "admin"];
    if (!formData.role || !allowedRoles.includes(formData.role.toLowerCase())) {
      newErrors.role = "Role is invalid or not allowed.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      if (onSave) {
        const result = await onSave(formData);
        if (result && typeof result === "object" && (result.link || result.id)) {
          setGeneratedResetLink(result);
        }
      }
    } catch (error) {
      alert(error.message || "Failed to save user. Please try again.");
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGenerateLink = async () => {
    const userEmail = user?.email || formData.email;
    const userRole = user?.role || formData.role;
    if (!userEmail || !userRole) return alert("User email and role are required.");
    if (!onGenerateLink) return alert("Reset link generation not available");

    try {
      const resetLink = await onGenerateLink(userEmail, userRole);
      let linkWithId = typeof resetLink === "string"
        ? { link: resetLink, expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }
        : { ...resetLink, id: resetLink.id || resetLink._id };
      setGeneratedResetLink(linkWithId);
      setLinkSentToDashboard(false);
      setTimeout(() => window.dispatchEvent(new CustomEvent("resetLinksUpdated")), 500);
    } catch (err) {
      alert(err.message || "Error generating reset link");
    }
  };

  const handleSendToDashboard = async () => {
    if (!generatedResetLink) return;
    const linkId = generatedResetLink.id || generatedResetLink._id;
    if (!linkId) return alert("Reset link ID not found.");
    try {
      await markResetLinkAsSent(linkId);
      setLinkSentToDashboard(true);
      alert(`Reset link sent successfully! It's now available in dashboard.`);
      window.dispatchEvent(new CustomEvent("resetLinksUpdated"));
    } catch (err) {
      alert(err.message || "Failed to send reset link.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative pb-3">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <UserCheck className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-center">
            <CardTitle className="text-lg font-semibold">
              {user ? "Generate Reset Link" : "Add New User"}
            </CardTitle>
          </div>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent>
          {user && !generatedResetLink && (
            <div className="space-y-4">
              <div className="bg-muted/50 border border-border/30 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                  <p className="text-sm font-medium text-foreground">{user.name || user.fullName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
                  <p className="text-sm font-medium text-foreground">{user.email || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                  <p className="text-sm font-medium text-foreground capitalize">{user.role || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                  <p className="text-sm font-medium text-foreground">{user.status || "Active"}</p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleGenerateLink}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 hover:from-blue-600 text-white flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" /> Generate Reset Link
                </Button>
              </div>
              <div className="pt-2">
                <Button type="button" onClick={onClose} className="w-full bg-gray-500 hover:bg-gray-600 text-white">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!user && !generatedResetLink && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <UserFormFields
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                isActorSuperAdmin={isActorSuperAdmin}
              />
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleGenerateLink}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 hover:from-blue-600 text-white flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" /> Generate Reset Link
                </Button>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                  <Save className="w-4 h-4 mr-2" /> Create User
                </Button>
                <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white">
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {generatedResetLink && (
            <UserResetLinkView
              generatedResetLink={generatedResetLink}
              handleCopyLink={handleCopyLink}
              copiedLink={copiedLink}
              user={user}
              formData={formData}
              handleSendToDashboard={handleSendToDashboard}
              linkSentToDashboard={linkSentToDashboard}
              onClose={onClose}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
