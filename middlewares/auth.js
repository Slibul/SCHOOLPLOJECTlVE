const express = require("express");
const router  = express.Router();
const db      = require("../DB/DBController");

/** 세션 검증 미들웨어 */
async function authMiddleware(req, res, next) {
    const session = req.headers["x-session"] || req.body?.session;
    if (!session)
        return res.status(401).json({ success: false, message: "세션 없음" });

    const PID = await db.getSessionPID(session);
    if (!PID)
        return res.status(401).json({ success: false, message: "세션 만료 또는 잘못됨" });

    req.PID = PID;
    next();
}

module.exports=authMiddleware;