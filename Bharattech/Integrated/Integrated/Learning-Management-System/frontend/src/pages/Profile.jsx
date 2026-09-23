import React from "react";
import TopNav from "../components/topnav";
import Sidebar from "../components/sidebar";
import { useSidebar } from "../contexts/SidebarContext";
import { useProfile } from "../hooks/useProfile";
import ProfileContactCard from "../components/profile/ProfileContactCard";
import ProfileAboutCard from "../components/profile/ProfileAboutCard";
import ChangePasswordCard from "../components/profile/ChangePasswordCard";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function Profile() {
  const { sidebarOpen } = useSidebar();
  const {
    profile,
    loading,
    toast,
    isEditing,
    editPhone,
    setEditPhone,
    editWorkPhone,
    setEditWorkPhone,
    saving,
    handleEditClick,
    handleCancelEdit,
    handleSavePhone,
    showPasswordForm,
    setShowPasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    passwordError,
    setPasswordError,
    changingPassword,
    handleChangePassword
  } = useProfile();

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
          <ProfileContactCard
            profile={profile}
            userName={userName}
            userEmail={userEmail}
            userId={userId}
            isEditing={isEditing}
            editPhone={editPhone}
            setEditPhone={setEditPhone}
            editWorkPhone={editWorkPhone}
            setEditWorkPhone={setEditWorkPhone}
            saving={saving}
            onEdit={handleEditClick}
            onCancel={handleCancelEdit}
            onSave={handleSavePhone}
          />

          <ProfileAboutCard
            userName={userName}
            userEmail={userEmail}
            role={profile.role}
            userId={userId}
          />

          <ChangePasswordCard
            showPasswordForm={showPasswordForm}
            setShowPasswordForm={setShowPasswordForm}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmNewPassword={confirmNewPassword}
            setConfirmNewPassword={setConfirmNewPassword}
            passwordError={passwordError}
            setPasswordError={setPasswordError}
            changingPassword={changingPassword}
            onSubmit={handleChangePassword}
          />
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
