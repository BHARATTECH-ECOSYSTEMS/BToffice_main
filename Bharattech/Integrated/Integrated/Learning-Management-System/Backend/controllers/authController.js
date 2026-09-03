const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const cloudinary = require("../config/cloudinary");
const EmailVerification = require("../models/EmailVerification");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const KcAdminClient = require("keycloak-admin").default;
const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-encryption-1234567890";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

function encryptPassword(password) {
  const key = crypto.createHash("sha256").update(JWT_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptPassword(encryptedData) {
  const key = crypto.createHash("sha256").update(JWT_SECRET).digest();
  const parts = encryptedData.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const sendVerificationEmail = async (email, token) => {
  let transporter;
  if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  } else {
    throw new Error("SMTP email is not configured. Please check VITE_AUTH_MODE / EMAIL_USER environment variables.");
  }

  const verificationUrl = `http://localhost:5000/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your email for BharatTech Account",
    text: `Please verify your email by clicking on the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">BharatTech Email Verification</h2>
        <p>Thank you for signing up. Please verify your email to activate your account:</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 16px; background: #ff5a00; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p>This verification link will expire in 24 hours.</p>
        <p>BharatTech Team</p>
      </div>
    `,
  });
};


// ✅ Register User

const registerUser = async (req, res) => {
    try {
        console.log("Incoming Request:", req.body);

        const {
            fullName, username, email, password, role, phoneNumber, gender, dateOfBirth,
            qualification, degree, qualificationStatus, profession, organization, interests,
            professionalTitle, totalExperience, socialLinks, careerDescription, accessLevel, address
        } = req.body;

        // Required Fields Validation
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: "All required fields must be provided." });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Upload Profile Picture to Cloudinary
        let profilePicture = req.body.profilePicture || ""; // Get from body

        if (req.file) {
        
            const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
                folder: "user_profiles",
                transformation: [{ width: 500, height: 500, crop: "limit" }],
            });
            profilePicture = uploadedImage.secure_url;
        }


        const userData = {
            fullName,
            username,
            email,
            password: hashedPassword,
            role,
            profilePicture: profilePicture || "",
            phoneNumber,
            gender: gender || "Other", // Default value
            dateOfBirth,
            address,
            isDeleted: false,
            deletedAt: null
        };
        console.log("Final User Data:", userData);

        // Role-specific fields
        if (role === "learner") {
            Object.assign(userData, {
                qualification,
                degree,
                qualificationStatus: qualificationStatus || "Pursuing",
                profession,
                organization: organization ? { name: organization, address: "" } : null,
                interests
            });
        }

        if (role === "trainer") {
            Object.assign(userData, {
                professionalTitle,
                totalExperience,
                socialLinks,
                careerDescription
            });
        }

        if (role === "examiner") {
            Object.assign(userData, { canEnrollCourses: false });
        }

        if (userData.role === "admin") {
            if (!userData.accessLevel) {
                userData.accessLevel = "Full Admin"; // Set a valid default
            } else if (!["Full Admin", "Content Manager", "Finance Manager"].includes(userData.accessLevel)) {
                return res.status(400).json({ error: "Invalid access level provided." });
            }
        }
        
        console.log("Before saving, profilePicture:", profilePicture);

        // Create and Save User
        const user = new User(userData);
        await user.save();

        const savedUser = await User.findOne({ username });
        console.log("Saved User in DB:", savedUser);
        
        res.status(201).json({ message: "User registered successfully", user });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: error.message || "Server Error" });
    }
};


// ✅ Login User
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        console.log("🔐 Login attempt for email/username:", email);

        // Escape special regex chars from user input
        const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Search by email OR username (allows "admin" username login)
        const user = await User.findOne({
            $or: [
                { email: { $regex: new RegExp(`^${escaped}$`, "i") } },
                { username: { $regex: new RegExp(`^${escaped}$`, "i") } },
            ],
        });

        if (!user) {
            console.log("❌ User not found by email or username:", email);
            return res.status(400).json({
                message: "Invalid credentials. If you're a new user, please contact your admin or sign up first."
            });
        }

        console.log("✅ User found:", user.email, "Role:", user.role);

        // ✅ Check if the user is deleted
        if (user.isDeleted) {
            return res.status(403).json({ message: "Your account has been deactivated. Contact support." });
        }

        // ✅ Check if the user is banned
        if (user.isBanned) {
            return res.status(403).json({ message: "Your account has been banned. Contact support." });
        }

        // Check if password is hashed (starts with $2a$ or $2b$)
        const isPasswordHashed = user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"));
        
        if (!isPasswordHashed) {
            console.log("⚠️ User password is not hashed properly:", email);
            return res.status(500).json({ message: "Account setup incomplete. Please contact admin to reset your password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Invalid password for:", email);
            console.log("💡 User exists but password doesn't match. User may need to reset password.");
            return res.status(400).json({ 
                message: "Invalid email or password. If you're a new user, please use the password reset link provided by your admin." 
            });
        }

        // ✅ Generate token using the entire `user` object
        const token = generateToken(user);  // 🔹 Fix this line

        // ✅ Save token to user document
        user.tokens = [{ token }];
        await user.save();

        res.json({ 
            message: "Login successful", 
            token, 
            user: { 
                id: user._id, 
                name: user.fullName || user.username, 
                email: user.email, 
                role: user.role 
            } 
        });

    } catch (error) {
        console.log("Login Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
// ✅ Change Password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id; // ID from middleware (JWT decoded)
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Please provide current and new password." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password changed successfully" });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ✅ Signup (Public signup - stores in EmailVerification, sends mail, registers user upon link click)
const signup = async (req, res) => {
    try {
        const { username, password, email, role, name } = req.body;

        // Validation
        const inputUsername = username || email;
        if (!inputUsername || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const resolvedEmail = email || (inputUsername.includes("@") ? inputUsername : `${inputUsername}@bharattech.local`);
        const resolvedUsername = inputUsername.includes("@") ? inputUsername.split("@")[0] : inputUsername;
        const resolvedName = name || resolvedUsername;
        const resolvedRole = role || "Employee";

        // Check if email or username already exists in local DB
        const userExists = await User.findOne({
            $or: [
                { email: resolvedEmail },
                { username: resolvedUsername }
            ]
        });
        if (userExists) {
            return res.status(409).json({ message: "Username or Email already exists in local DB" });
        }

        if (process.env.AUTH_MODE === "keycloak") {
            const kcAdmin = new KcAdminClient({
                baseUrl: KEYCLOAK_BASE_URL,
                realmName: KEYCLOAK_ADMIN_REALM,
            });

            await kcAdmin.auth({
                username: KEYCLOAK_ADMIN_USERNAME,
                password: KEYCLOAK_ADMIN_PASSWORD,
                grantType: "password",
                clientId: "admin-cli",
            });

            // Check if user already exists in Keycloak
            const matches = await kcAdmin.users.find({
                realm: KEYCLOAK_REALM,
                username: resolvedUsername,
            });

            if (matches.length > 0) {
                return res.status(409).json({ message: "Username already exists in Keycloak" });
            }

            const emailMatches = await kcAdmin.users.find({
                realm: KEYCLOAK_REALM,
                email: resolvedEmail,
            });

            if (emailMatches.length > 0) {
                return res.status(409).json({ message: "Email already exists in Keycloak" });
            }
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Encrypt password before saving temporarily
        const encryptedPassword = encryptPassword(password);

        // Save verification request
        const verification = new EmailVerification({
            username: resolvedUsername,
            email: resolvedEmail,
            encryptedPassword,
            token: verificationToken
        });
        await verification.save();

        // Send email
        await sendVerificationEmail(resolvedEmail, verificationToken);

        return res.status(201).json({
            message: "Verification email sent. Please check your inbox.",
            email: resolvedEmail
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Signup error", error: error.message });
    }
};

// ✅ Verify Email Callback
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.redirect("http://localhost:8080/employees?verified=false&error=Missing+token");
        }

        const verification = await EmailVerification.findOne({ token });
        if (!verification) {
            return res.redirect("http://localhost:8080/employees?verified=false&error=Invalid+or+expired+verification+token");
        }

        const { username, email, encryptedPassword } = verification;
        const decryptedPassword = decryptPassword(encryptedPassword);

        const resolvedEmail = email;
        const resolvedUsername = username;
        const resolvedName = username;
        const resolvedRole = "Employee"; // Default role

        if (process.env.AUTH_MODE === "keycloak") {
            console.log(`📡 Keycloak Sign Up (Verified): Creating user ${resolvedUsername} (${resolvedEmail})`);
            const kcAdmin = new KcAdminClient({
                baseUrl: KEYCLOAK_BASE_URL,
                realmName: KEYCLOAK_ADMIN_REALM,
            });

            await kcAdmin.auth({
                username: KEYCLOAK_ADMIN_USERNAME,
                password: KEYCLOAK_ADMIN_PASSWORD,
                grantType: "password",
                clientId: "admin-cli",
            });

            // Check if user already exists in Keycloak just in case
            const matches = await kcAdmin.users.find({
                realm: KEYCLOAK_REALM,
                username: resolvedUsername,
            });

            let kcUserId;
            if (matches.length > 0) {
                kcUserId = matches[0].id;
            } else {
                // Create user in Keycloak
                const createdUser = await kcAdmin.users.create({
                    realm: KEYCLOAK_REALM,
                    username: resolvedUsername,
                    email: resolvedEmail,
                    enabled: true,
                    firstName: resolvedName,
                    lastName: "",
                    emailVerified: true,
                });
                kcUserId = createdUser.id;
            }

            // Set Password
            await kcAdmin.users.resetPassword({
                realm: KEYCLOAK_REALM,
                id: kcUserId,
                credential: {
                    type: "password",
                    value: decryptedPassword,
                    temporary: false,
                },
            });

            // Assign role
            const keycloakRoleMap = {
                Admin: "admin",
                Subadmin: "Subadmin",
                Employee: "Employee",
                Intern: "Intern",
            };
            const roleName = keycloakRoleMap[resolvedRole] || "Employee";

            let targetRole;
            try {
                targetRole = await kcAdmin.roles.findOneByName({
                    realm: KEYCLOAK_REALM,
                    name: roleName,
                });
            } catch (err) {
                console.log(`Role ${roleName} not found, creating it...`);
                await kcAdmin.roles.create({
                    realm: KEYCLOAK_REALM,
                    name: roleName,
                });
                targetRole = await kcAdmin.roles.findOneByName({
                    realm: KEYCLOAK_REALM,
                    name: roleName,
                });
            }

            await kcAdmin.users.addRealmRoleMappings({
                realm: KEYCLOAK_REALM,
                id: kcUserId,
                roles: [{ id: targetRole.id, name: targetRole.name }],
            });

            // Also create the user in local MongoDB to avoid any sync issues
            let user = await User.findOne({ keycloakId: kcUserId });
            if (!user) {
                user = new User({
                    keycloakId: kcUserId,
                    email: resolvedEmail,
                    username: resolvedUsername,
                    fullName: resolvedName,
                    role: resolvedRole,
                    authProvider: "keycloak",
                    isDeleted: false,
                    isBanned: false,
                });
                await user.save();
            }
        } else {
            // Local DB registration fallback
            const hashedPassword = await bcrypt.hash(decryptedPassword, 10);
            const user = new User({
                username: resolvedUsername,
                email: resolvedEmail,
                password: hashedPassword,
                role: resolvedRole,
                authProvider: "local",
                isDeleted: false,
                isBanned: false,
            });
            await user.save();
        }

        // Delete verification record
        await EmailVerification.deleteOne({ _id: verification._id });

        // Redirect to success URL
        return res.redirect("http://localhost:8080/employees?verified=true");

    } catch (error) {
        console.error("Verification Error:", error);
        return res.redirect(`http://localhost:8080/employees?verified=false&error=${encodeURIComponent(error.message || "Verification failed")}`);
    }
};

const checkAdminSession = async (req, res) => {
    try {
        const { checkActiveAdminSession } = require("../middlewares/keycloakAuth");
        const active = await checkActiveAdminSession();
        res.json({ active });
    } catch (error) {
        console.error("checkAdminSession error:", error);
        res.status(500).json({ active: false, error: error.message });
    }
};

const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "lms-client";

// Exchanges username/password for tokens via Keycloak's Direct Grant flow and
// builds the user payload our frontend expects. Shared by keycloakLogin and
// acceptInvite (the second leg, after a temporary password has been replaced).
const passwordGrantLogin = async (username, password) => {
    const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: KEYCLOAK_CLIENT_ID,
            grant_type: "password",
            username,
            password,
        }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        return { ok: false, error: data.error, errorDescription: data.error_description };
    }

    const base64 = data.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const tp = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));

    const allRoles = [
        ...(tp.realm_access?.roles || []),
        ...(tp.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles || []),
    ];
    const upper = allRoles.map((r) => r.toUpperCase().replace(/[-_\s]/g, ""));

    let role = "INTERN";
    if (upper.includes("SUPERADMIN")) role = "SUPERADMIN";
    else if (upper.includes("ADMIN"))   role = "ADMIN";
    else if (upper.includes("SUBADMIN")) role = "SUBADMIN";
    else if (upper.includes("EMPLOYEE")) role = "EMPLOYEE";

    const firstName = tp.given_name  || "";
    const lastName  = tp.family_name || "";
    const fullName  = [firstName, lastName].filter(Boolean).join(" ") ||
                      tp.name || tp.preferred_username || "";

    const userObj = {
        fullName, firstName, lastName,
        username: tp.preferred_username || username,
        email:    tp.email || "",
        role,
    };

    // Sync to local DB (best-effort)
    try {
        const { getOrCreateUser } = require("../middlewares/keycloakAuth");
        await getOrCreateUser(tp);
    } catch (_) { /* don't fail login if DB sync fails */ }

    return {
        ok: true,
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        id_token:      data.id_token,
        user:          userObj,
    };
};

const keycloakLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const result = await passwordGrantLogin(username, password);

        if (!result.ok) {
            console.warn("Keycloak login failed:", result.errorDescription || result.error);

            // Temporary (invite) passwords are valid credentials but Keycloak refuses
            // the password grant until the pending UPDATE_PASSWORD action is cleared.
            // Treat that case as "needs a new password" rather than a bad-credentials error.
            if (/not fully set up/i.test(result.errorDescription || "")) {
                return res.status(403).json({
                    requiresPasswordChange: true,
                    message: "Please set a new password to finish accepting your invite.",
                });
            }

            return res.status(401).json({ message: "Invalid username or password" });
        }

        return res.json({ success: true, ...result });
    } catch (error) {
        console.error("keycloakLogin error:", error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};

// Second leg of the invite flow: the user submitted their temporary password
// plus a new permanent one (entered on our own /login page, never on
// Keycloak's hosted UI). We confirm the temporary password is genuinely
// correct by treating Keycloak's "not fully set up" response as proof of
// valid credentials, then use the admin API to set the permanent password
// and clear the pending UPDATE_PASSWORD action, and finally log them in.
const acceptInvite = async (req, res) => {
    try {
        const { username, temporaryPassword, newPassword, newUsername } = req.body;
        const trimmedNewUsername = String(newUsername || "").trim();

        if (!username || !temporaryPassword || !newPassword || !trimmedNewUsername) {
            return res.status(400).json({ message: "Username, temporary password, new password, and a chosen username are required" });
        }

        if (!/^[a-zA-Z0-9._-]{3,32}$/.test(trimmedNewUsername)) {
            return res.status(400).json({ message: "Username must be 3-32 characters and contain only letters, numbers, dots, dashes, or underscores." });
        }

        const checkResult = await passwordGrantLogin(username, temporaryPassword);

        if (!checkResult.ok && !/not fully set up/i.test(checkResult.errorDescription || "")) {
            return res.status(401).json({ message: "Invalid username or temporary password" });
        }

        const kcAdmin = new KcAdminClient({
            baseUrl: KEYCLOAK_BASE_URL,
            realmName: KEYCLOAK_ADMIN_REALM,
        });

        await kcAdmin.auth({
            username: KEYCLOAK_ADMIN_USERNAME,
            password: KEYCLOAK_ADMIN_PASSWORD,
            grantType: "password",
            clientId: "admin-cli",
        });

        // The invitee may have typed either their assigned username or their
        // email to sign in — try both when locating their Keycloak record.
        const byUsername = await kcAdmin.users.find({ realm: KEYCLOAK_REALM, username, exact: true });
        const byEmail = byUsername.length ? [] : await kcAdmin.users.find({ realm: KEYCLOAK_REALM, email: username, exact: true });
        const kcUser = byUsername[0] || byEmail[0];

        if (!kcUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (trimmedNewUsername.toLowerCase() !== (kcUser.username || "").toLowerCase()) {
            const taken = await kcAdmin.users.find({ realm: KEYCLOAK_REALM, username: trimmedNewUsername, exact: true });
            if (taken.some((u) => u.id !== kcUser.id)) {
                return res.status(409).json({ message: "That username is already taken. Please choose another." });
            }
        }

        await kcAdmin.users.resetPassword({
            realm: KEYCLOAK_REALM,
            id: kcUser.id,
            credential: { type: "password", value: newPassword, temporary: false },
        });

        await kcAdmin.users.update(
            { realm: KEYCLOAK_REALM, id: kcUser.id },
            { username: trimmedNewUsername, requiredActions: [] }
        );

        const loginResult = await passwordGrantLogin(trimmedNewUsername, newPassword);

        if (!loginResult.ok) {
            console.error("Post-accept-invite login failed:", loginResult.errorDescription || loginResult.error);
            return res.status(500).json({ message: "Password updated, but automatic sign-in failed. Please log in again." });
        }

        return res.json({ success: true, ...loginResult });
    } catch (error) {
        console.error("acceptInvite error:", error);
        res.status(500).json({ message: "Failed to set new password", error: error.message });
    }
};

// Lets an already-authenticated Keycloak user change their own password from
// inside the app (Profile page), as opposed to the one-time invite-acceptance
// flow. Verifies the current password via Direct Grant before changing it.
const keycloakChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        const username = req.user?.decoded?.preferred_username || req.user?.email;
        if (!username) {
            return res.status(401).json({ message: "Could not identify the current user" });
        }

        const checkResult = await passwordGrantLogin(username, currentPassword);
        if (!checkResult.ok) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        const kcAdmin = new KcAdminClient({
            baseUrl: KEYCLOAK_BASE_URL,
            realmName: KEYCLOAK_ADMIN_REALM,
        });

        await kcAdmin.auth({
            username: KEYCLOAK_ADMIN_USERNAME,
            password: KEYCLOAK_ADMIN_PASSWORD,
            grantType: "password",
            clientId: "admin-cli",
        });

        await kcAdmin.users.resetPassword({
            realm: KEYCLOAK_REALM,
            id: req.user.keycloakId,
            credential: { type: "password", value: newPassword, temporary: false },
        });

        res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        console.error("keycloakChangePassword error:", error);
        res.status(500).json({ message: "Failed to change password", error: error.message });
    }
};

module.exports = { registerUser, loginUser, changePassword, signup, verifyEmail, checkAdminSession, keycloakLogin, acceptInvite, keycloakChangePassword };
