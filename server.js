const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use(cors());
app.use(express.json());

// =============================
// Supabase API通信
// =============================
async function supabaseFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (method === 'DELETE' || (method === 'POST' && res.status === 204)) return { success: true };
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// =============================
// APIエンドポイント
// =============================

// 全件取得
app.get('/answers', async (req, res) => {
  const data = await supabaseFetch('/answers?select=problem_num,answer');
  const obj = {};
  data.forEach(row => { obj[row.problem_num] = row.answer; });
  res.json(obj);
});

// 特定の問題の答えを取得
app.get('/answers/:problemNum', async (req, res) => {
  const data = await supabaseFetch(`/answers?problem_num=eq.${req.params.problemNum}&select=answer`);
  if (data.length > 0) {
    res.json({ found: true, answer: data[0].answer });
  } else {
    res.json({ found: false });
  }
});

// 答えを保存（upsert）
app.post('/answers', async (req, res) => {
  const { problemNum, answer } = req.body;
  if (!problemNum || !answer) return res.status(400).json({ error: 'problemNum と answer は必須です' });
  await supabaseFetch('/answers', 'POST', { problem_num: problemNum, answer, updated_at: new Date().toISOString() });
  console.log(`[DB] 保存: 問題${problemNum} → ${answer}`);
  res.json({ success: true });
});

// 答えを削除
app.delete('/answers/:problemNum', async (req, res) => {
  await supabaseFetch(`/answers?problem_num=eq.${req.params.problemNum}`, 'DELETE');
  console.log(`[DB] 削除: 問題${req.params.problemNum}`);
  res.json({ success: true });
});

// 件数確認
app.get('/stats', async (req, res) => {
  const data = await supabaseFetch('/answers?select=problem_num');
  res.json({ total: data.length });
});

// =============================
// 管理画面
// =============================
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>リンガポルタ DB管理</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    input[type="text"] { padding: 6px; width: 300px; border: 1px solid #ccc; border-radius: 4px; }
    button { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-delete { background: #e53e3e; color: white; }
    table { width: 100%; border-collapse: collapse; background: white; margin-top: 20px; }
    th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
    th { background: #eee; }
    tr:hover { background: #f9f9f9; }
    #stats { margin-bottom: 10px; color: #666; }
  </style>
</head>
<body>
  <h1>🤖 リンガポルタ DB管理</h1>
  <div id="stats">読み込み中...</div>
  <input type="text" id="search" placeholder="問題番号または答えで検索..." oninput="filterTable()">
  <table>
    <thead><tr><th>問題番号</th><th>答え</th><th>操作</th></tr></thead>
    <tbody id="table-body"></tbody>
  </table>
  <script>
    let allData = {};
    async function loadData() {
      const res = await fetch('/answers');
      allData = await res.json();
      renderTable(allData);
      document.getElementById('stats').textContent = '合計: ' + Object.keys(allData).length + ' 件';
    }
    function renderTable(data) {
      const tbody = document.getElementById('table-body');
      tbody.innerHTML = '';
      Object.entries(data).sort((a,b) => a[0]-b[0]).forEach(([num, ans]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`<td>\${num}</td><td>\${ans}</td><td><button class="btn-delete" onclick="deleteAnswer('\${num}')">削除</button></td>\`;
        tbody.appendChild(tr);
      });
    }
    function filterTable() {
      const q = document.getElementById('search').value.toLowerCase();
      const filtered = Object.fromEntries(Object.entries(allData).filter(([k,v]) => k.includes(q) || v.toLowerCase().includes(q)));
      renderTable(filtered);
    }
    async function deleteAnswer(num) {
      if (!confirm(num + ' を削除しますか？')) return;
      await fetch('/answers/' + num, { method: 'DELETE' });
      delete allData[num];
      filterTable();
      document.getElementById('stats').textContent = '合計: ' + Object.keys(allData).length + ' 件';
    }
    loadData();
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});