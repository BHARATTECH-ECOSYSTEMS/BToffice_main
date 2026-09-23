import { useState } from "react";
import api from "./api/api";
import { PageShell, storeSession } from "./components/auth/AuthShell";
import SignInForm from "./components/auth/SignInForm";
import SetPasswordForm from "./components/auth/SetPasswordForm";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/keycloak-login", {
        username,
        password,
      });

      storeSession(res.data);
      window.location.href = "/dashboard";
    } catch (err) {
      if (err.response?.data?.requiresPasswordChange) {
        setNeedsPasswordChange(true);
        setNewUsername(username);
        setError("");
      } else {
        setError(
          err.response?.data?.message ||
            "Login failed. Check your credentials."
        );
      }
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/accept-invite", {
        username,
        temporaryPassword: password,
        newPassword,
        newUsername,
      });

      storeSession(res.data);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not set new password. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <PageShell>
      {needsPasswordChange ? (
        <SetPasswordForm
          error={error}
          loading={loading}
          onSubmit={handleSetNewPassword}
          newUsername={newUsername}
          setNewUsername={setNewUsername}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmNewPassword={confirmNewPassword}
          setConfirmNewPassword={setConfirmNewPassword}
        />
      ) : (
        <SignInForm
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          error={error}
          loading={loading}
          onSubmit={handleSubmit}
        />
      )}
    </PageShell>
  );
}
