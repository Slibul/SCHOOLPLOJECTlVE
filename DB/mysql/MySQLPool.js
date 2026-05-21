const mysql = require("mysql2/promise");

// 커넥션 풀 - 매 요청마다 연결/해제하지 않고 재사용
const pool = mysql.createPool({
    host:     process.env.MYSQL_HOST     || "localhost",
    port:     process.env.MYSQL_PORT     || 3306,
    user:     process.env.MYSQL_USER     || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "GameData",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log("[MySQL] 연결 성공");
        conn.release();
    })
    .catch(err => {
        console.error("[MySQL] 연결 실패:", err.message);
    });

module.exports = pool;
