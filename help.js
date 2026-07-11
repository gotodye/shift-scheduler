/* 內建使用說明內容（四語）。要改版只改這個檔即可。
   每個區塊：{ icon: lucide 圖示名, t: 標題, items: [條列] } */
window.HELP = {
  zh: [
    { icon:'rocket', t:'快速上手', items:[
      '用公司授權的 Google 帳號登入（沒權限請找管理員開通）。',
      '上方切換「單位分頁」，左側欄（手機在底部）切換各功能頁。',
      '資料即時存雲端、多人同步，換裝置登入同帳號都看得到。' ] },
    { icon:'mouse-pointer-2', t:'排班（電腦）', items:[
      '在空白處按住拖曳 → 放開，建立一段班。',
      '拖整條 → 移動；拉左右兩端 → 改上／下班時間。',
      '點班別 → 視窗可改時間、切換上班／休假、或刪除。' ] },
    { icon:'smartphone', t:'排班（手機）', items:[
      '點時間軸空白處 → 彈窗設定起訖，或點範本一鍵帶入。',
      '點班別 → 同一個彈窗可編輯或刪除。' ] },
    { icon:'layout-template', t:'範本與快速鋪班', items:[
      '先點一個範本（如「早班 09:00–18:00」）。',
      '按「套用範本到全組」整組當天一次套上；或點各人左側 ⤵ 只套一人。',
      '「複製某日／複製上週」可快速沿用既有班表。' ] },
    { icon:'bed', t:'休假', items:[
      '點姓名旁的「休」→ 設整日休假（再按取消）。',
      '某時段不可上班：筆刷切「休假」拖出（手機用彈窗把類型選休假）。' ] },
    { icon:'download', t:'匯出打卡檔（阿波羅）', items:[
      '上方「匯出打卡檔」→ 預設當月，可改日期範圍。',
      '按「預覽」看即將寫入的每一筆 → 再按「確認匯出」下載上傳。',
      '超標工時不打卡，另收在「獎金報表」（管理員）。' ] },
    { icon:'bar-chart-3', t:'報表與工具', items:[
      '統計：工時 KPI、長條圖、跨月趨勢。',
      '比對：上傳阿波羅打卡紀錄，和排班逐筆對照。',
      '月班表：整月表格，可列印或匯出 Excel。',
      '獎金報表、編輯紀錄：管理員限定。' ] },
    { icon:'sparkles', t:'App 與小提醒', items:[
      '手機 Safari →「分享」→「加入主畫面」，即可全螢幕當 App 用。',
      '離線也能看上次資料，恢復連線會自動同步。',
      '清空當日／整月後，6 秒內可按「復原」還原。' ] },
  ],
  en: [
    { icon:'rocket', t:'Getting started', items:[
      'Sign in with your authorized company Google account (ask an admin for access).',
      'Switch unit tabs on top; switch feature pages from the left rail (bottom bar on mobile).',
      'Data syncs to the cloud in real time — same account, any device.' ] },
    { icon:'mouse-pointer-2', t:'Scheduling (desktop)', items:[
      'Drag on an empty area to create a shift.',
      'Drag the whole block to move it; drag either edge to change start/end.',
      'Click a shift to edit its time, switch work/off, or delete.' ] },
    { icon:'smartphone', t:'Scheduling (mobile)', items:[
      'Tap an empty cell to open a dialog — set start/end, or tap a template.',
      'Tap a shift to edit or delete it in the same dialog.' ] },
    { icon:'layout-template', t:'Templates & quick fill', items:[
      'Pick a template first (e.g. "Morning 09:00–18:00").',
      'Use "Apply to whole unit" for everyone that day, or the ⤵ next to a person for one.',
      '"Copy a day / Copy last week" reuse existing schedules fast.' ] },
    { icon:'bed', t:'Time off', items:[
      'Tap "Off" next to a name for a full-day off (tap again to cancel).',
      'For a partial block: switch the brush to "Off" and drag (mobile: pick "Off" type in the dialog).' ] },
    { icon:'download', t:'Export to Apollo', items:[
      'Top "Export" — defaults to the current month; adjust the range if needed.',
      'Tap "Preview" to see every row, then "Confirm export" to download and upload.',
      'Over-limit hours are not clocked; they go to the bonus report (admin).' ] },
    { icon:'bar-chart-3', t:'Reports & tools', items:[
      'Stats: hours KPIs, bar chart, cross-month trend.',
      'Compare: upload Apollo punch records and match against the schedule.',
      'Monthly roster: full-month table, printable or Excel export.',
      'Bonus report & edit log: admin only.' ] },
    { icon:'sparkles', t:'App & tips', items:[
      'iPhone Safari → Share → Add to Home Screen for a full-screen app.',
      'Works offline with the last loaded data; syncs automatically when back online.',
      'After clearing a day/month, tap "Undo" within 6 seconds to restore.' ] },
  ],
  vi: [
    { icon:'rocket', t:'Bắt đầu nhanh', items:[
      'Đăng nhập bằng tài khoản Google công ty được cấp quyền (liên hệ quản trị nếu chưa có).',
      'Chuyển tab đơn vị ở trên; chuyển trang chức năng ở thanh trái (thanh dưới trên điện thoại).',
      'Dữ liệu đồng bộ đám mây theo thời gian thực — cùng tài khoản, mọi thiết bị.' ] },
    { icon:'mouse-pointer-2', t:'Xếp ca (máy tính)', items:[
      'Kéo trên vùng trống để tạo một ca.',
      'Kéo cả khối để di chuyển; kéo hai đầu để đổi giờ vào/ra.',
      'Nhấp vào ca để sửa giờ, đổi làm/nghỉ, hoặc xoá.' ] },
    { icon:'smartphone', t:'Xếp ca (điện thoại)', items:[
      'Chạm ô trống để mở hộp thoại — đặt giờ, hoặc chạm mẫu.',
      'Chạm vào ca để sửa hoặc xoá trong cùng hộp thoại.' ] },
    { icon:'layout-template', t:'Mẫu & điền nhanh', items:[
      'Chọn một mẫu trước (vd "Sáng 09:00–18:00").',
      'Dùng "Áp cả đơn vị" cho mọi người hôm đó, hoặc ⤵ cạnh một người cho riêng họ.',
      '"Sao chép ngày / tuần trước" để tái sử dụng nhanh.' ] },
    { icon:'bed', t:'Nghỉ', items:[
      'Chạm "Nghỉ" cạnh tên để nghỉ cả ngày (chạm lại để huỷ).',
      'Nghỉ một đoạn: chuyển bút sang "Nghỉ" rồi kéo (điện thoại: chọn loại "Nghỉ" trong hộp thoại).' ] },
    { icon:'download', t:'Xuất cho Apollo', items:[
      '"Xuất" ở trên — mặc định tháng hiện tại; chỉnh khoảng nếu cần.',
      'Nhấn "Xem trước" để thấy từng dòng, rồi "Xác nhận xuất" để tải và tải lên.',
      'Giờ vượt mức không chấm công; vào báo cáo thưởng (quản trị).' ] },
    { icon:'bar-chart-3', t:'Báo cáo & công cụ', items:[
      'Thống kê: KPI giờ, biểu đồ, xu hướng nhiều tháng.',
      'Đối chiếu: tải bản ghi chấm công Apollo và so với lịch.',
      'Bảng tháng: bảng cả tháng, in hoặc xuất Excel.',
      'Báo cáo thưởng & nhật ký: chỉ quản trị.' ] },
    { icon:'sparkles', t:'Ứng dụng & mẹo', items:[
      'iPhone Safari → Chia sẻ → Thêm vào Màn hình chính để dùng toàn màn hình.',
      'Hoạt động ngoại tuyến với dữ liệu tải lần trước; tự đồng bộ khi có mạng.',
      'Sau khi xoá ngày/tháng, nhấn "Hoàn tác" trong 6 giây để khôi phục.' ] },
  ],
  th: [
    { icon:'rocket', t:'เริ่มต้นใช้งาน', items:[
      'เข้าสู่ระบบด้วยบัญชี Google บริษัทที่ได้รับสิทธิ์ (ติดต่อผู้ดูแลหากยังไม่มี).',
      'สลับแท็บหน่วยด้านบน; สลับหน้าฟังก์ชันที่แถบซ้าย (แถบล่างบนมือถือ).',
      'ข้อมูลซิงก์คลาวด์แบบเรียลไทม์ — บัญชีเดียวใช้ได้ทุกอุปกรณ์.' ] },
    { icon:'mouse-pointer-2', t:'จัดเวร (คอมพิวเตอร์)', items:[
      'ลากบนพื้นที่ว่างเพื่อสร้างกะ.',
      'ลากทั้งแท่งเพื่อย้าย; ลากปลายทั้งสองเพื่อเปลี่ยนเวลาเข้า/ออก.',
      'แตะกะเพื่อแก้เวลา สลับทำงาน/หยุด หรือลบ.' ] },
    { icon:'smartphone', t:'จัดเวร (มือถือ)', items:[
      'แตะช่องว่างเพื่อเปิดหน้าต่าง — ตั้งเวลา หรือแตะแม่แบบ.',
      'แตะกะเพื่อแก้ไขหรือลบในหน้าต่างเดียวกัน.' ] },
    { icon:'layout-template', t:'แม่แบบ & เติมด่วน', items:[
      'เลือกแม่แบบก่อน (เช่น "เช้า 09:00–18:00").',
      'ใช้ "ใช้ทั้งหน่วย" กับทุกคนในวันนั้น หรือ ⤵ ข้างชื่อสำหรับคนเดียว.',
      '"คัดลอกวัน / สัปดาห์ก่อน" นำกลับมาใช้ได้เร็ว.' ] },
    { icon:'bed', t:'วันหยุด', items:[
      'แตะ "หยุด" ข้างชื่อเพื่อหยุดทั้งวัน (แตะอีกครั้งเพื่อยกเลิก).',
      'หยุดบางช่วง: สลับพู่กันเป็น "หยุด" แล้วลาก (มือถือ: เลือกชนิด "หยุด" ในหน้าต่าง).' ] },
    { icon:'download', t:'ส่งออกไป Apollo', items:[
      '"ส่งออก" ด้านบน — ค่าเริ่มต้นเดือนปัจจุบัน; ปรับช่วงได้.',
      'กด "ดูตัวอย่าง" เพื่อดูทุกแถว แล้ว "ยืนยันการส่งออก" เพื่อดาวน์โหลดและอัปโหลด.',
      'ชั่วโมงที่เกินไม่ลงเวลา จะไปที่รายงานโบนัส (ผู้ดูแล).' ] },
    { icon:'bar-chart-3', t:'รายงาน & เครื่องมือ', items:[
      'สถิติ: KPI ชั่วโมง กราฟแท่ง แนวโน้มหลายเดือน.',
      'เทียบ: อัปโหลดบันทึกลงเวลา Apollo แล้วเทียบกับตาราง.',
      'ตารางเดือน: ตารางทั้งเดือน พิมพ์หรือส่งออก Excel.',
      'รายงานโบนัส & บันทึกแก้ไข: เฉพาะผู้ดูแล.' ] },
    { icon:'sparkles', t:'แอป & เคล็ดลับ', items:[
      'iPhone Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม เพื่อใช้แบบเต็มจอ.',
      'ใช้งานออฟไลน์ด้วยข้อมูลที่โหลดล่าสุด; ซิงก์อัตโนมัติเมื่อกลับมาออนไลน์.',
      'หลังล้างวัน/เดือน กด "เลิกทำ" ภายใน 6 วินาทีเพื่อกู้คืน.' ] },
  ],
};
