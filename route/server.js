const express = require("express");
const router  = express.Router();
const db      = require("../DB/DBController");
const authMiddleware = require("../middlewares/auth");

/**
 * GET /server/list
 * 공개 서버 목록 조회
 */
router.get("/list", async (req, res) => {
    try {
        const list = await db.getServerList();
        return res.json({ success: true, servers: list });
    } catch (err) {
        console.error("[server/list]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * POST /server/create
 * body: { SID, Private, PrivatePW, session }
 */
router.post("/create", authMiddleware, async (req, res) => {
    const { SID, Private: isPrivate, PrivatePW } = req.body;
    if (!SID)
        return res.status(400).json({ success: false, message: "SID 필요" });

    try {
        await db.createServer(SID, req.PID, isPrivate || false, PrivatePW || "");
        return res.json({ success: true, message: `Server_${SID} 생성 완료` });
    } catch (err) {
        console.error("[server/create]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * POST /server/join
 * body: { SID, session }
 */
router.post("/join", authMiddleware, async (req, res) => {
    const { SID } = req.body;
    if (!SID)
        return res.status(400).json({ success: false, message: "SID 필요" });

    try {
        await db.joinServer(SID, req.PID);
        return res.json({ success: true, message: "입장 완료" });
    } catch (err) {
        console.error("[server/join]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * POST /server/leave
 * body: { SID, session }
 */
router.post("/leave", authMiddleware, async (req, res) => {
    const { SID } = req.body;
    try {
        await db.leaveServer(SID, req.PID);
        return res.json({ success: true, message: "퇴장 완료" });
    } catch (err) {
        console.error("[server/leave]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * GET /server/:SID/players
 * 특정 서버 접속 플레이어 목록
 */
router.get("/:SID/players", async (req, res) => {
    try {
        const players = await db.getServerPlayers(Number(req.params.SID));
        return res.json({ success: true, players });
    } catch (err) {
        console.error("[server/players]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * GET /server/:SID/entities
 * 특정 서버 엔티티 상태 조회
 */
router.get("/:SID/entities", async (req, res) => {
    try {
        const entities = await db.getServerEntities(Number(req.params.SID));
        return res.json({ success: true, entities });
    } catch (err) {
        console.error("[server/entities]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

/**
 * POST /server/:SID/entity
 * 엔티티 상태 업데이트
 * body: { EID, X, Y, DM, HP }
 */
router.post("/:SID/entity", authMiddleware, async (req, res) => {
    const { EID, X, Y, DM, HP } = req.body;
    try {
        const entity = await db.upsertEntity(Number(req.params.SID), EID, { X, Y, DM, HP });
        return res.json({ success: true, entity });
    } catch (err) {
        console.error("[server/entity]", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
    }
});

module.exports = router;
