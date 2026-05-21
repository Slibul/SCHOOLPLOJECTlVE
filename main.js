require("dotenv").config();

const express      = require("express");
const path         = require("path");
const connectMongo = require("./DB/mongo/MongoConnect");

const pagesRouter  = require("./route/pages");
const authRouter   = require("./route/auth");
const userRouter   = require("./route/user");
const serverRouter = require("./route/server");
const playerRouter = require("./route/player");
const chatRouter   = require("./route/chat");
const recordRouter = require("./route/record");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 뷰 엔진 ──
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── 미들웨어 ──
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── MongoDB 연결 ──
connectMongo();

// ── 페이지 라우터 (EJS) ──
app.use("/", pagesRouter);

// ── API 라우터 ──
app.use("/auth",   authRouter);
app.use("/user",   userRouter);
app.use("/server", serverRouter);
app.use("/player", playerRouter);
app.use("/chat",   chatRouter);
app.use("/record", recordRouter);   // 게임 기록

// ── 서버 시작 ──
app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT} 에서 실행 중`);
});