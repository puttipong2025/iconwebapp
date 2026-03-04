const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

exports.handler = async (event, context) => {
    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    
    try {
        await doc.loadInfo();
        const action = event.queryStringParameters.action;
        const body = event.body ? JSON.parse(event.body) : {};

        // --- 1. Login Logic ---
        if (action === 'login') {
            const sheet = doc.sheetsByName['name'];
            const rows = await sheet.getRows();
            const user = rows.find(r => String(r.get('Phone')).trim() === String(body.phone).trim());
            
            if (!user) return { statusCode: 404, body: JSON.stringify({ message: "ไม่พบเบอร์โทรศัพท์" }) };
            if (user.get('Status') !== "อนุมัติ") return { statusCode: 403, body: JSON.stringify({ message: "รออนุมัติ" }) };
            
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, id: user.get('ID'), name: user.get('Username'), role: user.get('Role') })
            };
        }

        // --- 2. Save Check-in (บันทึกงาน) ---
        if (action === 'saveData') {
            const sheet = doc.sheetsByName['data_check'];
            const nameSheet = doc.sheetsByName['name'];
            const nameRows = await nameSheet.getRows();
            const userRow = nameRows.find(r => String(r.get('ID')) === String(body.id));
            
            const wage = parseFloat(userRow.get('Wage')) || 0;
            const dayValue = (body.workType === "ช่วงเช้า" || body.workType === "ช่วงบ่าย") ? 0.5 : 1.0;
            
            await sheet.addRow({
                Timestamp: new Date().toISOString(),
                Date: body.date,
                ID: body.id,
                Name: body.name,
                WorkType: body.workType,
                Latitude: body.latitude,
                Longitude: body.longitude,
                Status: "ปกติ",
                EarnedAmount: dayValue * wage
            });
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        // --- 3. Get History (ดึงประวัติ) ---
        if (action === 'getData') {
            const sheet = doc.sheetsByName['data_check'];
            const rows = await sheet.getRows();
            const result = rows.map(r => r.toObject())
                             .filter(r => body.role === 'admin' || String(r.ID) === String(body.userId))
                             .reverse();
            return { statusCode: 200, body: JSON.stringify(result) };
        }

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};