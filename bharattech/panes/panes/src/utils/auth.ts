export function loginWithToken(token: string) {
  localStorage.setItem("auth_token", token);

  // optional backend validation
  fetch("http://localhost:3000/validate", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => {});

  // reload to trigger login
  window.location.reload();
}