import React from "react";
import { FormHeader, FormField, ErrorMessage, SubmitButton } from "./AuthShell";

export default function SignInForm({
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
