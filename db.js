// db.js
const sql = require('mssql');

const config = {
  user: 'sa',              // đổi thành user SQL của bạn
  password: '290204', // đổi thành mật khẩu
  server: 'localhost',     // đúng như trong SSMS
  database: 'BlogDB',      // đổi thành tên DB
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  requestTimeout: 30000,    // 30 giây
  connectionTimeout: 30000  // 30 giây
};

// Tạo connection pool dùng chung
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Đã kết nối SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối SQL Server', err);
    throw err;
  });

module.exports = {
  sql,
  poolPromise
};
