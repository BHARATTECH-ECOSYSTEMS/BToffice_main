import React from "react";
import { FormHeader, FormField, ErrorMessage, SubmitButton } from "./AuthShell";

export default function SetPasswordForm({
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
