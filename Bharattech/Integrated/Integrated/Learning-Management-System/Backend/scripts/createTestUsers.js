// Script to create test users with known passwords
// Run with: node scripts/createTestUsers.js

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const testUsers = [
    {
        fullName: "Admin User",
        username: "admin",
        email: "admin@gmail.com",
        password: "admin123",
        role: "Admin"
    },
    {
        fullName: "Subadmin User",
        username: "subadmin",
        email: "subadmin@gmail.com",
        password: "subadmin123",
        role: "Subadmin"
    },
    {
        fullName: "Employee User",
        username: "employee",
        email: "employee@gmail.com",
        password: "employee123",
        role: "Employee"
    },
    {
        fullName: "Intern User",
        username: "intern",
        email: "intern@gmail.com",
        password: "intern123",
        role: "Intern"
    }
];

async function createTestUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        for (const userData of testUsers) {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });
            
            if (existingUser) {
                // Update password if user exists
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                existingUser.password = hashedPassword;
                existingUser.isDeleted = false;
                existingUser.isBanned = false;
                await existingUser.save();
                console.log(`✅ Updated user: ${userData.email}`);
            } else {
                // Create new user
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                const newUser = new User({
                    fullName: userData.fullName,
                    username: userData.username,
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role,
                    isDeleted: false,
                    isBanned: false
                });
                await newUser.save();
                console.log(`✅ Created user: ${userData.email} (${userData.role})`);
            }
        }

        console.log("\n✅ Test users created/updated successfully!");
        console.log("\n📋 Login credentials:");
        testUsers.forEach(user => {
            console.log(`   ${user.email} / ${user.password} (${user.role})`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating test users:", error);
        process.exit(1);
    }
}

createTestUsers();

