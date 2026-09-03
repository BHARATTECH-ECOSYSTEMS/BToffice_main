// UserManagementModal.jsx
import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Trash2,
  UserCheck,
  Copy,
  CheckCircle,
  Clock,
  Key,
  ChevronDown
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { markResetLinkAsSent } from "../services/passwordResetService";

export default function UserManagementModal({ user, isOpen, onClose, onSave, onDelete, onGenerateLink, currentUserRole }) {
  const normCurrentUserRole = String(currentUserRole || localStorage.getItem("role") || "").trim().toLowerCase().replace(/[-_\s]/g, "");
  const isActorSuperAdmin = normCurrentUserRole === "superadmin";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
    status: "Active"
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
        status: user.status || "Active"
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "employee",
        status: "Active"
      });
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
      // onSave is async and might return a generated reset link (for new users)
      if (onSave) {
        const result = await onSave(formData);
        // If parent returned a reset link object (for new users), use it
        if (result && typeof result === 'object' && (result.link || result.id)) {
          setGeneratedResetLink(result);
        }
        // If updating user, close modal after successful save
        if (user && result) {
          // User was updated successfully, modal will be closed by parent
          // But we can also close it here if needed
        }
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert(error.message || "Failed to save user. Please try again.");
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = () => {
    const confirmMessage = `Are you sure you want to delete "${formData.name || formData.email}"?\n\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      if (onDelete) {
        onDelete();
      } else {
        alert("Delete function not available");
      }
    }
  };

  // Generate reset link (without auto-sending)
  const handleGenerateLink = async () => {
    // Get email and role from user object if editing, or from formData if creating
    const userEmail = user?.email || formData.email;
    const userRole = user?.role || formData.role;
    
    if (!userEmail || !userRole) {
      alert("User email and role are required to generate link.");
      return;
    }
    
    if (onGenerateLink) {
      try {
        // Generate the reset link
        const resetLink = await onGenerateLink(userEmail, userRole);
        console.log("✅ Generated reset link:", resetLink);
        
        // Normalize the reset link object
        let linkWithId;
        if (typeof resetLink === "string") {
          linkWithId = {
            link: resetLink,
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
          };
        } else {
          linkWithId = {
            ...resetLink,
            id: resetLink.id || resetLink._id
          };
        }
        
        console.log("✅ Setting generated reset link with ID:", linkWithId);
        setGeneratedResetLink(linkWithId);
        setLinkSentToDashboard(false); // Reset sent status when new link is generated
        
        // Automatically refresh dashboards when link is generated
        // The link will appear on dashboards with status "Pending"
        // Small delay to ensure backend has saved the link
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('resetLinksUpdated'));
          console.log("📢 Dispatched resetLinksUpdated event - link should appear on dashboard");
        }, 500);
      } catch (err) {
        alert(err.message || "Error generating reset link");
      }
    } else {
      alert("Reset link generation not available");
    }
  };

  // Send reset link to email - marks link as "Sent" so it appears on dashboards
  const handleSendToDashboard = async () => {
    if (!generatedResetLink) {
      alert("No generated link to send.");
      return;
    }
    
    // Get the link ID (could be id or _id)
    const linkId = generatedResetLink.id || generatedResetLink._id;
    
    console.log("🔍 Generated reset link object:", generatedResetLink);
    console.log("🔍 Link ID to send:", linkId);
      
    if (!linkId) {
      console.error("❌ Reset link ID not found in:", generatedResetLink);
      alert("Reset link ID not found. Please generate a new link.");
      return;
    }

    try {
      console.log("📤 Sending reset link to email, linkId:", linkId);
      // Mark the reset link as "Sent" in the database
      const result = await markResetLinkAsSent(linkId);
      console.log("✅ Reset link marked as sent:", result);
      
      setLinkSentToDashboard(true);
      const userRole = user?.role || formData.role;
      alert(`Reset link sent successfully! It's now available in the ${userRole} dashboard.`);
      
      // Trigger a custom event to notify dashboards to refresh
      window.dispatchEvent(new CustomEvent('resetLinksUpdated'));
    } catch (error) {
      console.error("❌ Error sending reset link:", error);
      console.error("❌ Error details:", {
        message: error.message,
        linkId: linkId,
        generatedResetLink: generatedResetLink
      });
      alert(error.message || "Failed to send reset link. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header: icon left, title centered, X right */}
        <CardHeader className="relative pb-3">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <UserCheck className="w-5 h-5 text-blue-500" />
          </div>

          <div className="text-center">
            <CardTitle className="text-lg font-semibold">
              {user ? "Generate Reset Link" : "Add New User"}
            </CardTitle>
          </div>

          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent>
          {/* If editing a user, show only Generate Reset Link button */}
          {user && !generatedResetLink && (
            <div className="space-y-4">
              {/* User Info Display */}
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

              {/* Generate Reset Link Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleGenerateLink}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 hover:from-blue-600 hover:via-blue-700 text-white flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Generate Reset Link
                </Button>
              </div>

              {/* Cancel Button */}
              <div className="pt-2">
                <Button type="button" onClick={onClose} className="w-full bg-gray-500 hover:bg-gray-600 text-white">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* If creating a new user, show the full form */}
          {!user && !generatedResetLink && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium mb-1 block">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={errors.name ? "border-red-500" : ""}
                  placeholder="Enter full name"
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-1 block">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={errors.email ? "border-red-500" : ""}
                  placeholder="user@example.com"
                  required
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role" className="text-sm font-medium mb-1 block">Role *</Label>
                <div className="relative">
                  <select
                    id="role"
                    value={formData.role.toLowerCase()}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full px-3 py-2 pr-12 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${errors.role ? "border-red-500" : ""}`}
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="intern">Intern</option>
                    <option value="subadmin">Subadmin</option>
                    <option value="admin">Admin</option>
                    {isActorSuperAdmin && <option value="superadmin">Superadmin</option>}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status" className="text-sm font-medium mb-1 block">Status *</Label>
                <div className="relative">
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 pr-12 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Generate Reset Link */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleGenerateLink}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 hover:from-blue-600 hover:via-blue-700 text-white flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Generate Reset Link
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Create User
                </Button>
                <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white">
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Reset Link Display - shows when generatedResetLink exists */}
          {generatedResetLink && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-green-700 dark:text-green-400 text-sm">Password Reset Link Generated</h4>
                  </div>
 
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => handleCopyLink(generatedResetLink.link || generatedResetLink)}
                      className="bg-background border border-green-500/30 text-green-600 dark:text-green-400 px-3 py-2"
                    >
                      {copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
 
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Reset Link for {(user?.role || formData.role) || "User"} ({(user?.email || formData.email) || "N/A"})
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={generatedResetLink.link || generatedResetLink}
                      readOnly
                      className="flex-1 text-xs bg-background border-green-500/30 text-foreground"
                    />
                  </div>
                </div>
 
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Expires: {new Date(generatedResetLink.expiresAt || Date.now() + 24*3600*1000).toLocaleString()}</span>
                  </div>

                  {/* Send to Email Button and Done Button */}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSendToDashboard}
                      className={`px-4 py-2 rounded-md ${linkSentToDashboard ? "bg-green-600" : "bg-blue-500"} text-white`}
                      disabled={linkSentToDashboard}
                    >
                      {linkSentToDashboard ? "✓ Sent to Email" : "Send to Email"}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        // Close modal
                        onClose && onClose();
                      }}
                      className="px-6 py-2 rounded-md bg-blue-600 text-white"
                    >
                      Done
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
