const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'answers.json');

// =============================
// ミドルウェア
// =============================
app.use(cors());
app.use(express.json());

// =============================
// DB操作（JSONファイル）
// =============================
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// =============================
// APIエンドポイント
// =============================

// 全件取得
app.get('/answers', (req, res) => {
  const db = loadDB();
  res.json(db);
});

// 特定の問題の答えを取得
// GET /answers/:problemNum
app.get('/answers/:problemNum', (req, res) => {
  const db = loadDB();
  const answer = db[req.params.problemNum];
  if (answer) {
    res.json({ found: true, answer });
  } else {
    res.json({ found: false });
  }
});

// 答えを保存
// POST /answers  body: { problemNum, answer }
app.post('/answers', (req, res) => {
  const { problemNum, answer } = req.body;
  if (!problemNum || !answer) {
    return res.status(400).json({ error: 'problemNum と answer は必須です' });
  }
  const db = loadDB();
  db[problemNum] = answer;
  saveDB(db);
  console.log(`[DB] 保存: 問題${problemNum} → ${answer}`);
  res.json({ success: true });
});

// DB全体の件数確認
app.get('/stats', (req, res) => {
  const db = loadDB();
  res.json({ total: Object.keys(db).length });
});

// =============================
// サーバー起動
// =============================
app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});