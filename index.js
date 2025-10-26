const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname))); // index.html 등 정적 제공

// /api/add-entry 요청을 api/add-entry.js로 위임
app.post('/api/add-entry', async (req, res) => {
    try {
        const handler = require('./api/add-entry');
        // add-entry.js가 (req, res) 사용하는 형태면 그대로 전달
        const result = await handler(req, res);
        if (!res.headersSent) res.json(result || { ok: true });
    } catch (err) {
        console.error('서버 라우트 처리 중 오류:', err);
        res.status(500).json({ error: err.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));