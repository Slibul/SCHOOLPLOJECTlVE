const express = require("express");
const router  = express.Router();
const db      = require("../DB/DBController");
const authMiddleware = require("../middlewares/auth");

/**
 * GET /user/info
 * header: x-session
 */
router.get("/info", authMiddleware, async (req, res) => {
    try {
        const data = await db.getUserData(req.PID);
        if (!data)
            return res.status(404).json({ success: false, message: "유저 없음" });
        return res.json({ success: true, data });
    } catch (err) {
        console.error("[user/info]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * GET /user/items
 * header: x-session
 */
router.get("/items", authMiddleware, async (req, res) => {
    try {
        const items = await db.getUserItems(req.PID);
        return res.json({ success: true, items });
    } catch (err) {
        console.error("[user/items]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

module.exports = router;
