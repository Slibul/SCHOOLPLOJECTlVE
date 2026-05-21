const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// LoginData
// ─────────────────────────────────────────────
const LoginDataSchema = new mongoose.Schema({
    PID:      { type: Number, required: true, unique: true },
    StringID: { type: String, required: true, unique: true, maxlength: 126 },
    PW:       { type: String, required: true, maxlength: 90 }
});

// ─────────────────────────────────────────────
// GameUserData
// ─────────────────────────────────────────────
const GameUserDataSchema = new mongoose.Schema({
    PID:        { type: Number, required: true, unique: true },
    UserName:   { type: String, required: true, maxlength: 90 },
    Money:      { type: Number, default: 0 },
    Cash:       { type: Number, default: 0 },
    createtime: { type: Date,   default: Date.now }
});

// ─────────────────────────────────────────────
// UserItemData
// ─────────────────────────────────────────────
const UserItemDataSchema = new mongoose.Schema({
    PID:       { type: Number, required: true },
    ItemID:    { type: Number, required: true },
    ItemCount: { type: Number, default: 0 }
});
UserItemDataSchema.index({ PID: 1, ItemID: 1 }, { unique: true });

// ─────────────────────────────────────────────
// UserSession
// ─────────────────────────────────────────────
const UserSessionSchema = new mongoose.Schema({
    PID:         { type: Number, required: true, unique: true },
    Session_Key: { type: String, required: true, maxlength: 126 }
});

// ─────────────────────────────────────────────
// GameRecord
// ─────────────────────────────────────────────
const GameRecordSchema = new mongoose.Schema({
    PID:        { type: Number, required: true },
    StageName:  { type: String, default: '', maxlength: 64 },
    KillCount:  { type: Number, default: 0 },
    PlayTime:   { type: Number, default: 0 },
    IsCleared:  { type: Boolean, default: false },
    RemainHP:   { type: Number, default: 0 },
    Score:      { type: Number, default: 0 },
    RecordedAt: { type: Date, default: Date.now }
});
GameRecordSchema.index({ PID: 1 });

// ─────────────────────────────────────────────
// ServerList
// ─────────────────────────────────────────────
const ServerListSchema = new mongoose.Schema({
    SID:       { type: Number, required: true, unique: true },
    ByPID:     { type: Number },
    PID:       { type: Number },
    PrivateID: { type: Number },
    Private:   { type: Boolean, default: false },
    PrivatePW: { type: String, default: "" }
});

// ─────────────────────────────────────────────
// Servers
// ─────────────────────────────────────────────
const ServersSchema = new mongoose.Schema({
    PID: { type: Number, required: true },
    SID: { type: Number, required: true, unique: true }
});

// ─────────────────────────────────────────────
// ServerEntity
// ─────────────────────────────────────────────
const ServerEntitySchema = new mongoose.Schema({
    SID: { type: Number, required: true },
    EID: { type: Number },
    X:   { type: Number, default: 0 },
    Y:   { type: Number, default: 0 },
    DM:  { type: Number, default: 0 },
    HP:  { type: Number, default: 0 }
});
ServerEntitySchema.index({ SID: 1, EID: 1 }, { unique: true });

// ─────────────────────────────────────────────
// ServerPlayer
// ─────────────────────────────────────────────
const ServerPlayerSchema = new mongoose.Schema({
    SID: { type: Number, required: true },
    PID: { type: Number, required: true }
});
ServerPlayerSchema.index({ SID: 1, PID: 1 }, { unique: true });

// ─────────────────────────────────────────────
// PlayerState
// ─────────────────────────────────────────────
const PlayerSchema = new mongoose.Schema({
    PID: { type: Number, required: true, unique: true },
    PX:  { type: Number, default: 0 },
    PY:  { type: Number, default: 0 },
    PDM: { type: Number, default: 0 },
    PHP: { type: Number, default: 100 }
});

// ─────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────
const ChatSchema = new mongoose.Schema({
    PID:       { type: Number, required: true },
    ChatDesc:  { type: String, maxlength: 100 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    MongoLoginData:   mongoose.model("LoginData",    LoginDataSchema),
    MongoUserData:    mongoose.model("GameUserData", GameUserDataSchema),
    MongoUserItem:    mongoose.model("UserItemData", UserItemDataSchema),
    MongoSession:     mongoose.model("UserSession",  UserSessionSchema),
    MongoGameRecord:  mongoose.model("GameRecord",   GameRecordSchema),
    ServerList:       mongoose.model("ServerList",   ServerListSchema),
    Servers:          mongoose.model("Servers",      ServersSchema),
    ServerEntity:     mongoose.model("ServerEntity", ServerEntitySchema),
    ServerPlayer:     mongoose.model("ServerPlayer", ServerPlayerSchema),
    PlayerState:      mongoose.model("PlayerState",  PlayerSchema),
    Chat:             mongoose.model("Chat",         ChatSchema)
};
