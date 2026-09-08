// const express = require("express");
// const router = express.Router();
// const jwt = require("jsonwebtoken");
// const { keycloakAuth } = require("../middlewares/keycloakAuth.hardened");
// const LIBRECHAT_URL = process.env.LIBRECHAT_URL;
// const SHARED_SECRET = process.env.LIBRECHAT_SHARED_SECRET;
// // Generate time-limited embed token for iframe
// router.get("/token", keycloakAuth, async (req, res) => {
//     try {
//         if (!SHARED_SECRET) {
//             return res.status(503).json({ status: "fail", message: "AI not configured" });
//         }
//         const embedToken = jwt.sign({
//             sub: req.user.keycloakId,
//             email: req.user.email,
//             name: req.user.fullName,
//             role: req.user.role,
//             tenant: "bharattech",
//             scope: "chat:read chat:write",
//         },
//         SHARED_SECRET,
//         { expiresIn: "1h", issuer: "bharattech-lms" }
//         );
//         res.json({
//             status: "success",
//             token: embedToken,
//             librechatUrl: LIBRECHAT_URL,
//             expiresIn: 3600,
//         });
//     } catch (error) {
//         console.error("LibreChat bridge error:", error);
//         res.status(500).json({ status: "error", message: "AI session failed" });
//     }
// });

// module.exports=router;