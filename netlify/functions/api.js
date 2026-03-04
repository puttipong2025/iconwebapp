const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

exports.handler = async (event, context) => {
  try {
    // 1. ตั้งค่าการยืนยันตัวตนด้วย Service Account
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, // อีเมลจาก Google Cloud Console
      // สำคัญมาก: ต้องจัดการเรื่อง \n ของ Private Key ให้ถูกต้องเพื่อให้ Google ยอมรับ
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 2. เชื่อมต่อกับ Spreadsheet โดยใช้ ID ที่ตั้งไว้ใน Environment Variable
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    
    // โหลดข้อมูลพื้นฐานของไฟล์
    await doc.loadInfo(); 
    
    // 3. เลือก Sheet แรก (index 0)
    const sheet = doc.sheetsByIndex[0]; 
    
    // ดึงข้อมูลแถวทั้งหมด (Rows)
    const rows = await sheet.getRows();
    
    // แปลงข้อมูลแถวให้อยู่ในรูปแบบ Object (JSON) เพื่อให้ง่ายต่อการนำไปใช้งานหน้าเว็บ
    const data = rows.map(row => row.toObject());

    // 4. ส่งผลลัพธ์กลับไปหาหน้าเว็บ
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // อนุญาตให้ดึงข้อมูลข้าม Domain ได้
      },
      body: JSON.stringify({
        success: true,
        sheetTitle: doc.title,
        updatedAt: new Date().toLocaleString('th-TH'),
        data: data
      }),
    };

  } catch (error) {
    // กรณีเกิดข้อผิดพลาด ให้ส่งรายละเอียด Error กลับไปตรวจสอบ
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
    };
  }
};