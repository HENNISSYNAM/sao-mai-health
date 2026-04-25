import React from 'react';
import { LegalSection } from './LegalSection';

interface Props { isVi: boolean }

const GdprContent: React.FC<Props> = ({ isVi }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
    <LegalSection title={isVi ? 'Cam kết tuân thủ GDPR' : 'GDPR Compliance Commitment'}>
      {isVi
        ? 'Sao Mai Health cam kết tuân thủ đầy đủ Quy định Bảo vệ Dữ liệu Chung của Liên minh Châu Âu (Regulation (EU) 2016/679 — GDPR) cho tất cả người dùng, bất kể quốc tịch hay nơi cư trú. Chúng tôi áp dụng nguyên tắc "Privacy by Design" và "Privacy by Default" (Điều 25 GDPR) trong mọi tính năng từ giai đoạn thiết kế.'
        : 'Sao Mai Health is fully committed to complying with the European Union General Data Protection Regulation (Regulation (EU) 2016/679 — GDPR) for all users, regardless of nationality or residence. We apply "Privacy by Design" and "Privacy by Default" principles (Article 25 GDPR) in every feature from the design phase.'}
    </LegalSection>

    <LegalSection title={isVi ? 'Cơ sở pháp lý xử lý dữ liệu (Điều 6 GDPR)' : 'Legal Basis for Processing (Article 6 GDPR)'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Sự đồng ý (Art. 6(1)(a)):</strong> Thu thập dữ liệu sinh trắc, y tế và dữ liệu nhạy cảm chỉ khi có sự đồng ý rõ ràng, tự nguyện, cụ thể và có thể thu hồi.</li>
          <li><strong>Thực hiện hợp đồng (Art. 6(1)(b)):</strong> Xử lý dữ liệu để cung cấp dịch vụ Digital Twin theo gói đăng ký.</li>
          <li><strong>Lợi ích hợp pháp (Art. 6(1)(f)):</strong> Cải thiện mô hình AI với dữ liệu ẩn danh hóa hoàn toàn. Đã thực hiện Đánh giá Tác động Lợi ích Hợp pháp (LIA).</li>
          <li><strong>Nghĩa vụ pháp lý (Art. 6(1)(c)):</strong> Tuân thủ yêu cầu của cơ quan bảo vệ dữ liệu, cơ quan thuế và cơ quan tư pháp.</li>
          <li><strong>Lợi ích sống còn (Art. 6(1)(d)):</strong> Gửi cảnh báo sức khỏe khẩn cấp khi phát hiện nguy cơ đe dọa tính mạng.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Consent (Art. 6(1)(a)):</strong> Biometric, medical, and sensitive data collected only with explicit, voluntary, specific, and revocable consent.</li>
          <li><strong>Contract performance (Art. 6(1)(b)):</strong> Data processed to deliver Digital Twin services per subscription agreement.</li>
          <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> Improving AI models with fully anonymized data. Legitimate Interest Assessment (LIA) conducted.</li>
          <li><strong>Legal obligation (Art. 6(1)(c)):</strong> Complying with data protection authorities, tax authorities, and judicial requirements.</li>
          <li><strong>Vital interests (Art. 6(1)(d)):</strong> Sending emergency health alerts when life-threatening risks are detected.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? 'Xử lý dữ liệu đặc biệt (Điều 9 GDPR)' : 'Special Category Data (Article 9 GDPR)'}>
      {isVi
        ? 'Dữ liệu sức khỏe và sinh trắc được phân loại là "dữ liệu đặc biệt" theo Điều 9 GDPR. Chúng tôi chỉ xử lý loại dữ liệu này trên cơ sở đồng ý rõ ràng (Art. 9(2)(a)) hoặc vì lợi ích sống còn (Art. 9(2)(c)). Đánh giá Tác động Bảo vệ Dữ liệu (DPIA) đã được thực hiện cho tất cả quy trình xử lý dữ liệu đặc biệt theo Điều 35 GDPR.'
        : 'Health and biometric data are classified as "special category data" under Article 9 GDPR. We only process such data based on explicit consent (Art. 9(2)(a)) or vital interests (Art. 9(2)(c)). Data Protection Impact Assessments (DPIA) have been conducted for all special category data processing per Article 35 GDPR.'}
    </LegalSection>

    <LegalSection title={isVi ? 'Chuyển giao dữ liệu quốc tế (Chương V GDPR)' : 'International Data Transfers (Chapter V GDPR)'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Dữ liệu chính được lưu trữ tại datacenter Singapore (AWS ap-southeast-1).</li>
          <li>Việc chuyển giao dữ liệu ra ngoài EEA tuân theo Điều khoản Hợp đồng Tiêu chuẩn (SCC) phiên bản 2021 của Ủy ban Châu Âu.</li>
          <li>Transfer Impact Assessment (TIA) đã được thực hiện cho từng luồng dữ liệu xuyên biên giới.</li>
          <li>Biện pháp bảo vệ bổ sung: mã hóa end-to-end, pseudonymization, và kiểm soát truy cập dựa trên vai trò.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>Primary data stored in Singapore datacenter (AWS ap-southeast-1).</li>
          <li>Data transfers outside the EEA comply with European Commission Standard Contractual Clauses (SCC) 2021 version.</li>
          <li>Transfer Impact Assessment (TIA) conducted for each cross-border data flow.</li>
          <li>Supplementary measures: end-to-end encryption, pseudonymization, and role-based access controls.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? 'Thông báo vi phạm dữ liệu (Điều 33-34 GDPR)' : 'Data Breach Notification (Articles 33-34 GDPR)'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li>Thông báo cho cơ quan giám sát (DPA) trong vòng <strong>72 giờ</strong> kể từ khi phát hiện vi phạm (Điều 33).</li>
          <li>Thông báo cho người dùng bị ảnh hưởng <strong>"không chậm trễ quá mức"</strong> nếu vi phạm có nguy cơ cao ảnh hưởng đến quyền lợi (Điều 34).</li>
          <li>Nội dung thông báo bao gồm: bản chất vi phạm, loại và số lượng dữ liệu bị ảnh hưởng, hậu quả có thể, biện pháp khắc phục đã áp dụng, và khuyến nghị bảo vệ cho người dùng.</li>
          <li>Duy trì Sổ ghi chép Vi phạm Dữ liệu (Breach Register) theo Điều 33(5).</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li>Notify supervisory authority (DPA) within <strong>72 hours</strong> of breach discovery (Article 33).</li>
          <li>Notify affected users <strong>"without undue delay"</strong> if breach poses high risk to their rights (Article 34).</li>
          <li>Notification includes: nature of breach, types and volume of affected data, likely consequences, remediation measures taken, and protection recommendations for users.</li>
          <li>Maintain Data Breach Register per Article 33(5).</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? 'Tuân thủ pháp luật Việt Nam' : 'Vietnam Law Compliance'}>
      {isVi ? (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Luật An ninh mạng 2018 (Luật số 24/2018/QH14):</strong> Tuân thủ đầy đủ các quy định về lưu trữ dữ liệu và bảo vệ thông tin cá nhân trên không gian mạng.</li>
          <li><strong>Nghị định 13/2023/NĐ-CP:</strong> Tuân thủ quy định về bảo vệ dữ liệu cá nhân, bao gồm phân loại dữ liệu, đánh giá tác động, và thông báo vi phạm.</li>
          <li><strong>Luật Giao dịch Điện tử 2023:</strong> Đảm bảo tính hợp pháp của chữ ký điện tử, hợp đồng điện tử và lưu trữ điện tử.</li>
          <li><strong>Luật Khám bệnh, Chữa bệnh 2023:</strong> Tuân thủ quy định về bảo mật hồ sơ bệnh án điện tử (EMR) và chia sẻ dữ liệu y tế.</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Cybersecurity Law 2018 (Law No. 24/2018/QH14):</strong> Full compliance with data storage and personal information protection in cyberspace.</li>
          <li><strong>Decree 13/2023/ND-CP:</strong> Compliance with personal data protection regulations, including data classification, impact assessment, and breach notification.</li>
          <li><strong>Electronic Transactions Law 2023:</strong> Ensuring legal validity of electronic signatures, contracts, and storage.</li>
          <li><strong>Medical Examination & Treatment Law 2023:</strong> Compliance with electronic medical record (EMR) confidentiality and health data sharing regulations.</li>
        </ul>
      )}
    </LegalSection>

    <LegalSection title={isVi ? 'Nhân viên Bảo vệ Dữ liệu (DPO)' : 'Data Protection Officer (DPO)'}>
      {isVi ? (
        <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
          <p><strong>Email:</strong> dpo@saomaihealth.com</p>
          <p><strong>Địa chỉ:</strong> Sao Mai Health Technology Co., Ltd., TP. Hồ Chí Minh, Việt Nam</p>
          <p><strong>Cơ quan giám sát:</strong> Cục An toàn thông tin (AIS), Bộ Thông tin và Truyền thông</p>
          <p className="text-muted-foreground text-xs mt-2">
            Mọi yêu cầu liên quan đến quyền dữ liệu sẽ được xác nhận trong 48 giờ và phản hồi đầy đủ trong 30 ngày làm việc. Bạn có quyền khiếu nại lên cơ quan giám sát nếu không hài lòng với phản hồi của chúng tôi.
          </p>
        </div>
      ) : (
        <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
          <p><strong>Email:</strong> dpo@saomaihealth.com</p>
          <p><strong>Address:</strong> Sao Mai Health Technology Co., Ltd., Ho Chi Minh City, Vietnam</p>
          <p><strong>Supervisory Authority:</strong> Authority of Information Security (AIS), Ministry of Information and Communications</p>
          <p className="text-muted-foreground text-xs mt-2">
            All data rights requests will be acknowledged within 48 hours and fully responded to within 30 business days. You have the right to lodge a complaint with the supervisory authority if unsatisfied with our response.
          </p>
        </div>
      )}
    </LegalSection>
  </div>
);

export default GdprContent;
