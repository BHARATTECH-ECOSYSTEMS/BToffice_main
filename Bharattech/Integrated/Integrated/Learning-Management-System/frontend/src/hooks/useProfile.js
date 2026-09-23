import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../LMS/context/AuthContext";

const PHONE_DIGITS_ONLY = /^\d+$/;

export function useProfile() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (authLoading) return;

    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/me");
        setProfile({
          ...res.data,
          role: authUser?.role || res.data.role,
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
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
  }, [authLoading, authUser]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleEditClick = () => {
    setEditPhone(profile?.phone || "");
    setEditWorkPhone(profile?.workPhone || "");
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
      setToast({ message: "Error updating profile. Please try again.", type: "error" });
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
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordError(error?.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return {
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
  };
}
