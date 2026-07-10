'use strict';
/* 多語系：中文 zh / 英文 en / 越南文 vi / 泰文 th。先於 app.js 載入。 */

const I18N = {
  zh: {
    app_title:'排班系統', lang_label:'語言',
    today:'今天', compare_upload:'上傳打卡比對', export:'匯出打卡檔', users:'使用者', signout:'登出',
    prev_day:'前一天', next_day:'後一天',
    tpl_label:'班別範本', manage_tpl:'管理範本', brush:'筆刷', work:'上班', off:'休假',
    apply_all:'套用範本到全組', copy_day:'複製某日', add_person:'＋ 新增人員', clear_day:'清空當日',
    legend_drag:'拖拉空白＝建立班別', legend_move:'拖曳整條＝調動時段', legend_resize:'拉兩端＝改上下班',
    legend_edit:'點區塊＝編輯/刪除/改類型', legend_brushoff:'筆刷休假＝拖出某時段休假',
    legend_full:'休＝整日休假', legend_month:'點姓名 / 月＝整月排班',
    mv_back:'← 返回日檢視', edit_person:'編輯人員', prev_month:'上個月', next_month:'下個月',
    apply_every:'套用到整月每天', apply_weekday:'只套用平日（一~五）', weekend_leave:'週末設休假', clear_month:'清空整月',
    mv_hint:'操作與日檢視相同：拖拉建立、拖曳整條調動、拉兩端改長短、點區塊編輯／刪除、「休」整日休假。',
    cmp_back:'← 返回', cmp_title:'打卡比對結果', cmp_grace:'容許誤差(分)', cmp_only:'只看異常', cmp_export:'匯出差異清單',
    th_date:'日期', th_emp:'工號', th_name:'姓名', th_unit:'單位', th_sched:'排班', th_actual:'實際打卡', th_verdict:'判定',
    cmp_count:'共 {n} 筆', cmp_ok:'正常', cmp_bad:'異常', cmp_warn:'待確認', cmp_none:'沒有符合的資料',
    st_normal:'正常', st_late:'遲到 {n} 分', st_early_in:'提早上班 {n} 分', st_early_out:'早退 {n} 分', st_late_out:'延後下班 {n} 分',
    st_nopunch:'未打卡', st_leavework:'休假日出勤', st_unsched:'未排班出勤（加班？）', st_unknown:'系統查無此工號', st_fulloff:'整日休假',
    pm_add:'新增人員', pm_edit:'編輯人員', empno:'工號', name:'姓名', cancel:'取消', save:'儲存', delete_person:'刪除人員',
    empno_ph:'例：A12345', name_ph:'例：王小明',
    pm_err_required:'工號與姓名皆為必填。', pm_err_dup:'此工號已存在於本單位。', pm_confirm_del:'確定刪除「{name}」？此人所有班表也會移除。',
    seg_title:'編輯區塊', type:'類型', opt_work:'上班', opt_off:'休假 / 不可上班', start:'開始', end:'結束', delete_seg:'刪除此段',
    seg_err:'結束時間需晚於開始時間。',
    tpl_title:'班別範本', tpl_name_ph:'名稱，如「早班」', add:'新增', done:'完成', delete:'刪除',
    tpl_err_name:'請輸入範本名稱', tpl_err_time:'下班需晚於上班',
    copy_title:'複製某日班表', copy_desc:'把來源日期整組班表，覆蓋到目前選定的日期。', src_date:'來源日期',
    copy_all_units:'套用到全部單位（否則只複製目前單位）', copy:'複製',
    copy_err_src:'請選擇來源日期。', copy_err_same:'來源與目標是同一天。',
    exp_title:'匯出阿波羅打卡檔', from_date:'起始日期', to_date:'結束日期', exp_all_units:'匯出全部單位（否則只匯出目前單位）',
    exp_rule:'規則：有排班→上班(W0001)+時段；中間空檔自動轉成休息時間；標記休假者→休假日(H0001)；沒排也沒標休假者不輸出。',
    gen_excel:'產生 Excel',
    exp_err_dates:'請選擇起訖日期。', exp_err_order:'結束日期不能早於起始日期。', exp_err_empty:'這個範圍沒有可匯出的班表。',
    exp_warn_break:'{name}（{date}）休息時段超過 3 組，阿波羅最多 3 組。', exp_done_warn:'已匯出，但請注意：',
    xlsx_missing:'Excel 元件未載入（需連線）。',
    um_title:'使用者管理', um_email:'新增 / 更新使用者 Email', um_admin:'設為管理員（可管理所有單位與使用者）',
    um_units_hint:'或勾選可編輯的單位：', um_add:'新增 / 更新', um_all:'（全部）', um_none:'（未指派）', um_admin_label:'管理員',
    um_remove:'移除', um_err_email:'請輸入正確的 Email。', um_err_units:'請至少勾選一個單位，或設為管理員。',
    um_confirm_remove:'移除使用者 {email}？', um_no_self:'不能移除自己。', um_save_fail:'儲存使用者失敗：',
    loading:'載入中…', login_hint:'請使用公司授權的 Google 帳號登入。', login_btn:'使用 Google 登入',
    noaccess_title:'沒有存取權限', noaccess_desc:'你的帳號 {email} 尚未被授權，請聯絡管理員開通。', switch_account:'換帳號登入',
    login_fail:'登入失敗：', access_fail:'讀取權限失敗：', save_person_fail:'儲存人員失敗：',
    empty_no_people:'這個單位還沒有人員，點下方「新增人員」開始。', no_units:'尚未指派可編輯的單位，請聯絡管理員。',
    leave_bar:'無法上班（休假）', full_off_label:'休假（整日）', off_prefix:'休', off_short:'休', month_btn:'月',
    title_apply_tpl:'套用選取的範本', title_apply_day:'套用範本到這天', title_month:'進入整月排班',
    title_full_leave:'整日休假（再按取消）', title_edit_person:'點姓名 → 進入整月排班',
    brush_hint:'已選範本「{name} {start}–{end}」：點各列左側 ⤵ 套用給該人，或按上方「套用範本到全組」。再點一次範本可取消。',
    clear_confirm:'確定清空「{unit}」在 {date} 的所有班表？', clear_month_confirm:'確定清空這個人整個月的班表？',
    admin_paren:'（管理員）',
    unit_ID:'印尼', unit_VN:'越南', unit_TH:'泰國', unit_PH:'菲律賓', unit_KYC:'客戶審查',
    dow:['日','一','二','三','四','五','六'],
  },
  en: {
    app_title:'Shift Scheduler', lang_label:'Language',
    today:'Today', compare_upload:'Compare punches', export:'Export', users:'Users', signout:'Sign out',
    prev_day:'Previous day', next_day:'Next day',
    tpl_label:'Templates', manage_tpl:'Manage', brush:'Brush', work:'Work', off:'Leave',
    apply_all:'Apply to all', copy_day:'Copy a day', add_person:'+ Add person', clear_day:'Clear day',
    legend_drag:'Drag empty = new shift', legend_move:'Drag bar = move', legend_resize:'Drag ends = resize',
    legend_edit:'Click block = edit/delete/type', legend_brushoff:'Leave brush = drag a leave range',
    legend_full:'休 = full-day leave', legend_month:'Name / M = month view',
    mv_back:'← Back to day view', edit_person:'Edit person', prev_month:'Previous month', next_month:'Next month',
    apply_every:'Apply to every day', apply_weekday:'Weekdays only (Mon–Fri)', weekend_leave:'Weekend off', clear_month:'Clear month',
    mv_hint:'Same as day view: drag to create, drag the bar to move, drag ends to resize, click a block to edit/delete, 休 = full-day leave.',
    cmp_back:'← Back', cmp_title:'Punch comparison', cmp_grace:'Grace (min)', cmp_only:'Issues only', cmp_export:'Export list',
    th_date:'Date', th_emp:'ID', th_name:'Name', th_unit:'Unit', th_sched:'Scheduled', th_actual:'Actual', th_verdict:'Result',
    cmp_count:'{n} records', cmp_ok:'OK', cmp_bad:'Issue', cmp_warn:'Review', cmp_none:'No matching data',
    st_normal:'OK', st_late:'Late {n} min', st_early_in:'In {n} min early', st_early_out:'Out {n} min early', st_late_out:'Out {n} min late',
    st_nopunch:'No punch', st_leavework:'Worked on leave', st_unsched:'Unscheduled (OT?)', st_unknown:'Unknown ID', st_fulloff:'Full-day leave',
    pm_add:'Add person', pm_edit:'Edit person', empno:'Employee ID', name:'Name', cancel:'Cancel', save:'Save', delete_person:'Delete person',
    empno_ph:'e.g. A12345', name_ph:'e.g. John',
    pm_err_required:'ID and name are required.', pm_err_dup:'This ID already exists in this unit.', pm_confirm_del:'Delete "{name}"? All their shifts will also be removed.',
    seg_title:'Edit block', type:'Type', opt_work:'Work', opt_off:'Leave / Unavailable', start:'Start', end:'End', delete_seg:'Delete',
    seg_err:'End must be later than start.',
    tpl_title:'Shift templates', tpl_name_ph:'Name, e.g. Morning', add:'Add', done:'Done', delete:'Delete',
    tpl_err_name:'Please enter a name', tpl_err_time:'End must be after start',
    copy_title:'Copy a day', copy_desc:"Copy the source day's whole schedule onto the current day.", src_date:'Source date',
    copy_all_units:'All units (else current unit only)', copy:'Copy',
    copy_err_src:'Please choose a source date.', copy_err_same:'Source and target are the same day.',
    exp_title:'Export (Apollo)', from_date:'From', to_date:'To', exp_all_units:'All units (else current unit only)',
    exp_rule:'Rules: scheduled → Work (W0001) + times; gaps become break time; full-day leave → Leave (H0001); no shift and no leave → not exported.',
    gen_excel:'Generate Excel',
    exp_err_dates:'Please choose the date range.', exp_err_order:'End date cannot be before start date.', exp_err_empty:'No schedule to export in this range.',
    exp_warn_break:'{name} ({date}) has more than 3 break periods; Apollo allows max 3.', exp_done_warn:'Exported, but note:',
    xlsx_missing:'Excel component not loaded (needs internet).',
    um_title:'User management', um_email:'Add / update user email', um_admin:'Make admin (manage all units and users)',
    um_units_hint:'Or pick editable units:', um_add:'Add / update', um_all:'(all)', um_none:'(none)', um_admin_label:'Admin',
    um_remove:'Remove', um_err_email:'Please enter a valid email.', um_err_units:'Pick at least one unit, or set as admin.',
    um_confirm_remove:'Remove user {email}?', um_no_self:'You cannot remove yourself.', um_save_fail:'Failed to save user: ',
    loading:'Loading…', login_hint:'Please sign in with your authorized Google account.', login_btn:'Sign in with Google',
    noaccess_title:'No access', noaccess_desc:'Your account {email} is not authorized yet. Please contact the administrator.', switch_account:'Switch account',
    login_fail:'Sign-in failed: ', access_fail:'Failed to load permissions: ', save_person_fail:'Failed to save person: ',
    empty_no_people:'No people in this unit yet. Click "Add person" below.', no_units:'No editable units assigned. Please contact the administrator.',
    leave_bar:'Unavailable (leave)', full_off_label:'Leave (all day)', off_prefix:'Off', off_short:'L', month_btn:'M',
    title_apply_tpl:'Apply selected template', title_apply_day:'Apply template to this day', title_month:'Open month view',
    title_full_leave:'Full-day leave (click again to undo)', title_edit_person:'Click name → month view',
    brush_hint:'Template "{name} {start}–{end}" selected: click ⤵ on a row to apply, or "Apply to all" above. Click the template again to deselect.',
    clear_confirm:'Clear all shifts for "{unit}" on {date}?', clear_month_confirm:"Clear this person's whole month?",
    admin_paren:' (admin)',
    unit_ID:'Indonesia', unit_VN:'Vietnam', unit_TH:'Thailand', unit_PH:'Philippines', unit_KYC:'Customer review',
    dow:['Su','Mo','Tu','We','Th','Fr','Sa'],
  },
  vi: {
    app_title:'Lịch làm việc', lang_label:'Ngôn ngữ',
    today:'Hôm nay', compare_upload:'Đối chiếu chấm công', export:'Xuất tệp', users:'Người dùng', signout:'Đăng xuất',
    prev_day:'Ngày trước', next_day:'Ngày sau',
    tpl_label:'Mẫu ca', manage_tpl:'Quản lý mẫu', brush:'Bút', work:'Làm việc', off:'Nghỉ',
    apply_all:'Áp dụng cả nhóm', copy_day:'Sao chép ngày', add_person:'+ Thêm người', clear_day:'Xóa ngày',
    legend_drag:'Kéo ô trống = tạo ca', legend_move:'Kéo cả thanh = di chuyển', legend_resize:'Kéo hai đầu = đổi giờ',
    legend_edit:'Nhấp khối = sửa/xóa/loại', legend_brushoff:'Bút nghỉ = kéo khoảng nghỉ',
    legend_full:'休 = nghỉ cả ngày', legend_month:'Tên / M = xem cả tháng',
    mv_back:'← Về xem ngày', edit_person:'Sửa người', prev_month:'Tháng trước', next_month:'Tháng sau',
    apply_every:'Áp dụng mỗi ngày', apply_weekday:'Chỉ ngày thường (T2–T6)', weekend_leave:'Cuối tuần nghỉ', clear_month:'Xóa cả tháng',
    mv_hint:'Giống xem ngày: kéo để tạo, kéo thanh để di chuyển, kéo hai đầu để chỉnh, nhấp khối để sửa/xóa, 休 = nghỉ cả ngày.',
    cmp_back:'← Quay lại', cmp_title:'Kết quả đối chiếu chấm công', cmp_grace:'Dung sai (phút)', cmp_only:'Chỉ bất thường', cmp_export:'Xuất danh sách',
    th_date:'Ngày', th_emp:'Mã NV', th_name:'Tên', th_unit:'Đơn vị', th_sched:'Lịch', th_actual:'Thực tế', th_verdict:'Kết quả',
    cmp_count:'{n} bản ghi', cmp_ok:'Bình thường', cmp_bad:'Bất thường', cmp_warn:'Cần xem', cmp_none:'Không có dữ liệu phù hợp',
    st_normal:'Bình thường', st_late:'Trễ {n} phút', st_early_in:'Vào sớm {n} phút', st_early_out:'Về sớm {n} phút', st_late_out:'Về muộn {n} phút',
    st_nopunch:'Chưa chấm công', st_leavework:'Đi làm ngày nghỉ', st_unsched:'Không xếp lịch (tăng ca?)', st_unknown:'Không tìm thấy mã', st_fulloff:'Nghỉ cả ngày',
    pm_add:'Thêm người', pm_edit:'Sửa người', empno:'Mã nhân viên', name:'Tên', cancel:'Hủy', save:'Lưu', delete_person:'Xóa người',
    empno_ph:'VD: A12345', name_ph:'VD: Nguyễn Văn A',
    pm_err_required:'Mã và tên là bắt buộc.', pm_err_dup:'Mã này đã tồn tại trong đơn vị.', pm_confirm_del:'Xóa "{name}"? Toàn bộ ca của người này cũng bị xóa.',
    seg_title:'Sửa khối', type:'Loại', opt_work:'Làm việc', opt_off:'Nghỉ / Không làm', start:'Bắt đầu', end:'Kết thúc', delete_seg:'Xóa',
    seg_err:'Giờ kết thúc phải sau giờ bắt đầu.',
    tpl_title:'Mẫu ca', tpl_name_ph:'Tên, vd Ca sáng', add:'Thêm', done:'Xong', delete:'Xóa',
    tpl_err_name:'Vui lòng nhập tên mẫu', tpl_err_time:'Giờ tan phải sau giờ vào',
    copy_title:'Sao chép lịch một ngày', copy_desc:'Sao chép toàn bộ lịch của ngày nguồn sang ngày hiện tại.', src_date:'Ngày nguồn',
    copy_all_units:'Tất cả đơn vị (nếu không chỉ đơn vị hiện tại)', copy:'Sao chép',
    copy_err_src:'Vui lòng chọn ngày nguồn.', copy_err_same:'Ngày nguồn và đích trùng nhau.',
    exp_title:'Xuất tệp chấm công (Apollo)', from_date:'Từ ngày', to_date:'Đến ngày', exp_all_units:'Tất cả đơn vị (nếu không chỉ đơn vị hiện tại)',
    exp_rule:'Quy tắc: có ca → Làm việc (W0001) + giờ; khoảng trống thành giờ nghỉ; nghỉ cả ngày → Nghỉ (H0001); không ca và không nghỉ → không xuất.',
    gen_excel:'Tạo Excel',
    exp_err_dates:'Vui lòng chọn khoảng ngày.', exp_err_order:'Ngày kết thúc không thể trước ngày bắt đầu.', exp_err_empty:'Không có lịch để xuất trong khoảng này.',
    exp_warn_break:'{name} ({date}) có hơn 3 khoảng nghỉ; Apollo tối đa 3.', exp_done_warn:'Đã xuất, nhưng lưu ý:',
    xlsx_missing:'Chưa tải thành phần Excel (cần mạng).',
    um_title:'Quản lý người dùng', um_email:'Thêm / cập nhật email người dùng', um_admin:'Đặt làm quản trị (quản lý mọi đơn vị và người dùng)',
    um_units_hint:'Hoặc chọn đơn vị được sửa:', um_add:'Thêm / cập nhật', um_all:'(tất cả)', um_none:'(chưa gán)', um_admin_label:'Quản trị',
    um_remove:'Xóa', um_err_email:'Vui lòng nhập email hợp lệ.', um_err_units:'Chọn ít nhất một đơn vị, hoặc đặt làm quản trị.',
    um_confirm_remove:'Xóa người dùng {email}?', um_no_self:'Không thể tự xóa chính mình.', um_save_fail:'Lưu người dùng thất bại: ',
    loading:'Đang tải…', login_hint:'Vui lòng đăng nhập bằng tài khoản Google được cấp phép.', login_btn:'Đăng nhập bằng Google',
    noaccess_title:'Không có quyền truy cập', noaccess_desc:'Tài khoản {email} chưa được cấp quyền. Vui lòng liên hệ quản trị viên.', switch_account:'Đổi tài khoản',
    login_fail:'Đăng nhập thất bại: ', access_fail:'Không tải được quyền: ', save_person_fail:'Lưu người thất bại: ',
    empty_no_people:'Đơn vị này chưa có người. Nhấn "Thêm người" bên dưới.', no_units:'Chưa được gán đơn vị để sửa. Vui lòng liên hệ quản trị viên.',
    leave_bar:'Không thể làm (nghỉ)', full_off_label:'Nghỉ (cả ngày)', off_prefix:'Nghỉ', off_short:'N', month_btn:'Th',
    title_apply_tpl:'Áp dụng mẫu đã chọn', title_apply_day:'Áp dụng mẫu cho ngày này', title_month:'Mở xem cả tháng',
    title_full_leave:'Nghỉ cả ngày (nhấn lại để hủy)', title_edit_person:'Nhấp tên → xem cả tháng',
    brush_hint:'Đã chọn mẫu "{name} {start}–{end}": nhấp ⤵ ở mỗi hàng để áp dụng, hoặc "Áp dụng cả nhóm" ở trên. Nhấp mẫu lần nữa để bỏ chọn.',
    clear_confirm:'Xóa toàn bộ ca của "{unit}" ngày {date}?', clear_month_confirm:'Xóa cả tháng của người này?',
    admin_paren:' (quản trị)',
    unit_ID:'Indonesia', unit_VN:'Việt Nam', unit_TH:'Thái Lan', unit_PH:'Philippines', unit_KYC:'Kiểm tra khách hàng',
    dow:['CN','T2','T3','T4','T5','T6','T7'],
  },
  th: {
    app_title:'ตารางเวร', lang_label:'ภาษา',
    today:'วันนี้', compare_upload:'เทียบบันทึกเวลา', export:'ส่งออกไฟล์', users:'ผู้ใช้', signout:'ออกจากระบบ',
    prev_day:'วันก่อนหน้า', next_day:'วันถัดไป',
    tpl_label:'เทมเพลตเวร', manage_tpl:'จัดการเทมเพลต', brush:'พู่กัน', work:'ทำงาน', off:'ลา',
    apply_all:'ใช้กับทั้งกลุ่ม', copy_day:'คัดลอกวัน', add_person:'+ เพิ่มบุคคล', clear_day:'ล้างวันนี้',
    legend_drag:'ลากช่องว่าง = สร้างเวร', legend_move:'ลากทั้งแท่ง = ย้าย', legend_resize:'ลากปลาย = ปรับเวลา',
    legend_edit:'คลิกบล็อก = แก้ไข/ลบ/เปลี่ยนชนิด', legend_brushoff:'พู่กันลา = ลากช่วงลา',
    legend_full:'休 = ลาทั้งวัน', legend_month:'ชื่อ / M = ดูทั้งเดือน',
    mv_back:'← กลับมุมมองวัน', edit_person:'แก้ไขบุคคล', prev_month:'เดือนก่อน', next_month:'เดือนถัดไป',
    apply_every:'ใช้ทุกวันของเดือน', apply_weekday:'เฉพาะวันธรรมดา (จ.–ศ.)', weekend_leave:'ตั้งวันหยุดสุดสัปดาห์เป็นลา', clear_month:'ล้างทั้งเดือน',
    mv_hint:'เหมือนมุมมองวัน: ลากเพื่อสร้าง ลากแท่งเพื่อย้าย ลากปลายเพื่อปรับ คลิกบล็อกเพื่อแก้ไข/ลบ, 休 = ลาทั้งวัน',
    cmp_back:'← กลับ', cmp_title:'ผลการเทียบเวลา', cmp_grace:'ผ่อนผัน (นาที)', cmp_only:'เฉพาะที่ผิดปกติ', cmp_export:'ส่งออกรายการ',
    th_date:'วันที่', th_emp:'รหัส', th_name:'ชื่อ', th_unit:'หน่วย', th_sched:'ตารางเวร', th_actual:'จริง', th_verdict:'ผล',
    cmp_count:'{n} รายการ', cmp_ok:'ปกติ', cmp_bad:'ผิดปกติ', cmp_warn:'ต้องตรวจ', cmp_none:'ไม่มีข้อมูลที่ตรงกัน',
    st_normal:'ปกติ', st_late:'สาย {n} นาที', st_early_in:'เข้าเร็ว {n} นาที', st_early_out:'ออกก่อน {n} นาที', st_late_out:'ออกช้า {n} นาที',
    st_nopunch:'ไม่ได้ลงเวลา', st_leavework:'ทำงานวันลา', st_unsched:'ไม่มีเวร (OT?)', st_unknown:'ไม่พบรหัสนี้', st_fulloff:'ลาทั้งวัน',
    pm_add:'เพิ่มบุคคล', pm_edit:'แก้ไขบุคคล', empno:'รหัสพนักงาน', name:'ชื่อ', cancel:'ยกเลิก', save:'บันทึก', delete_person:'ลบบุคคล',
    empno_ph:'เช่น A12345', name_ph:'เช่น สมชาย',
    pm_err_required:'ต้องกรอกรหัสและชื่อ', pm_err_dup:'รหัสนี้มีอยู่แล้วในหน่วยนี้', pm_confirm_del:'ลบ "{name}" หรือไม่? เวรทั้งหมดของคนนี้จะถูกลบด้วย',
    seg_title:'แก้ไขบล็อก', type:'ชนิด', opt_work:'ทำงาน', opt_off:'ลา / ไม่ว่าง', start:'เริ่ม', end:'สิ้นสุด', delete_seg:'ลบ',
    seg_err:'เวลาสิ้นสุดต้องหลังเวลาเริ่ม',
    tpl_title:'เทมเพลตเวร', tpl_name_ph:'ชื่อ เช่น กะเช้า', add:'เพิ่ม', done:'เสร็จ', delete:'ลบ',
    tpl_err_name:'กรุณาใส่ชื่อเทมเพลต', tpl_err_time:'เวลาเลิกต้องหลังเวลาเข้า',
    copy_title:'คัดลอกตารางของวัน', copy_desc:'คัดลอกตารางทั้งหมดของวันต้นทางมาทับวันปัจจุบัน', src_date:'วันที่ต้นทาง',
    copy_all_units:'ทุกหน่วย (ถ้าไม่เลือกจะเฉพาะหน่วยปัจจุบัน)', copy:'คัดลอก',
    copy_err_src:'กรุณาเลือกวันต้นทาง', copy_err_same:'วันต้นทางและปลายทางเป็นวันเดียวกัน',
    exp_title:'ส่งออกไฟล์เวลา (Apollo)', from_date:'จากวันที่', to_date:'ถึงวันที่', exp_all_units:'ทุกหน่วย (ถ้าไม่เลือกจะเฉพาะหน่วยปัจจุบัน)',
    exp_rule:'กฎ: มีเวร → ทำงาน (W0001) + เวลา; ช่องว่างกลายเป็นเวลาพัก; ลาทั้งวัน → ลา (H0001); ไม่มีเวรและไม่ลา → ไม่ส่งออก',
    gen_excel:'สร้าง Excel',
    exp_err_dates:'กรุณาเลือกช่วงวันที่', exp_err_order:'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม', exp_err_empty:'ไม่มีตารางให้ส่งออกในช่วงนี้',
    exp_warn_break:'{name} ({date}) มีช่วงพักเกิน 3 ช่วง; Apollo รับได้สูงสุด 3', exp_done_warn:'ส่งออกแล้ว แต่โปรดทราบ:',
    xlsx_missing:'ยังไม่ได้โหลดส่วนประกอบ Excel (ต้องต่ออินเทอร์เน็ต)',
    um_title:'จัดการผู้ใช้', um_email:'เพิ่ม / อัปเดตอีเมลผู้ใช้', um_admin:'ตั้งเป็นผู้ดูแล (จัดการทุกหน่วยและผู้ใช้)',
    um_units_hint:'หรือเลือกหน่วยที่แก้ไขได้:', um_add:'เพิ่ม / อัปเดต', um_all:'(ทั้งหมด)', um_none:'(ยังไม่กำหนด)', um_admin_label:'ผู้ดูแล',
    um_remove:'นำออก', um_err_email:'กรุณาใส่อีเมลที่ถูกต้อง', um_err_units:'เลือกอย่างน้อยหนึ่งหน่วย หรือตั้งเป็นผู้ดูแล',
    um_confirm_remove:'นำผู้ใช้ {email} ออก?', um_no_self:'ไม่สามารถนำตนเองออกได้', um_save_fail:'บันทึกผู้ใช้ล้มเหลว: ',
    loading:'กำลังโหลด…', login_hint:'กรุณาเข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต', login_btn:'เข้าสู่ระบบด้วย Google',
    noaccess_title:'ไม่มีสิทธิ์เข้าถึง', noaccess_desc:'บัญชี {email} ยังไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ', switch_account:'เปลี่ยนบัญชี',
    login_fail:'เข้าสู่ระบบล้มเหลว: ', access_fail:'โหลดสิทธิ์ล้มเหลว: ', save_person_fail:'บันทึกบุคคลล้มเหลว: ',
    empty_no_people:'หน่วยนี้ยังไม่มีบุคคล กด "เพิ่มบุคคล" ด้านล่าง', no_units:'ยังไม่ได้กำหนดหน่วยที่แก้ไขได้ กรุณาติดต่อผู้ดูแล',
    leave_bar:'ทำงานไม่ได้ (ลา)', full_off_label:'ลา (ทั้งวัน)', off_prefix:'ลา', off_short:'ล', month_btn:'ด',
    title_apply_tpl:'ใช้เทมเพลตที่เลือก', title_apply_day:'ใช้เทมเพลตกับวันนี้', title_month:'เปิดมุมมองเดือน',
    title_full_leave:'ลาทั้งวัน (กดอีกครั้งเพื่อยกเลิก)', title_edit_person:'คลิกชื่อ → มุมมองเดือน',
    brush_hint:'เลือกเทมเพลต "{name} {start}–{end}" แล้ว: กด ⤵ ที่แต่ละแถวเพื่อใช้ หรือ "ใช้กับทั้งกลุ่ม" ด้านบน กดเทมเพลตอีกครั้งเพื่อยกเลิก',
    clear_confirm:'ล้างเวรทั้งหมดของ "{unit}" วันที่ {date} หรือไม่?', clear_month_confirm:'ล้างทั้งเดือนของคนนี้หรือไม่?',
    admin_paren:' (ผู้ดูแล)',
    unit_ID:'อินโดนีเซีย', unit_VN:'เวียดนาม', unit_TH:'ไทย', unit_PH:'ฟิลิปปินส์', unit_KYC:'ตรวจสอบลูกค้า',
    dow:['อา','จ','อ','พ','พฤ','ศ','ส'],
  },
};

Object.assign(I18N.zh, { punch_empty:'檔案是空的。', punch_nocol:'找不到「工號」或「日期」欄，請確認檔案格式。', punch_norows:'沒有可比對的資料列。', cmp_no_export:'沒有資料可匯出。', xlsx_read_fail:'讀取失敗：' });
Object.assign(I18N.en, { punch_empty:'The file is empty.', punch_nocol:'Cannot find an "ID" or "Date" column. Please check the file format.', punch_norows:'No comparable rows.', cmp_no_export:'No data to export.', xlsx_read_fail:'Read failed: ' });
Object.assign(I18N.vi, { punch_empty:'Tệp trống.', punch_nocol:'Không tìm thấy cột "Mã NV" hoặc "Ngày". Vui lòng kiểm tra định dạng tệp.', punch_norows:'Không có dòng để đối chiếu.', cmp_no_export:'Không có dữ liệu để xuất.', xlsx_read_fail:'Đọc thất bại: ' });
Object.assign(I18N.th, { punch_empty:'ไฟล์ว่างเปล่า', punch_nocol:'ไม่พบคอลัมน์ "รหัส" หรือ "วันที่" กรุณาตรวจสอบรูปแบบไฟล์', punch_norows:'ไม่มีแถวสำหรับเทียบ', cmp_no_export:'ไม่มีข้อมูลให้ส่งออก', xlsx_read_fail:'อ่านไม่สำเร็จ: ' });

const EN_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TH_MONTH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

let _lang = 'zh';
try{ _lang = localStorage.getItem('ss.lang') || 'zh'; }catch(e){}
if(!I18N[_lang]) _lang = 'zh';

function getLang(){ return _lang; }
function t(key, p){
  const d = I18N[_lang] || I18N.zh;
  let s = (d[key] != null) ? d[key] : (I18N.zh[key] != null ? I18N.zh[key] : key);
  if(p) for(const k in p) s = s.split('{'+k+'}').join(p[k]);
  return s;
}
function dowLabel(day){ return (I18N[_lang].dow || I18N.zh.dow)[day]; }
function unitName(id){ return t('unit_' + id); }
function monthLabel(y, m){
  const mm = String(m+1).padStart(2,'0');
  switch(_lang){
    case 'en': return EN_MONTH[m] + ' ' + y;
    case 'vi': return 'Tháng ' + (m+1) + ' / ' + y;
    case 'th': return TH_MONTH[m] + ' ' + y;
    default:   return y + ' 年 ' + mm + ' 月';
  }
}
function applyStaticI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
  document.documentElement.lang = _lang;
}
function setLang(l){
  if(!I18N[l]) return;
  _lang = l;
  try{ localStorage.setItem('ss.lang', l); }catch(e){}
  document.querySelectorAll('.lang-sel').forEach(s => { s.value = l; });
  applyStaticI18n();
  if(window.onLangChange) window.onLangChange();
}

window.I18N = I18N; window.t = t; window.getLang = getLang; window.setLang = setLang;
window.dowLabel = dowLabel; window.unitName = unitName; window.monthLabel = monthLabel;
window.applyStaticI18n = applyStaticI18n;
