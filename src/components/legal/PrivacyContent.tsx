import React from 'react';
import { LegalSection } from './LegalSection';

interface Props { isVi: boolean }

const PrivacyContent: React.FC<Props> = ({ isVi }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
    <LegalSection title={isVi ? '1. Dữ liệu chúng tôi thu thập' : '1. Data We Collect'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Dữ liệu cá nhân:</strong> Họ tên, email, số điện thoại (hash SHA-256), ngày sinh, giới tính, ảnh đại diện.</li>
          <li><strong>Dữ liệu sinh trắc:</strong> Khuôn mặt 3D (xử lý on-device, chỉ lưu vector đặc trưng 512 chiều), dấu hiệu sinh tồn từ camera (nhịp tim, SpO2 ước lượng).</li>
          <li><strong>Dữ liệu y tế:</strong> Hồ sơ sức khỏe tải lên (PDF, ảnh), kết quả xét nghiệm, tiền sử bệnh, thuốc đang dùng, mã ICD-11 được trích xuất.</li>
          <li><strong>Dữ liệu cảm biến:</strong> Bước chân, gia tốc kế, con quay hồi chuyển, áp suất khí quyển, cường độ ánh sáng (từ thiết bị).</li>
          <li><strong>Dữ liệu môi trường:</strong> Vị trí GPS (nếu cho phép), chỉ số AQI, nhiệt độ/độ ẩm khu vực.</li>
          <li><strong>Dữ liệu sử dụng:</strong> Trang truy cập, tính năng sử dụng, thời gian phiên, loại thiết bị, phiên bản trình duyệt (thu thập tự động khi bạn sử dụng Nền tảng, theo mục 6 bên dưới).</li>
          <li><strong>Dữ liệu giao dịch:</strong> Lịch sử thanh toán, gói đăng ký, hóa đơn (không lưu trữ thông tin thẻ tín dụng — do bên thứ ba xử lý).</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Personal data:</strong> Name, email, phone number (SHA-256 hashed), date of birth, gender, profile picture.</li>
          <li><strong>Biometric data:</strong> 3D face (processed on-device, only 512-dimensional feature vectors stored), vital signs from camera (heart rate, estimated SpO2).</li>
          <li><strong>Medical data:</strong> Uploaded health records (PDF, images), test results, medical history, medications, extracted ICD-11 codes.</li>
          <li><strong>Sensor data:</strong> Steps, accelerometer, gyroscope, barometric pressure, ambient light (from device).</li>
          <li><strong>Environmental data:</strong> GPS location (if permitted), AQI index, regional temperature/humidity.</li>
          <li><strong>Usage data:</strong> Pages visited, features used, session duration, device type, browser version (automatically collected when you use the Platform, per section 6 below).</li>
          <li><strong>Transaction data:</strong> Payment history, subscription plan, invoices (credit card info is NOT stored — processed by third parties).</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '2. Cách chúng tôi sử dụng dữ liệu' : '2. How We Use Data'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Tạo và duy trì Song sinh số (Digital Twin) cá nhân hóa cho bạn.</li>
          <li>Dự báo rủi ro sức khỏe (đột quỵ, tim mạch, hô hấp, chuyển hóa) dựa trên mô hình AI.</li>
          <li>Gửi cảnh báo sức khỏe theo thời gian thực dựa trên ngưỡng cá nhân.</li>
          <li>Cải thiện chất lượng mô hình AI bằng dữ liệu ẩn danh hóa hoàn toàn (k-anonymity ≥ 5).</li>
          <li>Tạo báo cáo sức khỏe cá nhân và gợi ý hành vi sức khỏe.</li>
          <li>Phát hiện ổ dịch và hỗ trợ giám sát dịch tễ cộng đồng (dữ liệu tổng hợp, ẩn danh).</li>
          <li>Cải thiện trải nghiệm người dùng và tối ưu hóa hiệu suất nền tảng.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>Create and maintain your personalized Digital Twin.</li>
          <li>Predict health risks (stroke, cardiovascular, respiratory, metabolic) using AI models.</li>
          <li>Send real-time health alerts based on personal thresholds.</li>
          <li>Improve AI model quality using fully anonymized data (k-anonymity ≥ 5).</li>
          <li>Generate personal health reports and behavioral health recommendations.</li>
          <li>Detect disease outbreaks and support community epidemiological surveillance (aggregated, anonymized data).</li>
          <li>Improve user experience and optimize platform performance.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '3. Bảo mật dữ liệu' : '3. Data Security'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Mã hóa end-to-end (AES-256-GCM) cho tất cả dữ liệu y tế khi truyền tải và lưu trữ.</li>
          <li>TLS 1.3 cho mọi kết nối mạng. Certificate pinning cho ứng dụng di động.</li>
          <li>Dữ liệu sinh trắc khuôn mặt được xử lý hoàn toàn on-device — không gửi ảnh gốc lên server.</li>
          <li>Số điện thoại được hash (SHA-256 + salt) trước khi lưu trữ.</li>
          <li>Hạ tầng đạt chuẩn SOC 2 Type II và ISO 27001, datacenter Singapore (AWS ap-southeast-1).</li>
          <li>Audit log đầy đủ với tamper-proof storage — ghi nhận mọi lượt truy cập, chỉnh sửa dữ liệu.</li>
          <li>Kiểm tra bảo mật độc lập (pentest) ít nhất 2 lần/năm bởi bên thứ ba.</li>
          <li>Bug bounty program mở cho cộng đồng bảo mật.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>End-to-end encryption (AES-256-GCM) for all medical data in transit and at rest.</li>
          <li>TLS 1.3 for all network connections. Certificate pinning for mobile apps.</li>
          <li>Facial biometric data processed entirely on-device — raw images never sent to servers.</li>
          <li>Phone numbers hashed (SHA-256 + salt) before storage.</li>
          <li>SOC 2 Type II and ISO 27001 compliant infrastructure, Singapore datacenter (AWS ap-southeast-1).</li>
          <li>Complete audit logs with tamper-proof storage — every access and modification recorded.</li>
          <li>Independent security assessments (pentests) at least twice per year by third parties.</li>
          <li>Open bug bounty program for the security community.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '4. Chia sẻ dữ liệu' : '4. Data Sharing'}>
      {isVi ? (
        <>
          <p className="font-semibold text-foreground">Chúng tôi KHÔNG BAO GIỜ bán dữ liệu cá nhân cho bên thứ ba.</p>
          <p className="mt-2">Dữ liệu chỉ được chia sẻ trong các trường hợp sau:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>(a)</strong> Bạn chủ động chia sẻ qua Twin Sharing Hub với bác sĩ, gia đình hoặc tổ chức y tế (có mã xác nhận và thời hạn).</li>
            <li><strong>(b)</strong> Theo yêu cầu bắt buộc của cơ quan nhà nước có thẩm quyền theo quy định pháp luật Việt Nam.</li>
            <li><strong>(c)</strong> Dữ liệu ẩn danh hóa hoàn toàn phục vụ nghiên cứu y tế — chỉ khi có sự đồng ý riêng biệt từ bạn.</li>
            <li><strong>(d)</strong> Nhà cung cấp dịch vụ phụ (sub-processor) xử lý dữ liệu theo hợp đồng DPA nghiêm ngặt: Supabase (cơ sở dữ liệu), Google Cloud (AI inference), Stripe/VNPay (thanh toán).</li>
          </ul>
        </>
      ) : (
        <>
          <p className="font-semibold text-foreground">We NEVER sell personal data to third parties.</p>
          <p className="mt-2">Data is only shared in the following cases:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>(a)</strong> You actively share via Twin Sharing Hub with doctors, family, or healthcare organizations (with confirmation code and expiry).</li>
            <li><strong>(b)</strong> Required by competent Vietnamese government authorities under applicable law.</li>
            <li><strong>(c)</strong> Fully anonymized data for medical research — only with your separate explicit consent.</li>
            <li><strong>(d)</strong> Sub-processors handling data under strict DPA agreements: Supabase (database), Google Cloud (AI inference), Stripe/VNPay (payments).</li>
          </ul>
        </>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '5. Quyền của bạn' : '5. Your Rights'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Quyền truy cập (Điều 15 GDPR):</strong> Xem toàn bộ dữ liệu chúng tôi lưu trữ về bạn thông qua BioVault Dashboard.</li>
          <li><strong>Quyền chỉnh sửa (Điều 16):</strong> Cập nhật hoặc chỉnh sửa thông tin không chính xác bất cứ lúc nào.</li>
          <li><strong>Quyền xóa (Điều 17):</strong> Yêu cầu xóa toàn bộ dữ liệu ("Right to be forgotten"). Xử lý trong 30 ngày.</li>
          <li><strong>Quyền hạn chế xử lý (Điều 18):</strong> Yêu cầu tạm ngưng xử lý dữ liệu trong khi giải quyết khiếu nại.</li>
          <li><strong>Quyền di chuyển dữ liệu (Điều 20):</strong> Tải về toàn bộ dữ liệu dưới dạng JSON, CSV hoặc PDF.</li>
          <li><strong>Quyền phản đối (Điều 21):</strong> Phản đối việc xử lý dữ liệu cho mục đích tiếp thị hoặc profiling.</li>
          <li><strong>Quyền thu hồi đồng ý:</strong> Rút lại sự đồng ý bất cứ lúc nào qua Cài đặt → Quyền riêng tư.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Right to access (Art. 15 GDPR):</strong> View all data we store about you through BioVault Dashboard.</li>
          <li><strong>Right to rectify (Art. 16):</strong> Update or correct inaccurate information at any time.</li>
          <li><strong>Right to delete (Art. 17):</strong> Request full data deletion ("Right to be forgotten"). Processed within 30 days.</li>
          <li><strong>Right to restrict processing (Art. 18):</strong> Request temporary suspension of data processing during dispute resolution.</li>
          <li><strong>Right to data portability (Art. 20):</strong> Download all data in JSON, CSV, or PDF format.</li>
          <li><strong>Right to object (Art. 21):</strong> Object to data processing for marketing or profiling purposes.</li>
          <li><strong>Right to withdraw consent:</strong> Revoke consent at any time via Settings → Privacy.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '6. Công nghệ theo dõi & Dữ liệu sử dụng' : '6. Tracking Technologies & Usage Data'}>
      {isVi ? (
        <>
          <p>Khi sử dụng Nền tảng, chúng tôi tự động thu thập một số thông tin kỹ thuật cần thiết để vận hành và cải thiện dịch vụ:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Bộ nhớ cục bộ (Local Storage):</strong> Lưu trữ cài đặt giao diện, ngôn ngữ, và trạng thái phiên đăng nhập. Không sử dụng cookie theo dõi của bên thứ ba.</li>
            <li><strong>Service Worker:</strong> Hỗ trợ chế độ offline và đồng bộ dữ liệu khi có kết nối.</li>
            <li><strong>Phân tích nội bộ:</strong> Ghi nhận lượt truy cập trang, sự kiện tương tác (ẩn danh) để tối ưu trải nghiệm. Dữ liệu này được xử lý hoàn toàn trên hạ tầng của Sao Mai Health, không chia sẻ với Google Analytics hay bất kỳ bên thứ ba nào.</li>
          </ul>
        </>
      ) : (
        <>
          <p>When using the Platform, we automatically collect certain technical information necessary to operate and improve the service:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Local Storage:</strong> Stores interface settings, language preferences, and login session state. No third-party tracking cookies are used.</li>
            <li><strong>Service Worker:</strong> Enables offline mode and data synchronization when connectivity resumes.</li>
            <li><strong>Internal analytics:</strong> Records page visits and interaction events (anonymized) to optimize experience. This data is processed entirely on Sao Mai Health infrastructure, not shared with Google Analytics or any third party.</li>
          </ul>
        </>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '7. Lưu trữ & Xóa dữ liệu' : '7. Data Retention & Deletion'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Dữ liệu tài khoản:</strong> Lưu trữ trong suốt thời gian tài khoản hoạt động + 30 ngày sau khi xóa tài khoản.</li>
          <li><strong>Dữ liệu y tế & sinh trắc:</strong> Lưu trữ theo yêu cầu của bạn. Xóa ngay khi bạn yêu cầu hoặc khi tài khoản bị xóa.</li>
          <li><strong>Dữ liệu phân tích (ẩn danh):</strong> Lưu trữ tối đa 24 tháng để cải thiện mô hình.</li>
          <li><strong>Backup:</strong> Bản sao lưu được xóa hoàn toàn trong vòng 90 ngày sau yêu cầu xóa dữ liệu.</li>
          <li><strong>Dữ liệu pháp lý:</strong> Hồ sơ giao dịch và audit log được lưu trữ tối thiểu 5 năm theo quy định kế toán Việt Nam.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Account data:</strong> Retained while account is active + 30 days after deletion.</li>
          <li><strong>Medical & biometric data:</strong> Retained per your request. Deleted upon request or account deletion.</li>
          <li><strong>Analytics data (anonymized):</strong> Retained for up to 24 months for model improvement.</li>
          <li><strong>Backups:</strong> Fully purged within 90 days of a data deletion request.</li>
          <li><strong>Legal records:</strong> Transaction records and audit logs retained for minimum 5 years per Vietnamese accounting regulations.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '8. Bảo vệ trẻ em' : '8. Children\'s Privacy'}>
      {isVi
        ? 'Sao Mai Health không cố ý thu thập dữ liệu từ trẻ em dưới 13 tuổi. Người dùng từ 13-15 tuổi chỉ được sử dụng Nền tảng dưới sự giám sát và đồng ý bằng văn bản của phụ huynh/người giám hộ. Nếu phát hiện dữ liệu của trẻ dưới 13 tuổi đã được thu thập mà không có sự đồng ý hợp lệ, chúng tôi sẽ xóa ngay lập tức. Phụ huynh có thể liên hệ dpo@saomaihealth.com để yêu cầu xóa.'
        : 'Sao Mai Health does not knowingly collect data from children under 13. Users aged 13-15 may only use the Platform under supervision and with written parental/guardian consent. If we discover that data from a child under 13 has been collected without valid consent, we will delete it immediately. Parents may contact dpo@saomaihealth.com to request deletion.'}
    </LegalSection>
  </div>
);

export default PrivacyContent;
