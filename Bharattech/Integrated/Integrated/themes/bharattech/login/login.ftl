<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Sign in to BharatTech</title>

    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, Helvetica, Arial, sans-serif;
        }

        body {
            min-height: 100vh;
            background: radial-gradient(circle at top right, #ffe9d4 0, #ffffff 40%) #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #111827;
        }

        body::before {
            content: "";
            position: fixed;
            inset: 0;
            background-image:
                linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
            z-index: -1;
        }

        .card {
            width: 430px;
            background: #ffffff;
            border-radius: 14px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
            padding: 40px 40px 32px;
        }

        .card h1 {
            font-size: 26px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .card p.subtitle {
            font-size: 13px;
            line-height: 1.5;
            color: #6b7280;
            margin-bottom: 24px;
        }

        .social-providers {
            margin-bottom: 18px;
        }

        .social-btn {
            width: 100%;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 14px;
            color: #111827;
            background-color: #ffffff;
            cursor: pointer;
            text-decoration: none;
            transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
            margin-bottom: 10px;
        }

        .social-btn:hover {
            border-color: #9ca3af;
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
            transform: translateY(-1px);
        }

        .social-icon {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #111827;
        }

        .divider {
            margin: 18px 0;
            display: flex;
            align-items: center;
            color: #9ca3af;
            font-size: 12px;
        }

        .divider::before,
        .divider::after {
            content: "";
            flex: 1;
            height: 1px;
            background-color: #e5e7eb;
        }

        .divider span {
            padding: 0 10px;
            white-space: nowrap;
        }

        .field {
            margin-bottom: 18px;
        }

        .field label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 6px;
        }

        .field input[type="email"],
        .field input[type="password"],
        .field input[type="text"] {
            width: 100%;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            padding: 11px 12px;
            font-size: 13px;
            color: #111827;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
            background-color: #ffffff;
        }

        .field input::placeholder {
            color: #9ca3af;
        }

        .field input:focus {
            border-color: #f97316;
            box-shadow: 0 0 0 1px rgba(249,115,22,0.25);
        }

        .password-wrapper {
            position: relative;
        }

        .password-toggle-icon {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid #d1d5db;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #6b7280;
        }

        .extra-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 18px;
        }

        .remember {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #4b5563;
        }

        .remember input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: #f97316;
        }

        .forgot {
            color: #f97316;
            cursor: pointer;
            text-decoration: none;
        }

        .forgot:hover {
            text-decoration: underline;
        }

        .signin-btn {
            width: 100%;
            border-radius: 999px;
            border: none;
            padding: 11px 16px;
            font-size: 14px;
            font-weight: 600;
            color: #ffffff;
            cursor: pointer;
            background-image: linear-gradient(to right, #fb923c, #f97316);
            box-shadow: 0 10px 25px rgba(249,115,22,0.5);
            margin-bottom: 22px;
            transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .signin-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 30px rgba(249,115,22,0.55);
        }

        .signin-btn:active {
            transform: translateY(0);
            box-shadow: 0 7px 15px rgba(249,115,22,0.45);
        }

        .bottom-box {
            border-top: 1px solid #f3f4f6;
            padding-top: 18px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }

        .bottom-box .signup-line {
            margin-bottom: 10px;
        }

        .bottom-box .signup-line span {
            color: #111827;
        }

        .bottom-box .signup-line a {
            color: #f97316;
            font-weight: 500;
            text-decoration: none;
        }

        .bottom-box .signup-line a:hover {
            text-decoration: underline;
        }

        .bottom-box .terms {
            line-height: 1.6;
        }

        .bottom-box .terms a {
            color: #f97316;
            text-decoration: none;
        }

        .bottom-box .terms a:hover {
            text-decoration: underline;
        }
    </style>
</head>

<body>
<div class="card">
    <h1>Sign In</h1>
    <p class="subtitle">
        Enter your credentials to access your account. All roles (SSO,
        Admin, Sub-Admin, Employee, Intern) can sign in from this page.
    </p>

    <!-- SOCIAL PROVIDERS (Google, etc. from Keycloak) -->
    <#if realm.password && social?? && social.providers?has_content>
        <div class="social-providers">
            <#list social.providers as p>
                <a href="${p.loginUrl}" class="social-btn">
                    <span class="social-icon">${p.displayName?substring(0, 1)}</span>
                    <span>Continue with ${p.displayName}</span>
                </a>
            </#list>
        </div>
    </#if>

    <!-- MAIN LOGIN FORM -->
    <form id="kc-form-login" action="${url.loginAction}" method="post">
        <div class="field">
            <label for="username">Username / Email</label>
            <input id="username"
                   name="username"
                   type="text"
                   value="${login.username!''}"
                   placeholder="Enter username or email" />
        </div>

        <div class="field">
            <label for="password">Password</label>
            <div class="password-wrapper">
                <input id="password"
                       name="password"
                       type="password"
                       placeholder="Enter your password" />
                <span class="password-toggle-icon">&#128065;</span>
            </div>
        </div>

        <#if realm.rememberMe && !usernameEditDisabled??>
            <div class="extra-row">
                <label class="remember">
                    <input type="checkbox"
                           id="rememberMe"
                           name="rememberMe"
                           <#if login.rememberMe??>checked</#if> />
                    <span>Remember me</span>
                </label>
                <a class="forgot" href="${url.loginResetCredentialsUrl}">
                    Forgot password?
                </a>
            </div>
        </#if>

        <button type="submit" class="signin-btn" id="kc-login">
            Sign In
        </button>
    </form>

    <div class="bottom-box">
        <div class="signup-line">
            <span>Don't have an account?</span>
            &nbsp;<a href="${url.registrationUrl!}">Sign up</a>
        </div>
        <div class="terms">
            By signing in, you agree to our
            <a href="#">Terms of Service</a> and
            <a href="#">Privacy Policy</a>.
        </div>
    </div>
</div>
</body>
</html>
