const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");

const app = express();
const port = 3001;

// 👉 Tạo cấu hình multer để lưu file tạm thời trong thư mục "uploads"
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// 👉 Kết nối MySQL Workbench
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "son2102", // ← để trống nếu bạn không đặt mật khẩu
  database: "nghia_trang_db"
});

// Kiểm tra kết nối
db.connect(err => {
  if (err) {
    console.error("❌ Lỗi kết nối DB:", err);
  } else {
    console.log("✅ Đã kết nối database MySQL thành công!");
  }
});

// 📥 API: Upload file Excel và lưu vào DB
app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  let inserted = 0;
  let failed = 0;

  const insertNext = (i) => {
    if (i >= data.length) {
      fs.unlinkSync(filePath); // Xoá file sau khi xử lý xong
      return res.json({ message: '✅ Đã xử lý file Excel', inserted, total: data.length, failed });
    }

    const row = data[i];
    const {
      "Họ và tên": full_name,
      "Quê quán": hometown,
      "Đơn vị": unit,
      "Năm hi sinh": death_year,
      "Lý do hi sinh": reason,
      "Địa điểm hi sinh": death_location,
      "Nơi an táng": burial_place
    } = row;

    if (!full_name) {
      failed++;
      return insertNext(i + 1);
    }

    db.query(
      `INSERT INTO liet_si (full_name, hometown, unit, death_year, reason, death_location, burial_place)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, hometown, unit, death_year, reason, death_location, burial_place],
      (err) => {
        if (err) {
          console.error(`❌ Lỗi dòng ${i + 1}:`, err.message);
          failed++;
        } else {
          inserted++;
        }
        insertNext(i + 1);
      }
    );
  };

  insertNext(0);
});

// 🔍 API: Tìm kiếm theo tên
app.get('/search', (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "❗ Thiếu tên cần tìm" });

  db.query("SELECT * FROM liet_si WHERE full_name LIKE ?", [`%${name}%`], (err, results) => {
    if (err) return res.status(500).json({ error: '❌ Lỗi truy vấn DB', details: err.message });
    res.json(results);
  });
});

// 🚀 Khởi chạy server
app.listen(port, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});
