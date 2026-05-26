const mongoose = require("mongoose");

const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://root:mysql123@ac-64s16x5-shard-00-00.r0yfenk.mongodb.net:27017,ac-64s16x5-shard-00-01.r0yfenk.mongodb.net:27017,ac-64s16x5-shard-00-02.r0yfenk.mongodb.net:27017/gamedata?ssl=true&replicaSet=atlas-uzj4dr-shard-0&authSource=admin&appName=Cluster0");
        console.log("[MongoDB] 연결 성공");
    } catch (err) {
        console.error("[MongoDB] 연결 실패:", err.message);
    }
};

module.exports = connectMongo;
