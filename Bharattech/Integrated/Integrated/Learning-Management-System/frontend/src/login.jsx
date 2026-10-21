import { useState } from "react";
import api from "./api/api";
import logo from "../../../../../openinterviewer/assets/BHARATTECH ORIGIN Logo-01.png";

/*Entire code change into tailwindcss*/
const storeSession = ({ access_token, refresh_token, id_token, user }) => {
  localStorage.setItem("token", access_token);
  localStorage.setItem("accessToken", access_token);
  if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
  if (id_token) localStorage.setItem("id_token", id_token);
  localStorage.setItem("role", user.role);
  localStorage.setItem("username", user.username);
  localStorage.setItem("userEmail", user.email);
  localStorage.setItem("userFullName", user.fullName);
  localStorage.setItem("userFirstName", user.firstName || "");
  localStorage.setItem("userLastName", user.lastName || "");
  localStorage.setItem("user", JSON.stringify(user));
};

const inputClass =
  "box-border w-full rounded-[10px] !border !border-[#cbd5e1] !bg-[#f1f5f9] px-[14px] py-[11px] text-[14px] !text-[#0f172a] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 focus:border-[rgba(99,102,241,0.7)] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.15)]";

const labelClass = "mb-1.5 block text-[13px] font-medium !text-[#475569]";

const buttonClass =
  "mt-1 w-full rounded-[10px] border-0 bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_100%)] px-3 py-3 text-[15px] font-semibold tracking-[0.02em] text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)] transition-[opacity,transform,box-shadow] duration-200 hover:-translate-y-px hover:opacity-[0.88] disabled:cursor-not-allowed disabled:opacity-60";

const errorClass =
  "m-0 rounded-lg border !border-red-500 bg-[rgba(248,113,113,0.08)] px-[14px] py-2.5 text-[13px] text-[#f87171]";

function PageShell({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_40%,#eff6ff_70%,#ffffff_100%)] px-4 py-6 font-sans">
      {/* Ambient glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[300px] w-[600px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(59,130,246,0.10)_0%,transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-8%] right-[-5%] h-[400px] w-[400px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.08)_0%,transparent_70%)]"
      />

      {/* Main content */}
      <main className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="flex w-full max-w-[400px] flex-col">
          {/* Logo */}
          <div className="mb-2 w-full text-center">
            <img
              src={logo}
              alt="BharatTech Origin"
              className="mx-auto block w-[80%] max-w-[400px] object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.25)] drop-shadow-[0_0_28px_rgba(99,102,241,0.15)]"
            />
          </div>

          {/* Card */}
          <div className="relative w-full rounded-[20px] bg-[linear-gradient(135deg,rgba(59,130,246,0.5)_0%,rgba(99,102,241,0.35)_40%,rgba(168,85,247,0.3)_80%,rgba(59,130,246,0.4)_100%)] p-0.5 shadow-[0_0_30px_rgba(59,130,246,0.10),0_20px_60px_rgba(15,23,42,0.12)]">
            <div className="rounded-[18px] bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_60%,#f1f5f9_100%)] px-8 py-9">
              {children}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mt-7 shrink-0 text-center text-[12px] font-semibold tracking-[0.05em] text-[rgba(56,60,65,0.6)]">
        © {new Date().getFullYear()} BharatTech Origin. All rights reserved.
      </footer>
    </div>
  );
}

function FormHeader({ title, description }) {
  return (
    <div className="mb-7 text-center">
      <div className="m-0 mb-1.5 text-[22px] font-bold text-[#0f172a]">
        {title}
      </div>
      <p className="m-0 text-[13px] leading-[1.6] text-[#64748b]">
        {description}
      </p>
    </div>
  );
}

function FormField({ label, ...inputProps }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input className={inputClass} {...inputProps} />
    </div>
  );
}

function ErrorMessage({ error }) {
  if (!error) return null;

  return (
    <p role="alert" className={errorClass}>
      {error}
    </p>
  );
}

function SubmitButton({ loading, children, loadingText }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={buttonClass}
      aria-busy={loading}
    >
      {loading ? loadingText : children}
    </button>
  );
}

function SetPasswordForm({
  password,
  error,
  loading,
  onSubmit,
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
}) {
  return (
    <>
      <FormHeader
        title="Set Your Password"
        description="Welcome! Choose a username and a permanent password to activate your account."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
        <FormField
          label="Choose your username"
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          required
          autoFocus
          pattern="[a-zA-Z0-9._-]{3,32}"
          title="3-32 characters: letters, numbers, dots, dashes, or underscores"
          placeholder="Pick a username"
        />

        <FormField
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="Enter a new password"
        />

        <FormField
          label="Confirm new password"
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
          placeholder="Re-enter the new password"
        />

        <ErrorMessage error={error} />

        <SubmitButton loading={loading} loadingText="Setting password…">
          Set password & sign in
        </SubmitButton>
      </form>
    </>
  );
}

function SignInForm({
  username,
  setUsername,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
}) {
  return (
    <>
      <FormHeader
        title="Welcome Back"
        description="Sign in to your BharatTech account"
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
        <FormField
          label="Username or Email"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
          placeholder="Enter username or email"
        />

        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter password"
        />

        <ErrorMessage error={error} />

        <SubmitButton loading={loading} loadingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </>
  );
}

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
            "Login failed. Check your credentials.",
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
          "Could not set new password. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <PageShell>
      {needsPasswordChange ? (
        <SetPasswordForm
          password={password}
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
