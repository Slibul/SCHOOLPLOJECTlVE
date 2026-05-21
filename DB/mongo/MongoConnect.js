const mongoose = require("mongoose");

const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/skul_realtime");
        console.log("[MongoDB] 연결 성공");
    } catch (err) {
        console.error("[MongoDB] 연결 실패:", err.message);
    }
};

module.exports = connectMongo;
