const pool = require("./mysql/MySQLPool");
const {
    MongoLoginData, MongoUserData, MongoUserItem,
    MongoSession,   MongoGameRecord,
    ServerList: MongoServerList, Servers: MongoServers,
    ServerEntity, ServerPlayer, PlayerState,
    Chat: MongoChat
} = require("./mongo/MongoSchemas");

// ═══════════════════════════════════════════════════
//  공통 유틸
// ═══════════════════════════════════════════════════

async function dualWrite(mysqlFn, mongoFn) {
    const [m, g] = await Promise.allSettled([mysqlFn(), mongoFn()]);
    if (m.status === "rejected") console.error("[DualWrite] MySQL:", m.reason?.message);
    if (g.status === "rejected") console.error("[DualWrite] Mongo:", g.reason?.message);
    if (m.status === "fulfilled") return m.value;
    if (g.status === "fulfilled") return g.value;
    throw new Error("양쪽 DB 모두 쓰기 실패");
}

async function dualRead(mysqlFn, mongoFn) {
    try {
        const r = await mysqlFn();
        const isEmpty = r === null || r === undefined || (Array.isArray(r) && r.length === 0);
        if (!isEmpty) return r;
        return (await mongoFn().catch(() => null)) ?? r;
    } catch (e) {
        //console.warn("[DualRead] MySQL 실패, Mongo 폴백:", e.message); // 무한 로그 방지 
        return mongoFn();
    }
}

// ═══════════════════════════════════════════════════
//  로그인 / 회원가입
// ═══════════════════════════════════════════════════

async function loginUser(StringID, PW) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query(
                "SELECT PID FROM LoginData WHERE StringID=? AND PW=?", [StringID, PW]
            );
            return rows[0] || null;
        },
        async () => {
            const doc = await MongoLoginData.findOne({ StringID, PW });
            return doc ? { PID: doc.PID } : null;
        }
    );
}

async function registerUser(StringID, PW, UserName) {
    // ── 사전 중복 체크 (양쪽 DB 모두 확인) ──
    const dupError = Object.assign(new Error("이미 존재하는 아이디입니다."), { code: "ER_DUP_ENTRY" });

    try {
        const [exists] = await pool.query(
            "SELECT PID FROM LoginData WHERE StringID=? LIMIT 1", [StringID]
        );
        if (exists.length > 0) throw dupError;
    } catch (e) {
        if (e.code === "ER_DUP_ENTRY") throw e;
        // MySQL 연결 실패 시 Mongo에서도 확인
        const mongoExists = await MongoLoginData.findOne({ StringID }).lean();
        if (mongoExists) throw dupError;
    }

    // PID 결정: MySQL AUTO_INCREMENT 우선, 실패 시 Mongo에서 max+1
    let newPID = null;

    // MySQL 쪽 시도
    const mysqlFn = async () => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [r] = await conn.query(
                "INSERT INTO LoginData (StringID, PW) VALUES (?, ?)", [StringID, PW]
            );
            newPID = r.insertId;
            await conn.query(
                "INSERT INTO GameUserData (PID, UserName, Money, Cash, createtime) VALUES (?, ?, 0, 0, NOW())",
                [newPID, UserName]
            );
            await conn.commit();
            return newPID;
        } catch (e) { await conn.rollback(); throw e; }
        finally { conn.release(); }
    };

    // MongoDB 쪽 - MySQL에서 받은 PID 활용, 없으면 자체 생성
    const mongoFn = async () => {
        const pid = newPID ?? ((await MongoLoginData.countDocuments()) + 1001);
        await MongoLoginData.findOneAndUpdate(
            { StringID },
            { PID: pid, StringID, PW },
            { upsert: true, new: true }
        );
        await MongoUserData.findOneAndUpdate(
            { PID: pid },
            { PID: pid, UserName, Money: 0, Cash: 0, createtime: new Date() },
            { upsert: true, new: true }
        );
        return pid;
    };

    return await dualWrite(mysqlFn, mongoFn);
}

async function getUserData(PID) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query("SELECT * FROM GameUserData WHERE PID=?", [PID]);
            return rows[0] || null;
        },
        async () => MongoUserData.findOne({ PID }).lean()
    );
}

async function getUserItems(PID) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query("SELECT * FROM UserItemData WHERE PID=?", [PID]);
            return rows;
        },
        async () => MongoUserItem.find({ PID }).lean()
    );
}

// ═══════════════════════════════════════════════════
//  세션
// ═══════════════════════════════════════════════════

async function saveSession(PID, Session_Key) {
    await dualWrite(
        async () => pool.query(
            "INSERT INTO UserSession (PID, Session_Key) VALUES (?,?) ON DUPLICATE KEY UPDATE Session_Key=?",
            [PID, Session_Key, Session_Key]
        ),
        async () => MongoSession.findOneAndUpdate(
            { PID }, { Session_Key }, { upsert: true, new: true }
        )
    );
}

async function getSessionPID(Session_Key) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query(
                "SELECT PID FROM UserSession WHERE Session_Key=?", [Session_Key]
            );
            return rows[0]?.PID ?? null;
        },
        async () => {
            const doc = await MongoSession.findOne({ Session_Key });
            return doc?.PID ?? null;
        }
    );
}

async function deleteSession(Session_Key) {
    await dualWrite(
        async () => pool.query("DELETE FROM UserSession WHERE Session_Key=?", [Session_Key]),
        async () => MongoSession.deleteOne({ Session_Key })
    );
}

// ═══════════════════════════════════════════════════
//  게임 기록
// ═══════════════════════════════════════════════════

async function saveGameRecord({ PID, StageName, KillCount, PlayTime, IsCleared, RemainHP }) {
    const Score = Math.max(0, Math.floor(
        (KillCount * 100) + (RemainHP * 10) - (PlayTime * 0.5)
    ));
    return await dualWrite(
        async () => {
            const [r] = await pool.query(
                `INSERT INTO GameRecord (PID, StageName, KillCount, PlayTime, IsCleared, RemainHP, Score)
                 VALUES (?,?,?,?,?,?,?)`,
                [PID, StageName, KillCount, PlayTime, IsCleared ? 1 : 0, RemainHP, Score]
            );
            return { RID: r.insertId, Score };
        },
        async () => {
            const doc = await MongoGameRecord.create({
                PID, StageName, KillCount, PlayTime, IsCleared, RemainHP, Score
            });
            return { RID: doc._id, Score };
        }
    );
}

async function getUserRecords(PID, limit = 20) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query(
                `SELECT RID, StageName, KillCount, PlayTime, IsCleared, RemainHP, Score, RecordedAt
                 FROM GameRecord WHERE PID=? ORDER BY RecordedAt DESC LIMIT ?`,
                [PID, limit]
            );
            return rows;
        },
        async () => MongoGameRecord.find({ PID }).sort({ RecordedAt: -1 }).limit(limit).lean()
    );
}

async function getLeaderboard(limit = 100) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query(
                `SELECT g.PID, u.UserName,
                        SUM(g.Score) AS TotalScore, SUM(g.KillCount) AS TotalKills,
                        COUNT(*) AS TotalGames, SUM(g.IsCleared) AS TotalClears
                 FROM GameRecord g JOIN GameUserData u ON g.PID=u.PID
                 GROUP BY g.PID, u.UserName ORDER BY TotalScore DESC LIMIT ?`,
                [limit]
            );
            return rows;
        },
        async () => {
            // Mongo 폴백: aggregate
            return MongoGameRecord.aggregate([
              { 
                $lookup: { 
                  from: "gameuserdatas", 
                  localField: "PID", 
                  foreignField: "PID", 
                  as: "user_info" 
                } 
              },
              {
                $unwind: "$user_info"
              },
              { 
                $project: { 
                  _id: 0, 
                  PID: "$PID", 
                  UserName: "$user_info.UserName", 
                  TotalScore: "$Score", 
                  TotalKills: "$KillCount", 
                  TotalGames: { $literal: 1 }, 
                  TotalClears: { 
                  $cond: [ { $eq: ["$IsCleared", true] }, 1, 0 ] 
              } 
            } 
          },
        { $sort: { TotalScore: -1 } }
    ]);
});
}


// ======================
// 총합 스코어 리더보드
// ======================

async function getLeaderboard_total(limit = 20) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query(
                `SELECT g.PID, u.UserName,
                        SUM(g.Score) AS TotalScore, SUM(g.KillCount) AS TotalKills,
                        COUNT(*) AS TotalGames, SUM(g.IsCleared) AS TotalClears
                 FROM GameRecord g JOIN GameUserData u ON g.PID=u.PID
                 GROUP BY g.PID, u.UserName ORDER BY TotalScore DESC LIMIT ?`,
                [limit]
            );
            return rows;
        },
        async () => {
            // Mongo 폴백: aggregate
            return MongoGameRecord.aggregate([
      {
        $lookup: {
          from: "gameuserdatas",
          localField: "PID",
          foreignField: "PID",
          as: "user_info"
        }
      },
      {
        $unwind: "$user_info"
      },
      {
        $group: {
          _id: {
            PID: "$PID",
            UserName: "$user_info.UserName"
          },
          TotalScore: { $sum: "$Score" },
          TotalKills: { $sum: "$KillCount" },
          TotalGames: { $sum: 1 },
          TotalClears: { $sum: { $cond: [ { $eq: ["$IsCleared", true] }, 1, 0 ]  } }
        }
      },
      {
        $project: {
          _id: 0,
          PID: "$_id.PID",
          UserName: "$_id.UserName",
          TotalScore: 1,
          TotalKills: 1,
          TotalGames: 1,
          TotalClears: 1
        }
      },
      {
        $sort: { TotalScore: -1 } // 내림차수로수정
      }
    ]);
});
}

// ═══════════════════════════════════════════════════
//  채팅
// ═══════════════════════════════════════════════════

async function saveChat(PID, ChatDesc) {
    return await dualWrite(
        async () => {
            const [r] = await pool.query(
                "INSERT INTO Chat (PID, ChatDesc) VALUES (?,?)", [PID, ChatDesc]
            );
            return { CID: r.insertId, PID, ChatDesc };
        },
        async () => MongoChat.create({ PID, ChatDesc })
    );
}

async function getRecentChats(limit = 50) {
    return await dualRead(
        async () => {
            const [rows] = await pool.query(
                `SELECT c.PID, u.UserName, c.ChatDesc, c.createdAt
                 FROM Chat c
                 LEFT JOIN GameUserData u ON c.PID = u.PID
                 ORDER BY c.createdAt DESC LIMIT ?`, [limit]
            );
            return rows;
        },
        async () => {
            const chats = await MongoChat.find({}).sort({ createdAt: -1 }).limit(limit).lean();
            // Mongo 폴백: PID 목록으로 UserName 일괄 조회
            const pids = [...new Set(chats.map(c => c.PID))];
            const users = await MongoUserData.find({ PID: { $in: pids } }).lean();
            const nameMap = Object.fromEntries(users.map(u => [u.PID, u.UserName]));
            return chats.map(c => ({ ...c, UserName: nameMap[c.PID] ?? `PID${c.PID}` }));
        }
    );
}

// ═══════════════════════════════════════════════════
//  서버 목록
// ═══════════════════════════════════════════════════

async function getServerList() {
    return await dualRead(
        async () => { const [r] = await pool.query("SELECT * FROM ServerList"); return r; },
        async () => MongoServerList.find({}).lean()
    );
}

async function createServer(SID, ByPID, isPrivate, PrivatePW) {
    return await dualWrite(
        async () => {
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                await conn.query(
                    `INSERT INTO ServerList (SID,ByPID,PID,Private,PrivatePW) VALUES (?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE ByPID=?,PID=?`,
                    [SID, ByPID, ByPID, isPrivate?1:0, PrivatePW||"", ByPID, ByPID]
                );
                await conn.query(
                    "INSERT INTO Servers (PID,SID) VALUES (?,?) ON DUPLICATE KEY UPDATE PID=?",
                    [ByPID, SID, ByPID]
                );
                await conn.commit();
            } catch(e) { await conn.rollback(); throw e; }
            finally { conn.release(); }
        },
        async () => {
            await MongoServerList.findOneAndUpdate(
                { SID }, { SID, ByPID, PID: ByPID, Private: isPrivate, PrivatePW: PrivatePW||"" },
                { upsert: true }
            );
            await MongoServers.findOneAndUpdate({ SID }, { PID: ByPID, SID }, { upsert: true });
        }
    );
}

async function joinServer(SID, PID) {
    return await dualWrite(
        async () => pool.query("INSERT IGNORE INTO ServerPlayers (SID,PID) VALUES (?,?)", [SID,PID]),
        async () => { const e = await ServerPlayer.findOne({SID,PID}); if(!e) await ServerPlayer.create({SID,PID}); }
    );
}

async function leaveServer(SID, PID) {
    return await dualWrite(
        async () => pool.query("DELETE FROM ServerPlayers WHERE SID=? AND PID=?", [SID,PID]),
        async () => ServerPlayer.deleteOne({SID,PID})
    );
}

async function getServerPlayers(SID) {
    return await dualRead(
        async () => { const [r] = await pool.query("SELECT PID FROM ServerPlayers WHERE SID=?", [SID]); return r; },
        async () => ServerPlayer.find({SID}).lean()
    );
}

async function getServerEntities(SID) {
    return await dualRead(
        async () => { const [r] = await pool.query("SELECT * FROM ServerEntities WHERE SID=?", [SID]); return r; },
        async () => ServerEntity.find({SID}).lean()
    );
}

async function upsertEntity(SID, EID, data) {
    return await dualWrite(
        async () => pool.query(
            `INSERT INTO ServerEntities (SID,EID,X,Y,DM,HP) VALUES (?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE X=?,Y=?,DM=?,HP=?`,
            [SID,EID,data.X||0,data.Y||0,data.DM||0,data.HP||0,
                     data.X||0,data.Y||0,data.DM||0,data.HP||0]
        ),
        async () => ServerEntity.findOneAndUpdate(
            {SID,EID}, {...data,SID,EID}, {upsert:true,new:true}
        )
    );
}

async function updatePlayerState(PID, PX, PY, PDM, PHP) {
    return await dualWrite(
        async () => pool.query(
            `INSERT INTO Player (PID,PX,PY,PDM,PHP) VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE PX=?,PY=?,PDM=?,PHP=?`,
            [PID,PX,PY,PDM,PHP, PX,PY,PDM,PHP]
        ),
        async () => PlayerState.findOneAndUpdate(
            {PID}, {PX,PY,PDM,PHP}, {upsert:true,new:true}
        )
    );
}

// ═══════════════════════════════════════════════════
//  exports
// ═══════════════════════════════════════════════════

module.exports = {
    loginUser, registerUser, getUserData, getUserItems,
    saveSession, getSessionPID, deleteSession,
    saveGameRecord, getUserRecords, getLeaderboard,getLeaderboard_total,
    saveChat, getRecentChats,
    getServerList, createServer,
    joinServer, leaveServer, getServerPlayers,
    getServerEntities, upsertEntity,
    updatePlayerState
};
