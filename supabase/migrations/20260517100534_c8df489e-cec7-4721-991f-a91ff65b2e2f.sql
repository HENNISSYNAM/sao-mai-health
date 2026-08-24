
-- Helper: many tables locked to admin-only
-- Uses existing public.is_admin(uuid)

-- ===== patients =====
DROP POLICY IF EXISTS "Healthcare staff can view patients" ON public.patients;
DROP POLICY IF EXISTS "Healthcare staff can update patients" ON public.patients;
DROP POLICY IF EXISTS "Healthcare staff can create patients" ON public.patients;
CREATE POLICY "Admins manage patients" ON public.patients FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== patient_documents =====
DROP POLICY IF EXISTS "Healthcare staff can view patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Healthcare staff can upload patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Healthcare staff can update patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Healthcare staff can delete patient documents" ON public.patient_documents;
CREATE POLICY "Admins manage patient_documents" ON public.patient_documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== bhyt_records =====
DROP POLICY IF EXISTS "Healthcare staff can manage BHYT records" ON public.bhyt_records;
CREATE POLICY "Admins manage bhyt_records" ON public.bhyt_records FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== vneid_integrations =====
DROP POLICY IF EXISTS "Healthcare staff can manage VNeID integrations" ON public.vneid_integrations;
CREATE POLICY "Admins manage vneid_integrations" ON public.vneid_integrations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== his_integrations =====
DROP POLICY IF EXISTS "Healthcare staff can manage HIS integrations" ON public.his_integrations;
CREATE POLICY "Admins manage his_integrations" ON public.his_integrations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== fhir_resources / hl7_messages / dicom_studies =====
DROP POLICY IF EXISTS "Healthcare staff can manage FHIR resources" ON public.fhir_resources;
CREATE POLICY "Admins manage fhir_resources" ON public.fhir_resources FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Healthcare staff can manage HL7 messages" ON public.hl7_messages;
CREATE POLICY "Admins manage hl7_messages" ON public.hl7_messages FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Healthcare staff can manage DICOM studies" ON public.dicom_studies;
CREATE POLICY "Admins manage dicom_studies" ON public.dicom_studies FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== security_audits =====
DROP POLICY IF EXISTS "Healthcare staff can view security audits" ON public.security_audits;
CREATE POLICY "Admins view security_audits" ON public.security_audits FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ===== evaluations / employees =====
DROP POLICY IF EXISTS "Allow public read access to evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Allow public insert to evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Allow public update to evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Allow public delete to evaluations" ON public.evaluations;
CREATE POLICY "Admins manage evaluations" ON public.evaluations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow public read access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public insert to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public update to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public delete to employees" ON public.employees;
CREATE POLICY "Admins manage employees" ON public.employees FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== edu_discount_usage =====
DROP POLICY IF EXISTS "Public can check edu discount usage" ON public.edu_discount_usage;
DROP POLICY IF EXISTS "Public can create edu discount usage" ON public.edu_discount_usage;
CREATE POLICY "Admins view edu_discount_usage" ON public.edu_discount_usage FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated insert edu_discount_usage" ON public.edu_discount_usage FOR INSERT TO authenticated
  WITH CHECK (true);

-- ===== campaigns / campaign_slots / campaign_checkins =====
DROP POLICY IF EXISTS "Public can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage campaign slots" ON public.campaign_slots;
CREATE POLICY "Admins manage campaign_slots" ON public.campaign_slots FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage campaign checkins" ON public.campaign_checkins;
CREATE POLICY "Admins manage campaign_checkins" ON public.campaign_checkins FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== dq_rules / dq_errors / etl_queue / inventory_* / stock_movements / temperature_alerts =====
DROP POLICY IF EXISTS "Public can manage DQ rules" ON public.dq_rules;
CREATE POLICY "Admins manage dq_rules" ON public.dq_rules FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage DQ errors" ON public.dq_errors;
CREATE POLICY "Admins manage dq_errors" ON public.dq_errors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage ETL queue" ON public.etl_queue;
CREATE POLICY "Admins manage etl_queue" ON public.etl_queue FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage inventory items" ON public.inventory_items;
CREATE POLICY "Admins manage inventory_items" ON public.inventory_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage inventory stock" ON public.inventory_stock;
CREATE POLICY "Admins manage inventory_stock" ON public.inventory_stock FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage stock movements" ON public.stock_movements;
CREATE POLICY "Admins manage stock_movements" ON public.stock_movements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public can manage temperature alerts" ON public.temperature_alerts;
CREATE POLICY "Admins manage temperature_alerts" ON public.temperature_alerts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== lots =====
DROP POLICY IF EXISTS "Authenticated users can manage lots" ON public.lots;
DROP POLICY IF EXISTS "Public can view lots" ON public.lots;
CREATE POLICY "Public read lots" ON public.lots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write lots" ON public.lots FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update lots" ON public.lots FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete lots" ON public.lots FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ===== food_qr_codes =====
DROP POLICY IF EXISTS "Public update food QR codes" ON public.food_qr_codes;
CREATE POLICY "Owners update food_qr_codes" ON public.food_qr_codes FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- ===== stroke_alert_subscribers =====
DROP POLICY IF EXISTS "Users can view own subscriber data" ON public.stroke_alert_subscribers;
CREATE POLICY "Users view own stroke_alert_subscribers" ON public.stroke_alert_subscribers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ===== subscriptions =====
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ===== quotes =====
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create quotes" ON public.quotes;
CREATE POLICY "Users view own quotes" ON public.quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own quotes" ON public.quotes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own quotes" ON public.quotes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== orders: remove anon SELECT =====
DROP POLICY IF EXISTS "orders_select_public" ON public.orders;

-- ===== wallets: remove direct UPDATE =====
DROP POLICY IF EXISTS "wal_upd" ON public.wallets;

-- ===== Storage bucket: patient-documents → admin only =====
DROP POLICY IF EXISTS "Authenticated users can view patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient documents" ON storage.objects;
CREATE POLICY "Admins read patient-documents bucket" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-documents' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins write patient-documents bucket" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-documents' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins update patient-documents bucket" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-documents' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete patient-documents bucket" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-documents' AND public.is_admin(auth.uid()));
