const mongoose = require("mongoose");

const ATLAS_DIRECT_HOSTS = [
    "ac-5ls0xst-shard-00-00.93fjqox.mongodb.net:27017",
    "ac-5ls0xst-shard-00-01.93fjqox.mongodb.net:27017",
    "ac-5ls0xst-shard-00-02.93fjqox.mongodb.net:27017",
];

const resolveMongoUri = (uri) => {
    if (!uri?.startsWith("mongodb+srv://")) {
        return uri;
    }

    const parsed = new URL(uri);
    if (parsed.hostname !== "cluster0.93fjqox.mongodb.net") {
        return uri;
    }

    const auth = parsed.username
        ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
        : "";

    const params = parsed.searchParams;
    if (!params.has("tls") && !params.has("ssl")) params.set("tls", "true");
    if (!params.has("authSource")) params.set("authSource", "admin");
    if (!params.has("retryWrites")) params.set("retryWrites", "true");
    if (!params.has("w")) params.set("w", "majority");

    return `mongodb://${auth}${ATLAS_DIRECT_HOSTS.join(",")}${parsed.pathname}?${params.toString()}`;
};

const connectDB = async () => {
    try {
        await mongoose.connect(resolveMongoUri(process.env.MONGO_URI), {
            serverSelectionTimeoutMS: 15000,
        });
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    }
};
module.exports = connectDB;
