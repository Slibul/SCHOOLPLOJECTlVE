const express = require("express");
const router  = express.Router();
const db      = require("../DB/DBController");
const authMiddleware = require("../middlewares/auth");
/**
 * GET /chat/recent?limit=50
 * 최근 채팅 조회
 */
router.get("/recent", async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    try {
        const chats = await db.getRecentChats(limit);
        return res.json({ success: true, chats });
    } catch (err) {
        console.error("[chat/recent]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * POST /chat/send
 * body: { ChatDesc, session }
 */
router.post("/send", authMiddleware, async (req, res) => {
    const { ChatDesc } = req.body;
    if (!ChatDesc || ChatDesc.trim() === "")
        return res.status(400).json({ success: false, message: "메시지 내용 필요" });

    try {
        const msg = await db.saveChat(req.PID, ChatDesc.slice(0, 100));
        return res.json({ success: true, msg });
    } catch (err) {
        console.error("[chat/send]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

module.exports = router;
