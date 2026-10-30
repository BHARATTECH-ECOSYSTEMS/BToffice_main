<!DOCTYPE html>
<html lang="${properties.locale!}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${msg("doRegister")}</title>

  <style>
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9fafb;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, Helvetica, Arial, sans-serif;
    }

    .card {
      width: 100%;
      max-width: 420px;
      background: #fff;
      padding: 36px;
      border-radius: 14px;
      box-shadow: 0 18px 45px rgba(0,0,0,.12);
    }

    h1 {
      margin-bottom: 20px;
      font-size: 26px;
      font-weight: 700;
    }

    .field {
      margin-bottom: 16px;
    }

    label {
      font-size: 12px;
      display: block;
      margin-bottom: 6px;
      color: #374151;
    }

    input {
      width: 100%;
      padding: 11px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      font-size: 13px;
    }

    button {
      width: 100%;
      margin-top: 12px;
      padding: 11px;
      border: none;
      border-radius: 999px;
      font-weight: 600;
      color: #fff;
      background: #f97316;
      cursor: pointer;
    }

    .bottom {
      text-align: center;
      font-size: 12px;
      margin-top: 18px;
    }

    .bottom a {
      color: #f97316;
      text-decoration: none;
    }
  </style>
</head>

<body>
  <div class="card">
    <h1>${msg("doRegister")}</h1>

    <form action="${url.registrationAction}" method="post">

      <div class="field">
        <label for="firstName">${msg("firstName")}</label>
        <input id="firstName" name="firstName" type="text" required />
      </div>

      <div class="field">
        <label for="lastName">${msg("lastName")}</label>
        <input id="lastName" name="lastName" type="text" required />
      </div>

      <div class="field">
        <label for="email">${msg("email")}</label>
        <input id="email" name="email" type="email" required />
      </div>

      <#if !realm.loginWithEmailAllowed>
      <div class="field">
        <label for="username">${msg("username")}</label>
        <input id="username" name="username" type="text" required />
      </div>
      </#if>

      <div class="field">
        <label for="password">${msg("password")}</label>
        <input id="password" name="password" type="password" required />
      </div>

      <div class="field">
        <label for="password-confirm">${msg("passwordConfirm")}</label>
        <input id="password-confirm" name="password-confirm" type="password" required />
      </div>

      <button type="submit">
        ${msg("doRegister")}
      </button>
    </form>

    <div class="bottom">
      <a href="${url.loginUrl}">${msg("backToLogin")}</a>
    </div>
  </div>
</body>
</html>
