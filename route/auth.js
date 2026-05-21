const express = require("express");
const router  = express.Router();
const db      = require("../DB/DBController");
const crypto  = require("crypto");

/** 세션 키 생성 유틸 */
function generateSessionKey() {
    return crypto.randomBytes(48).toString("hex");
}

/**
 * POST /auth/login
 * body: { StringID, PW }
 */
router.post("/login", async (req, res) => {
    const { StringID, PW } = req.body;
    if (!StringID || !PW)
        return res.status(400).json({ success: false, message: "ID/PW 필요" });

    try {
        const user = await db.loginUser(StringID, PW);
        if (!user)
            return res.status(401).json({ success: false, message: "ID 또는 PW 불일치" });

        const sessionKey = generateSessionKey();
        await db.saveSession(user.PID, sessionKey);

        return res.json({ success: true, PID: user.PID, session: sessionKey });
    } catch (err) {
        console.error("[login]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * POST /auth/register
 * body: { StringID, PW, UserName }
 * PID는 서버에서 자동 할당
 */
router.post("/register", async (req, res) => {
    const { StringID, PW, UserName } = req.body;
    if (!StringID || !PW || !UserName)
        return res.status(400).json({ success: false, message: "ID, PW, 닉네임 필요" });

    try {
        const newPID = await db.registerUser(StringID, PW, UserName);
        return res.json({ success: true, message: "회원가입 완료", PID: newPID });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ success: false, message: "이미 존재하는 아이디입니다." });
        console.error("[register]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * POST /auth/logout
 * body: { session }
 */
router.post("/logout", async (req, res) => {
    const { session } = req.body;
    if (!session)
        return res.status(400).json({ success: false, message: "세션 키 필요" });

    try {
        await db.deleteSession(session);
        return res.json({ success: true, message: "로그아웃 완료" });
    } catch (err) {
        console.error("[logout]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

module.exports = router;
