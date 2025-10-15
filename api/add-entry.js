// ⚠️ 이 코드는 Vercel 서버에서 실행되어야 합니다. (POST: 기록 추가, GET: 기록 조회)

const { Client } = require('@notionhq/client');

// 서버리스 함수의 기본 핸들러
module.exports = async (req, res) => {
    // CORS 헤더 설정 (Notion 임베드에서 API 호출 허용)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // pre-flight request (OPTIONS) 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // POST 또는 GET 요청이 아니면 거부
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const apiKey = req.body.apiKey || req.query.apiKey;
        const dbId = req.body.dbId || req.query.dbId;

        if (!apiKey || !dbId) {
            return res.status(400).json({ message: 'Missing required API Key or DB ID.' });
        }

        const notion = new Client({ auth: apiKey });
        const datePropName = 'Date'; // ⚠️ Notion DB의 날짜 속성 이름과 일치하는지 확인해주세요!

        // ===============================================
        // A. POST 요청: 기록 추가 (기존 기능)
        // ===============================================
        if (req.method === 'POST') {
            const { date } = req.body;
            if (!date) {
                return res.status(400).json({ message: 'Missing date for POST request.' });
            }

            const response = await notion.pages.create({
                parent: { database_id: dbId },
                properties: {
                    [datePropName]: { date: { start: date } },
                    '이름': { title: [{ text: { content: `${date} 기록` } }] }
                },
            });

            return res.status(200).json({ success: true, action: 'created', notionResponse: response });
        }

        // ===============================================
        // B. GET 요청: 월별 기록 조회 (새로운 기능)
        // ===============================================
        if (req.method === 'GET') {
            const { year, month } = req.query; // 클라이언트에서 'year'과 'month'를 받음
            if (!year || !month) {
                return res.status(400).json({ message: 'Missing year or month for GET request.' });
            }

            // 해당 월의 시작일과 다음 월의 시작일 계산
            const startOfMonth = `${year}-${month.padStart(2, '0')}-01T00:00:00.000+09:00`;
            let nextMonthDate = new Date(parseInt(year), parseInt(month), 1);
            if (parseInt(month) === 12) {
                nextMonthDate = new Date(parseInt(year) + 1, 0, 1);
            }
            const endOfMonth = nextMonthDate.toISOString().split('T')[0] + 'T00:00:00.000+09:00'; 
            
            // Notion 데이터베이스 쿼리
            const response = await notion.databases.query({
                database_id: dbId,
                filter: {
                    and: [
                        {
                            property: datePropName,
                            date: {
                                on_or_after: startOfMonth,
                            },
                        },
                        {
                            property: datePropName,
                            date: {
                                before: endOfMonth,
                            },
                        },
                    ],
                },
                sorts: [{ property: datePropName, direction: 'ascending' }],
            });

            // 결과에서 날짜만 추출 (YYYY-MM-DD 형식)
            const recordedDates = response.results
                .map(page => {
                    const dateProperty = page.properties[datePropName];
                    return dateProperty.date ? dateProperty.date.start.split('T')[0] : null;
                })
                .filter(date => date);

            return res.status(200).json({ success: true, action: 'fetched', recordedDates: recordedDates });
        }

    } catch (error) {
        console.error('Notion API 처리 중 오류 발생:', error);
        return res.status(500).json({ 
            message: 'Notion API 처리 중 오류가 발생했습니다. (키/권한/DB ID 확인 필요)', 
            error: error.message 
        });
    }
};
