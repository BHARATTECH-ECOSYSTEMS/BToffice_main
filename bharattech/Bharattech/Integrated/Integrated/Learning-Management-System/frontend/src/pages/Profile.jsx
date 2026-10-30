import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/topnav";
import Sidebar from "../components/sidebar";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios"; // ✅ use interceptor-based axios
import { Edit2, Mail, Phone, User, Briefcase, Save, X, Lock, CheckCircle, AlertCircle } from "lucide-react";

const PHONE_DIGITS_ONLY = /^\d+$/;

const TABS = [
  //"About",
];

export default function Profile() {
  const navigate = useNavigate();
  const { sidebarOpen } = useSidebar();
  const { user: authUser, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("About");
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editWorkPhone, setEditWorkPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  /* ---------------- FETCH PROFILE (KEYCLOAK SAFE) ---------------- */
  useEffect(() => {
    if (authLoading) return;

    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/me");

        // 🔑 prefer role from AuthContext (Keycloak)
        setProfile({
          ...res.data,
          role: authUser?.role || res.data.role,
        });
      } catch (err) {
        console.error("Error fetching profile:", err);

        // fallback only from AuthContext (NO legacy localStorage)
        if (authUser) {
          setProfile({
            fullName: authUser.fullName || "User",
            email: authUser.email || "N/A",
            role: authUser.role || "N/A",
            username: authUser.email?.split("@")[0] || "N/A",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authLoading, authUser, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------------- EDIT HANDLERS ---------------- */
  const handleEditClick = () => {
    setEditPhone(profile.phone || "");
    setEditWorkPhone(profile.workPhone || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditPhone("");
    setEditWorkPhone("");
  };

  const validatePhone = (value) => {
    if (!value) return null;
    if (!PHONE_DIGITS_ONLY.test(value)) return "Characters not allowed";
    if (value.length !== 10) return "Phone number must be 10 digits";
    return null;
  };

  const handleSavePhone = async () => {
    const phoneInvalid = validatePhone(editPhone);
    const workPhoneInvalid = validatePhone(editWorkPhone);
    if (phoneInvalid || workPhoneInvalid) {
      setToast({ message: phoneInvalid || workPhoneInvalid, type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch("/user/me", {
        phone: editPhone,
        workPhone: editWorkPhone,
      });

      setProfile((prev) => ({
        ...prev,
        ...res.data,
        phone: editPhone,
        workPhone: editWorkPhone,
      }));

      setIsEditing(false);
      setToast({ message: "Profile updated", type: "success" });
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await api.post("/auth/keycloak-change-password", { currentPassword, newPassword });
      setToast({ message: "Password updated", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setPasswordError(error?.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  /* ---------------- STATES ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!profile) return null;

  const userName = profile.fullName || profile.name || "User";
  const userEmail = profile.email || "N/A";
  const userId =
    profile.employeeId ||
    profile._id?.slice(-6).toUpperCase() ||
    "N/A";

  /* ====================== UI (UNCHANGED) ====================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <TopNav />
      <Sidebar />

      <main
        className={`pt-[90px] transition-all duration-300 ${
          sidebarOpen ? "lg:pl-[240px]" : "lg:pl-0"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
              {/* Profile Image & Name */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-4 flex-shrink-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      profile.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        userName
                      )}&size=100&background=2563eb&color=fff`
                    }
                    alt={userName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg"
                  />
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    {userName}
                    <span className="text-sm sm:text-base font-normal text-gray-500">
                      {" "}
                      (BT-{userId})
                    </span>
                  </h2>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Work Email:</span>
                    <span className="text-blue-600 font-medium">
                      {userEmail}
                    </span>
                  </div>
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Email:</span>
                    <span className="text-blue-600 font-medium">
                      {userEmail}
                    </span>
                  </div>
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Work Phone:</span>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editWorkPhone}
                        onChange={(e) => setEditWorkPhone(e.target.value)}
                        maxLength={10}
                        className="px-2 py-1 rounded text-sm border"
                      />
                    ) : (
                      <span className="font-medium">
                        {profile.workPhone || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Phone:</span>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        maxLength={10}
                        className="px-2 py-1 rounded text-sm border"
                      />
                    ) : (
                      <span className="font-medium">
                        {profile.phone || "N/A"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Buttons */}
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSavePhone}
                      disabled={saving}
                      className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditClick}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              About
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div>
                <label className="text-sm text-gray-500">Full Name</label>
                <p className="font-medium">{userName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium">{userEmail}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Role</label>
                <p className="font-medium capitalize">
                  {profile.role || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Employee ID</label>
                <p className="font-medium">BT-{userId}</p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-500" />
                Password
              </h3>
              {!showPasswordForm && (
                <button
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Change Password
                </button>
              )}
            </div>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                <div>
                  <label className="text-sm text-gray-500">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>

                {passwordError && (
                  <p className="sm:col-span-3 text-sm text-red-600">{passwordError}</p>
                )}

                <div className="sm:col-span-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? "Saving…" : "Save Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setPasswordError("");
                    }}
                    className="rounded-lg border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <div
          key={toast.message}
          className={`${toast.type === "error" ? "toast-error" : "toast-success"} flex items-center gap-2`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
          <span className="font-medium text-gray-900">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
