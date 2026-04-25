import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Lock, Globe, Scale, Calendar, AlertTriangle } from 'lucide-react';
import TermsContent from '@/components/legal/TermsContent';
import PrivacyContent from '@/components/legal/PrivacyContent';
import GdprContent from '@/components/legal/GdprContent';

const LAST_UPDATED = '2026-03-09';

const Legal: React.FC = () => {
  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Scale className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {isVi ? 'Pháp lý & Chính sách' : 'Legal & Policies'}
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {isVi ? 'Cập nhật lần cuối:' : 'Last updated:'} {LAST_UPDATED}
        </div>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          {isVi
            ? 'Bằng việc sử dụng Sao Mai Health, bạn đồng ý với các điều khoản và chính sách dưới đây. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.'
            : 'By using Sao Mai Health, you agree to the terms and policies below. Please read carefully before using the service.'}
        </p>
      </div>

      <Tabs defaultValue="terms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="terms" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            {isVi ? 'Điều khoản' : 'Terms'}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5 text-xs sm:text-sm">
            <Lock className="h-3.5 w-3.5" />
            {isVi ? 'Quyền riêng tư' : 'Privacy'}
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="gap-1.5 text-xs sm:text-sm">
            <Globe className="h-3.5 w-3.5" />
            GDPR
          </TabsTrigger>
          <TabsTrigger value="disclaimer" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5" />
            {isVi ? 'Miễn trừ' : 'Disclaimer'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {isVi ? 'Điều khoản Sử dụng' : 'Terms of Service'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] pr-4">
                <TermsContent isVi={isVi} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-success" />
                {isVi ? 'Chính sách Quyền riêng tư' : 'Privacy Policy'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] pr-4">
                <PrivacyContent isVi={isVi} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gdpr">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-info" />
                {isVi ? 'Tuân thủ GDPR & Luật Việt Nam' : 'GDPR & Vietnam Law Compliance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] pr-4">
                <GdprContent isVi={isVi} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disclaimer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {isVi ? 'Miễn trừ Trách nhiệm' : 'Disclaimer'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-5">
                    <p className="font-bold text-warning text-base mb-3">
                      {isVi ? '⚠️ TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM Y TẾ' : '⚠️ MEDICAL DISCLAIMER'}
                    </p>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      {isVi ? (
                        <>
                          <p>Sao Mai Health Technology Co., Ltd. KHÔNG phải là cơ sở khám chữa bệnh, phòng khám, hoặc nhà cung cấp dịch vụ y tế được cấp phép theo Luật Khám bệnh, Chữa bệnh 2023.</p>
                          <p>Nền tảng cung cấp công cụ hỗ trợ theo dõi sức khỏe dựa trên công nghệ AI. Mọi thông tin, chỉ số, dự báo và khuyến nghị trên nền tảng:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>KHÔNG thay thế chẩn đoán, điều trị hoặc tư vấn y khoa chuyên nghiệp.</li>
                            <li>KHÔNG được sử dụng làm căn cứ duy nhất cho bất kỳ quyết định y tế nào.</li>
                            <li>Có thể không chính xác do phụ thuộc vào chất lượng dữ liệu đầu vào, điều kiện cảm biến và giới hạn của mô hình AI.</li>
                          </ul>
                          <p className="font-semibold text-foreground mt-3">Trong trường hợp cấp cứu y tế, hãy gọi 115 hoặc đến cơ sở y tế gần nhất ngay lập tức. KHÔNG chờ đợi kết quả từ nền tảng.</p>
                          <p className="mt-2">Sao Mai Health không chịu trách nhiệm về bất kỳ thiệt hại, tổn thất sức khỏe hoặc hậu quả nào phát sinh từ việc sử dụng hoặc tin tưởng hoàn toàn vào thông tin trên nền tảng mà không tham khảo ý kiến bác sĩ có giấy phép hành nghề.</p>
                        </>
                      ) : (
                        <>
                          <p>Sao Mai Health Technology Co., Ltd. is NOT a licensed medical facility, clinic, or healthcare provider under Vietnam's Medical Examination & Treatment Law 2023.</p>
                          <p>The Platform provides AI-powered health monitoring support tools. All information, metrics, predictions, and recommendations on the platform:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Do NOT replace professional medical diagnosis, treatment, or advice.</li>
                            <li>Should NOT be used as the sole basis for any medical decision.</li>
                            <li>May be inaccurate due to input data quality, sensor conditions, and AI model limitations.</li>
                          </ul>
                          <p className="font-semibold text-foreground mt-3">In case of medical emergency, call 115 (Vietnam) or go to the nearest medical facility immediately. Do NOT wait for platform results.</p>
                          <p className="mt-2">Sao Mai Health is not liable for any damages, health losses, or consequences arising from the use of or complete reliance on platform information without consulting a licensed physician.</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-5 text-sm space-y-3">
                    <p className="font-semibold text-foreground">
                      {isVi ? 'Giới hạn trách nhiệm tổng hợp' : 'Aggregate Liability Cap'}
                    </p>
                    <p className="text-muted-foreground">
                      {isVi
                        ? 'Trong mọi trường hợp, tổng trách nhiệm pháp lý tối đa của Sao Mai Health đối với bạn không vượt quá tổng số tiền bạn đã thanh toán cho Nền tảng trong 12 tháng liền trước sự kiện phát sinh trách nhiệm, hoặc 5.000.000 VNĐ (năm triệu đồng), tùy theo giá trị nào lớn hơn. Điều này áp dụng cho tất cả các khiếu nại, bất kể cơ sở pháp lý.'
                        : 'In no event shall Sao Mai Health\'s maximum aggregate liability to you exceed the total amount you paid to the Platform in the 12 months preceding the liability-triggering event, or VND 5,000,000 (five million dong), whichever is greater. This applies to all claims regardless of legal basis.'}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compliance Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {[
          'HIPAA Ready',
          'GDPR',
          'ISO 27001',
          'SOC 2 Type II',
          'PDPA Vietnam',
          'Nghị định 13/2023',
        ].map(badge => (
          <Badge key={badge} variant="outline" className="text-xs gap-1.5 py-1 px-3">
            <Shield className="h-3 w-3 text-success" />
            {badge}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default Legal;
