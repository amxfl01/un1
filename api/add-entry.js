// ⚠️ 이 코드는 Vercel 서버에서 실행되어야 하며, Notion API 호출을 담당합니다.

const { Client } = require('@notionhq/client');

// 서버리스 함수의 기본 핸들러
module.exports = async (req, res) => {
    // CORS 헤더 설정 (Notion 임베드에서 API 호출 허용)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // pre-flight request (OPTIONS) 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // POST 요청이 아니면 거부
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // calendar.html에서 전송된 데이터 추출
        const { date, apiKey, dbId } = req.body;
        
        if (!date || !apiKey || !dbId) {
            return res.status(400).json({ message: 'Missing required parameters (date, apiKey, or dbId).' });
        }

        // Notion 클라이언트 초기화 (클라이언트에서 받은 키 사용)
        const notion = new new Client({ auth: apiKey });

        // Notion 데이터베이스에 페이지(항목) 추가
        const response = await notion.pages.create({
            parent: {
                database_id: dbId,
            },
            properties: {
                // '날짜' 속성 이름은 Notion DB의 실제 속성 이름과 일치해야 합니다.
                '날짜': { 
                    type: 'date',
                    date: {
                        start: date, // YYYY-MM-DD 형식
                    },
                },
                // '이름' (Primary Title) 속성에 기록된 날짜를 제목으로 설정
                '이름': {
                    title: [
                        {
                            text: {
                                content: `${date} - 캘린더 기록`,
                            },
                        },
                    ],
                },
            },
        });

        // 성공 응답 반환
        res.status(200).json({ success: true, notionResponse: response });

    } catch (error) {
        console.error('Notion API 호출 중 오류 발생:', error);
        res.status(500).json({ 
            message: 'Notion API 호출에 실패했습니다. (키/권한/DB ID 확인 필요)', 
            error: error.message 
        });
    }
};
