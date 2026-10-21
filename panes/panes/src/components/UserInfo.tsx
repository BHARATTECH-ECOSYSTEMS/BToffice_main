import keycloak from "../lib/keycloak";

export const UserInfo = () => {
  return (
    <div>
      <h3>Welcome</h3>
      <p>{keycloak.tokenParsed?.preferred_username}</p>

      <button onClick={() => keycloak.logout()}>
        Logout
      </button>
    </div>
  );
};