# Kế hoạch sửa đo đạc không gian

## Mục tiêu
Không trình bày độ trễ Internet như phép đo kích thước căn nhà. Sơ đồ phải dùng kích thước người dùng xác nhận, còn WiFi/RuView chỉ đánh giá tín hiệu và hiện diện.

## Thay đổi
- Thêm phần nhập chiều dài × chiều rộng thực tế cho từng phòng trên màn hình Quét WiFi toàn nhà.
- Lưu cấu hình mặt bằng trên thiết bị và dùng chung cho bản đồ 2D, 3D, vùng phủ và định vị.
- Tính diện tích bằng số đo phòng đã nhập; bỏ việc mặc định coi sơ đồ mẫu là kết quả đo.
- Đổi bán kính/phạm vi từ WiFi trình duyệt thành “ước lượng liên kết”, không dùng nó để khẳng định kích thước không gian.
- Hiển thị rõ độ chính xác: chưa hiệu chuẩn, định vị theo phòng, hoặc đa điểm khi đủ cảm biến.

## Kỹ thuật
- Tách mặt bằng dùng chung sang một hook lưu cục bộ, với giới hạn số đo hợp lệ.
- Chuyển mét sang lưới hiển thị bằng một tỷ lệ duy nhất để 2D, 3D và mô hình phủ sóng khớp nhau.
- Truyền mặt bằng đã hiệu chuẩn vào phép định vị thay vì luôn dùng `DEFAULT_FLOORPLAN`.
- Giữ dữ liệu mô phỏng được ghi nhãn rõ; không biến RTT/STUN thành phép đo khoảng cách vật lý.

## Kiểm tra
- Nhập kích thước phòng và xác nhận tổng diện tích khớp.
- Tải lại trang, xác nhận cấu hình vẫn còn và bản đồ 2D/3D dùng cùng tỷ lệ.
- Kiểm tra điện thoại và máy tính; xác nhận không có lỗi hiển thị hoặc lỗi chạy.
