const express = require("express");
const router  = express.Router();
const db      = require("../DB/DBController");
const authMiddleware = require("../middlewares/auth");

/**
 * POST /record/save
 * Unity에서 게임 종료 시 호출
 * header: x-session
 * body: { StageName, KillCount, PlayTime, IsCleared, RemainHP }
 */
router.post("/save", authMiddleware, async (req, res) => {
    const { StageName, KillCount, PlayTime, IsCleared, RemainHP } = req.body;

    // 필수 필드 검사
    if (StageName === undefined || KillCount === undefined ||
        PlayTime === undefined  || IsCleared === undefined || RemainHP === undefined) {
        return res.status(400).json({ success: false, message: "필드 누락: StageName, KillCount, PlayTime, IsCleared, RemainHP 필요" });
    }

    try {
        const result = await db.saveGameRecord({
            PID:       req.PID,
            StageName: String(StageName).slice(0, 64),
            KillCount: Math.max(0, parseInt(KillCount) || 0),
            PlayTime:  Math.max(0, parseFloat(PlayTime) || 0),
            IsCleared: Boolean(IsCleared),
            RemainHP:  Math.max(0, parseFloat(RemainHP) || 0)
        });
        return res.json({
            success: true,
            message: "기록 저장 완료",
            RID:   result.RID,
            Score: result.Score
        });
    } catch (err) {
        console.error("[record/save]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * GET /record/my?limit=20
 * 내 게임 기록 조회
 * header: x-session
 */
router.get("/my", authMiddleware, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    try {
        const records = await db.getUserRecords(req.PID, limit);
        return res.json({ success: true, records });
    } catch (err) {
        console.error("[record/my]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * GET /record/leaderboard?limit=20
 * 전체 랭킹 조회 (공개)
 */
router.get("/leaderboard", async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    try {
        const ranking = await db.getLeaderboard(limit);
        return res.json({ success: true, ranking });
    } catch (err) {
        console.error("[record/leaderboard]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

module.exports = router;
