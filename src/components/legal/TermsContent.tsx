import React from 'react';
import { LegalSection } from './LegalSection';

interface Props { isVi: boolean }

const TermsContent: React.FC<Props> = ({ isVi }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
    <LegalSection title={isVi ? '1. Giới thiệu' : '1. Introduction'}>
      {isVi
        ? 'Chào mừng bạn đến với Sao Mai Health ("Nền tảng"), thuộc sở hữu và vận hành bởi Công ty TNHH Sao Mai Health Technology, ĐKKD số [số ĐKKD], trụ sở tại TP. Hồ Chí Minh, Việt Nam. Bằng việc truy cập, đăng ký hoặc sử dụng bất kỳ dịch vụ nào trên Nền tảng, bạn xác nhận đã đọc, hiểu và đồng ý ràng buộc bởi toàn bộ Điều khoản Sử dụng này ("Điều khoản"). Nền tảng cung cấp dịch vụ Song sinh số Y tế (Digital Health Twin) kết hợp trí tuệ nhân tạo để hỗ trợ theo dõi và dự báo sức khỏe cá nhân.'
        : 'Welcome to Sao Mai Health ("Platform"), owned and operated by Sao Mai Health Technology Co., Ltd., registered in Ho Chi Minh City, Vietnam. By accessing, registering, or using any services on the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). The Platform provides Digital Health Twin services combining artificial intelligence for personal health monitoring and prediction.'}
    </LegalSection>

    <LegalSection title={isVi ? '2. Tài khoản & Đăng ký' : '2. Account & Registration'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Bạn phải từ 16 tuổi trở lên để tạo tài khoản. Người dưới 16 tuổi cần có sự đồng ý bằng văn bản của phụ huynh/người giám hộ theo Điều 21 Luật Trẻ em 2016.</li>
          <li>Thông tin đăng ký phải chính xác, đầy đủ và cập nhật. Bạn chịu trách nhiệm hoàn toàn về bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản của mình.</li>
          <li>Mỗi lần quét khuôn mặt tạo một Mã định danh Lần khám (Encounter ID) duy nhất, liên kết với Mã bệnh nhân (Patient ID) thông qua hệ thống mã hóa AES-256.</li>
          <li>Chúng tôi có quyền tạm khóa, hạn chế hoặc xóa vĩnh viễn tài khoản vi phạm điều khoản mà không cần thông báo trước trong trường hợp nghiêm trọng.</li>
          <li>Một cá nhân chỉ được sở hữu một (01) tài khoản chính. Việc tạo nhiều tài khoản để lạm dụng dịch vụ sẽ bị cấm.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>You must be at least 16 years old to create an account. Users under 16 require written parental/guardian consent per Vietnam's Children Law 2016 (Article 21).</li>
          <li>Registration information must be accurate, complete, and current. You are fully responsible for maintaining account security and all activities under your account.</li>
          <li>Each face scan generates a unique Encounter ID linked to your Patient ID through AES-256 encryption.</li>
          <li>We reserve the right to suspend, restrict, or permanently delete accounts that violate these terms without prior notice in severe cases.</li>
          <li>Each individual may only maintain one (1) primary account. Creating multiple accounts to abuse services is prohibited.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '3. Dịch vụ & Giới hạn trách nhiệm' : '3. Services & Limitation of Liability'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Không phải dịch vụ y tế:</strong> Sao Mai Health cung cấp công cụ hỗ trợ theo dõi sức khỏe, KHÔNG thay thế chẩn đoán, điều trị hoặc tư vấn y khoa chuyên nghiệp. Mọi thông tin trên nền tảng chỉ mang tính tham khảo.</li>
          <li><strong>Dự báo AI:</strong> Các dự báo rủi ro sức khỏe dựa trên mô hình thống kê và máy học. Độ chính xác phụ thuộc vào chất lượng dữ liệu đầu vào. Luôn tham khảo ý kiến bác sĩ cho các quyết định y tế.</li>
          <li><strong>Giới hạn trách nhiệm:</strong> Trong mọi trường hợp, tổng trách nhiệm pháp lý của Sao Mai Health không vượt quá số tiền bạn đã thanh toán trong 12 tháng gần nhất. Chúng tôi không chịu trách nhiệm về thiệt hại gián tiếp, ngẫu nhiên hoặc hậu quả.</li>
          <li><strong>Tính sẵn sàng:</strong> Nỗ lực đảm bảo uptime 99.9% (SLA). Bảo trì hệ thống sẽ được thông báo trước ít nhất 24 giờ qua email/thông báo trong ứng dụng.</li>
          <li><strong>Gói dịch vụ:</strong> Tính năng và giới hạn sử dụng phụ thuộc vào gói đăng ký (Starter, Family, Pro, Enterprise). Chi tiết tại trang Bảng giá.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Not a medical service:</strong> Sao Mai Health provides health monitoring tools, NOT a substitute for professional medical diagnosis, treatment, or advice. All information on the platform is for reference only.</li>
          <li><strong>AI predictions:</strong> Health risk predictions are based on statistical and machine learning models. Accuracy depends on input data quality. Always consult a physician for medical decisions.</li>
          <li><strong>Limitation of liability:</strong> In no event shall Sao Mai Health's total liability exceed the amount you paid in the preceding 12 months. We are not liable for indirect, incidental, or consequential damages.</li>
          <li><strong>Availability:</strong> We strive for 99.9% uptime (SLA). Scheduled maintenance will be communicated at least 24 hours in advance via email/in-app notification.</li>
          <li><strong>Plans:</strong> Features and usage limits depend on your subscription tier (Starter, Family, Pro, Enterprise). Details on the Pricing page.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '4. Thanh toán & Hoàn tiền' : '4. Payment & Refunds'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Các gói trả phí được thanh toán theo chu kỳ tháng hoặc năm qua các cổng thanh toán được chấp nhận (Stripe, VNPay, MoMo). Tự động gia hạn trừ khi bạn hủy trước ngày gia hạn ít nhất 3 ngày.</li>
          <li>Hoàn tiền trong vòng 7 ngày đầu tiên nếu chưa sử dụng quá 5 lần quét AI. Sau thời hạn này, không áp dụng hoàn tiền trừ trường hợp lỗi hệ thống.</li>
          <li>Phí nâng cấp Enterprise add-on được tính theo tháng, không hoàn lại khi hạ cấp giữa chu kỳ.</li>
          <li>Giá có thể thay đổi với thông báo trước 30 ngày. Giá mới áp dụng từ chu kỳ thanh toán tiếp theo.</li>
          <li>Hóa đơn điện tử được gửi tự động sau mỗi giao dịch thành công.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>Paid plans are billed monthly or annually via accepted payment gateways (Stripe, VNPay, MoMo). Auto-renew unless canceled at least 3 days before renewal date.</li>
          <li>Refunds are available within the first 7 days if fewer than 5 AI scans have been used. Beyond this period, no refunds except for system errors.</li>
          <li>Enterprise add-on fees are billed monthly and non-refundable upon mid-cycle downgrade.</li>
          <li>Prices may change with 30 days' notice. New prices apply from the next billing cycle.</li>
          <li>Electronic invoices are automatically sent after each successful transaction.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '5. Sở hữu trí tuệ' : '5. Intellectual Property'}>
      {isVi
        ? 'Toàn bộ nội dung, mã nguồn, thuật toán AI, mô hình máy học, thương hiệu "Sao Mai Health", logo, và thiết kế giao diện trên Nền tảng thuộc quyền sở hữu độc quyền của Sao Mai Health Technology Co., Ltd. và được bảo hộ theo Luật Sở hữu trí tuệ Việt Nam 2005 (sửa đổi 2022) và các hiệp ước quốc tế. Bạn không được sao chép, phân phối, dịch ngược, đảo ngược kỹ thuật, hoặc tái tạo bất kỳ phần nào mà không có sự đồng ý bằng văn bản. Vi phạm có thể bị truy cứu trách nhiệm dân sự và hình sự.'
        : 'All content, source code, AI algorithms, machine learning models, the "Sao Mai Health" brand, logo, and interface designs on the Platform are the exclusive property of Sao Mai Health Technology Co., Ltd. and are protected under Vietnam\'s Intellectual Property Law 2005 (amended 2022) and international treaties. You may not copy, distribute, reverse-engineer, decompile, or reproduce any part without written consent. Violations may result in civil and criminal liability.'}
    </LegalSection>

    <LegalSection title={isVi ? '6. Miễn trừ trách nhiệm y tế' : '6. Medical Disclaimer'}>
      {isVi ? (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-sm">
          <p className="font-semibold text-warning mb-2">⚠️ CẢNH BÁO QUAN TRỌNG</p>
          <p>Sao Mai Health KHÔNG phải là nhà cung cấp dịch vụ y tế. Nền tảng không đưa ra chẩn đoán, kê đơn thuốc, hoặc thay thế bất kỳ khuyến nghị y tế nào từ bác sĩ có giấy phép hành nghề. Chỉ số BioShield Index, điểm rủi ro đột quỵ, và mọi dự báo AI trên nền tảng chỉ mang tính tham khảo. Trong trường hợp cấp cứu y tế, hãy gọi 115 hoặc đến cơ sở y tế gần nhất ngay lập tức.</p>
        </div>
      ) : (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-sm">
          <p className="font-semibold text-warning mb-2">⚠️ IMPORTANT WARNING</p>
          <p>Sao Mai Health is NOT a healthcare provider. The Platform does not diagnose, prescribe medication, or replace any medical recommendations from licensed physicians. BioShield Index, stroke risk scores, and all AI predictions on the platform are for reference only. In case of medical emergency, call 115 (Vietnam) or go to the nearest medical facility immediately.</p>
        </div>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '7. Chấm dứt & Tạm ngưng' : '7. Termination & Suspension'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Bạn có thể hủy tài khoản bất cứ lúc nào qua Cài đặt. Dữ liệu sẽ được lưu giữ thêm 30 ngày trước khi xóa vĩnh viễn.</li>
          <li>Chúng tôi có quyền chấm dứt dịch vụ nếu phát hiện: vi phạm pháp luật, lạm dụng hệ thống, can thiệp trái phép vào API, hoặc hành vi gây hại cho người dùng khác.</li>
          <li>Sau khi chấm dứt, bạn có quyền xuất toàn bộ dữ liệu cá nhân trong vòng 30 ngày.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>You may cancel your account at any time via Settings. Data will be retained for 30 days before permanent deletion.</li>
          <li>We reserve the right to terminate service upon discovery of: legal violations, system abuse, unauthorized API interference, or behavior harmful to other users.</li>
          <li>After termination, you have the right to export all personal data within 30 days.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? '8. Bất khả kháng' : '8. Force Majeure'}>
      {isVi
        ? 'Sao Mai Health không chịu trách nhiệm về việc gián đoạn dịch vụ do các sự kiện ngoài tầm kiểm soát hợp lý, bao gồm nhưng không giới hạn: thiên tai, dịch bệnh, chiến tranh, tấn công mạng quy mô lớn, quyết định của cơ quan nhà nước, hoặc sự cố hạ tầng internet toàn cầu.'
        : 'Sao Mai Health shall not be liable for service interruptions caused by events beyond reasonable control, including but not limited to: natural disasters, pandemics, war, large-scale cyberattacks, government orders, or global internet infrastructure failures.'}
    </LegalSection>

    <LegalSection title={isVi ? '9. Sửa đổi Điều khoản' : '9. Amendments'}>
      {isVi
        ? 'Chúng tôi có quyền sửa đổi Điều khoản này bất cứ lúc nào. Các thay đổi quan trọng sẽ được thông báo qua email và/hoặc thông báo trong ứng dụng ít nhất 15 ngày trước khi có hiệu lực. Việc tiếp tục sử dụng Nền tảng sau khi thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận Điều khoản mới.'
        : 'We reserve the right to amend these Terms at any time. Material changes will be communicated via email and/or in-app notification at least 15 days before taking effect. Continued use of the Platform after changes take effect constitutes acceptance of the new Terms.'}
    </LegalSection>

    <LegalSection title={isVi ? '10. Luật áp dụng & Giải quyết tranh chấp' : '10. Governing Law & Dispute Resolution'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Các Điều khoản này được điều chỉnh bởi pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</li>
          <li>Mọi tranh chấp phát sinh sẽ được giải quyết trước hết bằng thương lượng thiện chí trong vòng 30 ngày.</li>
          <li>Nếu không đạt được thỏa thuận, tranh chấp sẽ được giải quyết bằng trọng tài tại Trung tâm Trọng tài Quốc tế Việt Nam (VIAC) hoặc Tòa án nhân dân có thẩm quyền tại TP. Hồ Chí Minh.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>These Terms are governed by the laws of the Socialist Republic of Vietnam.</li>
          <li>Any disputes shall first be resolved through good-faith negotiation within 30 days.</li>
          <li>If no agreement is reached, disputes shall be resolved by arbitration at the Vietnam International Arbitration Centre (VIAC) or the competent People's Court in Ho Chi Minh City.</li>
        </ul>
      )}
    </LegalSection>
  </div>
);

export default TermsContent;
