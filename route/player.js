const express = require("express");
const router  = express.Router();
const db      = require("../DB/DBController");
const authMiddleware = require("../middlewares/auth");

/**
 * POST /player/update
 * 실시간 플레이어 상태 업데이트
 * body: { PX, PY, PDM, PHP, session }
 */
router.post("/update", authMiddleware, async (req, res) => {
    const { PX, PY, PDM, PHP } = req.body;
    try {
        const state = await db.updatePlayerState(req.PID, PX, PY, PDM, PHP);
        return res.json({ success: true, state });
    } catch (err) {
        console.error("[player/update]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

module.exports = router;
