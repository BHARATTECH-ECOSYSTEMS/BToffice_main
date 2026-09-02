import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "https://keycloak-24-0-5-9yaq.onrender.com",
  realm: "bharattech",
  clientId: "lms-client",
});

export default keycloak;
