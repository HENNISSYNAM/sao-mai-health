export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string | null
          id: number
          role: string
          session_id: string | null
          tokens: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          role: string
          session_id?: string | null
          tokens?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          role?: string
          session_id?: string | null
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sessions: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          avg7: number | null
          cases: number
          closed_at: string | null
          created_at: string
          day: string
          disease_code: string
          district_id: string | null
          id: string
          rule: string | null
          status: string
          ward_id: string | null
        }
        Insert: {
          avg7?: number | null
          cases: number
          closed_at?: string | null
          created_at?: string
          day: string
          disease_code: string
          district_id?: string | null
          id?: string
          rule?: string | null
          status?: string
          ward_id?: string | null
        }
        Update: {
          avg7?: number | null
          cases?: number
          closed_at?: string | null
          created_at?: string
          day?: string
          disease_code?: string
          district_id?: string | null
          id?: string
          rule?: string | null
          status?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_disease_code_fkey"
            columns: ["disease_code"]
            isOneToOne: false
            referencedRelation: "ref_diseases"
            referencedColumns: ["code"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          doctor: string | null
          facility: string
          id: string
          no_show_risk: number | null
          overbook_suggestion: number | null
          patient_name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          doctor?: string | null
          facility: string
          id?: string
          no_show_risk?: number | null
          overbook_suggestion?: number | null
          patient_name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          doctor?: string | null
          facility?: string
          id?: string
          no_show_risk?: number | null
          overbook_suggestion?: number | null
          patient_name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      baseline_stats: {
        Row: {
          mu: number | null
          n: number | null
          sigma: number | null
          signal: string
          updated_at: string | null
          zone_id: string
        }
        Insert: {
          mu?: number | null
          n?: number | null
          sigma?: number | null
          signal: string
          updated_at?: string | null
          zone_id: string
        }
        Update: {
          mu?: number | null
          n?: number | null
          sigma?: number | null
          signal?: string
          updated_at?: string | null
          zone_id?: string
        }
        Relationships: []
      }
      bhyt_records: {
        Row: {
          benefit_level: string | null
          bhyt_number: string
          card_number: string | null
          created_at: string | null
          district_code: string | null
          hospital_code: string | null
          id: string
          last_verified: string | null
          patient_id: string | null
          province_code: string | null
          status: Database["public"]["Enums"]["integration_status"] | null
          valid_from: string | null
          valid_to: string | null
          verification_data: Json | null
          ward_code: string | null
        }
        Insert: {
          benefit_level?: string | null
          bhyt_number: string
          card_number?: string | null
          created_at?: string | null
          district_code?: string | null
          hospital_code?: string | null
          id?: string
          last_verified?: string | null
          patient_id?: string | null
          province_code?: string | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          valid_from?: string | null
          valid_to?: string | null
          verification_data?: Json | null
          ward_code?: string | null
        }
        Update: {
          benefit_level?: string | null
          bhyt_number?: string
          card_number?: string | null
          created_at?: string | null
          district_code?: string | null
          hospital_code?: string | null
          id?: string
          last_verified?: string | null
          patient_id?: string | null
          province_code?: string | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          valid_from?: string | null
          valid_to?: string | null
          verification_data?: Json | null
          ward_code?: string | null
        }
        Relationships: []
      }
      buyback_merchants: {
        Row: {
          company_name: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyback_merchants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      buyback_offers: {
        Row: {
          active: boolean
          budget_vnd: number
          created_at: string | null
          id: string
          merchant_id: string
          price_vnd_per_point: number
        }
        Insert: {
          active?: boolean
          budget_vnd: number
          created_at?: string | null
          id?: string
          merchant_id: string
          price_vnd_per_point: number
        }
        Update: {
          active?: boolean
          budget_vnd?: number
          created_at?: string | null
          id?: string
          merchant_id?: string
          price_vnd_per_point?: number
        }
        Relationships: [
          {
            foreignKeyName: "buyback_offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "buyback_merchants"
            referencedColumns: ["user_id"]
          },
        ]
      }
      buyback_orders: {
        Row: {
          created_at: string | null
          id: string
          merchant_id: string
          offer_id: string
          payout_vnd: number
          points: number
          price_vnd_per_point: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          merchant_id: string
          offer_id: string
          payout_vnd: number
          points: number
          price_vnd_per_point: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          merchant_id?: string
          offer_id?: string
          payout_vnd?: number
          points?: number
          price_vnd_per_point?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyback_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "buyback_merchants"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "buyback_orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "buyback_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyback_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_checkins: {
        Row: {
          campaign_id: string
          check_in_time: string
          created_at: string
          id: string
          offline_sync: boolean | null
          participant_name: string
          phone: string | null
          qr_code: string | null
          ward: string
        }
        Insert: {
          campaign_id: string
          check_in_time?: string
          created_at?: string
          id?: string
          offline_sync?: boolean | null
          participant_name: string
          phone?: string | null
          qr_code?: string | null
          ward: string
        }
        Update: {
          campaign_id?: string
          check_in_time?: string
          created_at?: string
          id?: string
          offline_sync?: boolean | null
          participant_name?: string
          phone?: string | null
          qr_code?: string | null
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_checkins_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_slots: {
        Row: {
          allocated_slots: number
          campaign_id: string
          capacity_constraint: number | null
          created_at: string
          id: string
          total_slots: number
          ward: string
        }
        Insert: {
          allocated_slots?: number
          campaign_id: string
          capacity_constraint?: number | null
          created_at?: string
          id?: string
          total_slots?: number
          ward: string
        }
        Update: {
          allocated_slots?: number
          campaign_id?: string
          capacity_constraint?: number | null
          created_at?: string
          id?: string
          total_slots?: number
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_slots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          priority_groups: Json | null
          start_date: string
          status: string
          target_participants: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          priority_groups?: Json | null
          start_date: string
          status?: string
          target_participants?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          priority_groups?: Json | null
          start_date?: string
          status?: string
          target_participants?: number
          updated_at?: string
        }
        Relationships: []
      }
      case_events: {
        Row: {
          disease_code: string
          district_id: string | null
          facility_id: string | null
          geom: unknown
          id: string
          lat: number | null
          lon: number | null
          occurred_at: string
          patient_age_bucket: string | null
          patient_gender: string | null
          patient_hash: string | null
          patient_id: string | null
          source: string | null
          symptoms: Json | null
          ward_id: string | null
        }
        Insert: {
          disease_code: string
          district_id?: string | null
          facility_id?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lon?: number | null
          occurred_at?: string
          patient_age_bucket?: string | null
          patient_gender?: string | null
          patient_hash?: string | null
          patient_id?: string | null
          source?: string | null
          symptoms?: Json | null
          ward_id?: string | null
        }
        Update: {
          disease_code?: string
          district_id?: string | null
          facility_id?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lon?: number | null
          occurred_at?: string
          patient_age_bucket?: string | null
          patient_gender?: string | null
          patient_hash?: string | null
          patient_id?: string | null
          source?: string | null
          symptoms?: Json | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_events_disease_code_fkey"
            columns: ["disease_code"]
            isOneToOne: false
            referencedRelation: "ref_diseases"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "case_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "health_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      convoys: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          eta: string | null
          id: string
          members: string[] | null
          name: string
          track: Json | null
          updated_at: string
          visible_public: boolean | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          eta?: string | null
          id?: string
          members?: string[] | null
          name: string
          track?: Json | null
          updated_at?: string
          visible_public?: boolean | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          eta?: string | null
          id?: string
          members?: string[] | null
          name?: string
          track?: Json | null
          updated_at?: string
          visible_public?: boolean | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          id: string
          points_saved: number
          reward_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          points_saved: number
          reward_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          points_saved?: number
          reward_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "user_reward_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_points_required: number | null
          title: string
          updated_at: string | null
          used_count: number | null
          valid_from: string | null
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_points_required?: number | null
          title: string
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_points_required?: number | null
          title?: string
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      daily_counts: {
        Row: {
          cases: number
          day: string
          disease_code: string
          district_id: string
          ward_id: string
        }
        Insert: {
          cases?: number
          day: string
          disease_code: string
          district_id?: string
          ward_id?: string
        }
        Update: {
          cases?: number
          day?: string
          disease_code?: string
          district_id?: string
          ward_id?: string
        }
        Relationships: []
      }
      data_quality_scores: {
        Row: {
          created_at: string | null
          error_count: number
          facility_id: string
          id: string
          quality_score: number | null
          score_date: string
          table_name: string
          total_records: number
        }
        Insert: {
          created_at?: string | null
          error_count: number
          facility_id: string
          id?: string
          quality_score?: number | null
          score_date: string
          table_name: string
          total_records: number
        }
        Update: {
          created_at?: string | null
          error_count?: number
          facility_id?: string
          id?: string
          quality_score?: number | null
          score_date?: string
          table_name?: string
          total_records?: number
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          actual_co2_kg: number | null
          completed_at: string | null
          created_at: string | null
          estimated_co2_kg: number | null
          id: string
          route_name: string
          shipper_id: string | null
          start_lat: number | null
          start_lng: number | null
          start_location: string
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          total_distance_km: number | null
          vehicle_type: string
        }
        Insert: {
          actual_co2_kg?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_co2_kg?: number | null
          id?: string
          route_name: string
          shipper_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_location: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          total_distance_km?: number | null
          vehicle_type?: string
        }
        Update: {
          actual_co2_kg?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_co2_kg?: number | null
          id?: string
          route_name?: string
          shipper_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_location?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          total_distance_km?: number | null
          vehicle_type?: string
        }
        Relationships: []
      }
      dicom_studies: {
        Row: {
          accession_number: string | null
          created_at: string | null
          file_path: string | null
          file_size: number | null
          id: string
          images_count: number | null
          institution_name: string | null
          modality: string | null
          patient_id: string | null
          referring_physician: string | null
          series_count: number | null
          status: Database["public"]["Enums"]["integration_status"] | null
          study_date: string | null
          study_description: string | null
          study_instance_uid: string
          study_time: string | null
        }
        Insert: {
          accession_number?: string | null
          created_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          images_count?: number | null
          institution_name?: string | null
          modality?: string | null
          patient_id?: string | null
          referring_physician?: string | null
          series_count?: number | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          study_date?: string | null
          study_description?: string | null
          study_instance_uid: string
          study_time?: string | null
        }
        Update: {
          accession_number?: string | null
          created_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          images_count?: number | null
          institution_name?: string | null
          modality?: string | null
          patient_id?: string | null
          referring_physician?: string | null
          series_count?: number | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          study_date?: string | null
          study_description?: string | null
          study_instance_uid?: string
          study_time?: string | null
        }
        Relationships: []
      }
      dq_errors: {
        Row: {
          created_at: string | null
          error_message: string
          error_type: string
          facility_id: string | null
          field_name: string | null
          fixed_at: string | null
          fixed_by: string | null
          id: string
          original_value: string | null
          record_id: string | null
          rule_id: string | null
          severity: string
          status: string | null
          suggested_value: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_type: string
          facility_id?: string | null
          field_name?: string | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          original_value?: string | null
          record_id?: string | null
          rule_id?: string | null
          severity: string
          status?: string | null
          suggested_value?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_type?: string
          facility_id?: string | null
          field_name?: string | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          original_value?: string | null
          record_id?: string | null
          rule_id?: string | null
          severity?: string
          status?: string | null
          suggested_value?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "dq_errors_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "dq_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_rules: {
        Row: {
          column_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          rule_config: Json
          rule_name: string
          rule_type: string
          severity: string | null
          table_name: string
        }
        Insert: {
          column_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_config?: Json
          rule_name: string
          rule_type: string
          severity?: string | null
          table_name: string
        }
        Update: {
          column_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_config?: Json
          rule_name?: string
          rule_type?: string
          severity?: string | null
          table_name?: string
        }
        Relationships: []
      }
      edu_discount_usage: {
        Row: {
          applied_at: string
          discount_amount: number
          domain: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          applied_at?: string
          discount_amount?: number
          domain: string
          email: string
          expires_at?: string
          id?: string
        }
        Update: {
          applied_at?: string
          discount_amount?: number
          domain?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      edu_discounts: {
        Row: {
          applied_at: string
          discount_amount: number
          domain: string
          eligible: boolean
          email: string
          expires_at: string
          id: number
        }
        Insert: {
          applied_at?: string
          discount_amount?: number
          domain: string
          eligible?: boolean
          email: string
          expires_at: string
          id?: number
        }
        Update: {
          applied_at?: string
          discount_amount?: number
          domain?: string
          eligible?: boolean
          email?: string
          expires_at?: string
          id?: number
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          department: string
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      esg_initiatives: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          deadline: string
          description: string | null
          id: string
          impact: string
          metrics: Json | null
          notes: string | null
          progress: number
          start_date: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          deadline: string
          description?: string | null
          id?: string
          impact: string
          metrics?: Json | null
          notes?: string | null
          progress?: number
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string
          description?: string | null
          id?: string
          impact?: string
          metrics?: Json | null
          notes?: string | null
          progress?: number
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      etl_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          error_rows: number | null
          file_path: string | null
          id: string
          job_type: string
          max_retries: number | null
          metadata: Json | null
          processed_rows: number | null
          progress: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          total_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          error_rows?: number | null
          file_path?: string | null
          id?: string
          job_type: string
          max_retries?: number | null
          metadata?: Json | null
          processed_rows?: number | null
          progress?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          total_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          error_rows?: number | null
          file_path?: string | null
          id?: string
          job_type?: string
          max_retries?: number | null
          metadata?: Json | null
          processed_rows?: number | null
          progress?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          total_rows?: number | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          ai_insights: string | null
          ai_sentiment: string | null
          ai_sentiment_score: number | null
          created_at: string
          employee_id: string
          feedback_score: number
          final_score: number
          id: string
          kpi_score: number
          regression_score: number
          team_effectiveness: number
          work_hours: number
        }
        Insert: {
          ai_insights?: string | null
          ai_sentiment?: string | null
          ai_sentiment_score?: number | null
          created_at?: string
          employee_id: string
          feedback_score: number
          final_score: number
          id?: string
          kpi_score: number
          regression_score: number
          team_effectiveness: number
          work_hours: number
        }
        Update: {
          ai_insights?: string | null
          ai_sentiment?: string | null
          ai_sentiment_score?: number | null
          created_at?: string
          employee_id?: string
          feedback_score?: number
          final_score?: number
          id?: string
          kpi_score?: number
          regression_score?: number
          team_effectiveness?: number
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          co2e_kg: number
          id: string
          name: string | null
          props: Json
          sub_type: string
          ts: string
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          category: string
          co2e_kg?: number
          id?: string
          name?: string | null
          props?: Json
          sub_type: string
          ts?: string
          unit: string
          user_id: string
          value: number
        }
        Update: {
          category?: string
          co2e_kg?: number
          id?: string
          name?: string | null
          props?: Json
          sub_type?: string
          ts?: string
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      factors: {
        Row: {
          category: string
          country: string | null
          id: number
          key: string
          label: string | null
          unit: string
          value_kg_per_unit: number
          year: number | null
        }
        Insert: {
          category: string
          country?: string | null
          id?: number
          key: string
          label?: string | null
          unit: string
          value_kg_per_unit: number
          year?: number | null
        }
        Update: {
          category?: string
          country?: string | null
          id?: number
          key?: string
          label?: string | null
          unit?: string
          value_kg_per_unit?: number
          year?: number | null
        }
        Relationships: []
      }
      fhir_resources: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          patient_id: string | null
          resource_content: Json
          resource_id: string
          resource_type: Database["public"]["Enums"]["fhir_resource_type"]
          status: Database["public"]["Enums"]["integration_status"] | null
          version_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          patient_id?: string | null
          resource_content: Json
          resource_id: string
          resource_type: Database["public"]["Enums"]["fhir_resource_type"]
          status?: Database["public"]["Enums"]["integration_status"] | null
          version_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          patient_id?: string | null
          resource_content?: Json
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["fhir_resource_type"]
          status?: Database["public"]["Enums"]["integration_status"] | null
          version_id?: string | null
        }
        Relationships: []
      }
      flood_zones: {
        Row: {
          active: boolean
          affected_area: string
          created_at: string
          created_by: string | null
          current_water_level: number
          forecast: string
          id: string
          lat: number
          lng: number
          peak_time: string
          population_at_risk: number
          predicted_water_level: number
          risk_level: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          affected_area: string
          created_at?: string
          created_by?: string | null
          current_water_level: number
          forecast: string
          id?: string
          lat: number
          lng: number
          peak_time: string
          population_at_risk?: number
          predicted_water_level: number
          risk_level: string
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          affected_area?: string
          created_at?: string
          created_by?: string | null
          current_water_level?: number
          forecast?: string
          id?: string
          lat?: number
          lng?: number
          peak_time?: string
          population_at_risk?: number
          predicted_water_level?: number
          risk_level?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      food_qr_codes: {
        Row: {
          created_at: string
          created_by: string | null
          current_co2_kg: number
          food_items: Json
          gps_accuracy: number | null
          gps_address: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_recorded_at: string | null
          green_credits: number | null
          id: string
          image_url: string | null
          initial_calories: number
          initial_co2_kg: number
          last_printed_at: string | null
          print_count: number
          product_name: string
          qr_code_id: string
          scan_count: number
          status: string
          total_weight_kg: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_co2_kg?: number
          food_items?: Json
          gps_accuracy?: number | null
          gps_address?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_recorded_at?: string | null
          green_credits?: number | null
          id?: string
          image_url?: string | null
          initial_calories?: number
          initial_co2_kg?: number
          last_printed_at?: string | null
          print_count?: number
          product_name: string
          qr_code_id: string
          scan_count?: number
          status?: string
          total_weight_kg?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_co2_kg?: number
          food_items?: Json
          gps_accuracy?: number | null
          gps_address?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_recorded_at?: string | null
          green_credits?: number | null
          id?: string
          image_url?: string | null
          initial_calories?: number
          initial_co2_kg?: number
          last_printed_at?: string | null
          print_count?: number
          product_name?: string
          qr_code_id?: string
          scan_count?: number
          status?: string
          total_weight_kg?: number
        }
        Relationships: []
      }
      food_qr_scans: {
        Row: {
          added_co2_kg: number
          address: string | null
          distance_from_previous_km: number | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          qr_code_id: string
          scanned_at: string
          transport_type: string | null
          user_agent: string | null
        }
        Insert: {
          added_co2_kg?: number
          address?: string | null
          distance_from_previous_km?: number | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          qr_code_id: string
          scanned_at?: string
          transport_type?: string | null
          user_agent?: string | null
        }
        Update: {
          added_co2_kg?: number
          address?: string | null
          distance_from_previous_km?: number | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          qr_code_id?: string
          scanned_at?: string
          transport_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      health_alert: {
        Row: {
          alert_id: number
          band: string
          created_at: string | null
          date: string
          message: string | null
          metric: string
          zone_id: string | null
        }
        Insert: {
          alert_id?: number
          band: string
          created_at?: string | null
          date: string
          message?: string | null
          metric: string
          zone_id?: string | null
        }
        Update: {
          alert_id?: number
          band?: string
          created_at?: string | null
          date?: string
          message?: string | null
          metric?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      health_facilities: {
        Row: {
          address: string | null
          code: string | null
          district_id: string | null
          geom: unknown
          id: string
          lat: number | null
          lon: number | null
          name: string
          type: string | null
          ward_id: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          district_id?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lon?: number | null
          name: string
          type?: string | null
          ward_id?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          district_id?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lon?: number | null
          name?: string
          type?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_facilities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "ref_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_facilities_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "ref_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      health_news_articles: {
        Row: {
          article_hash: string
          classification: string | null
          content_summary: string | null
          crawled_at: string
          created_at: string
          disease_type: string | null
          id: string
          location: string | null
          processed: boolean | null
          published_at: string | null
          raw_content: string | null
          severity: string | null
          source: string
          title: string
          url: string
        }
        Insert: {
          article_hash: string
          classification?: string | null
          content_summary?: string | null
          crawled_at?: string
          created_at?: string
          disease_type?: string | null
          id?: string
          location?: string | null
          processed?: boolean | null
          published_at?: string | null
          raw_content?: string | null
          severity?: string | null
          source: string
          title: string
          url: string
        }
        Update: {
          article_hash?: string
          classification?: string | null
          content_summary?: string | null
          crawled_at?: string
          created_at?: string
          disease_type?: string | null
          id?: string
          location?: string | null
          processed?: boolean | null
          published_at?: string | null
          raw_content?: string | null
          severity?: string | null
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      his_integrations: {
        Row: {
          api_key_encrypted: string | null
          configuration: Json | null
          created_at: string | null
          endpoint_url: string | null
          facility_id: string | null
          id: string
          last_sync: string | null
          status: Database["public"]["Enums"]["integration_status"] | null
          sync_interval: number | null
          system_name: string
          system_type: string
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          configuration?: Json | null
          created_at?: string | null
          endpoint_url?: string | null
          facility_id?: string | null
          id?: string
          last_sync?: string | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          sync_interval?: number | null
          system_name: string
          system_type: string
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          configuration?: Json | null
          created_at?: string | null
          endpoint_url?: string | null
          facility_id?: string | null
          id?: string
          last_sync?: string | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          sync_interval?: number | null
          system_name?: string
          system_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hl7_messages: {
        Row: {
          ack_code: string | null
          created_at: string | null
          error_message: string | null
          facility_id: string | null
          id: string
          message_content: string
          message_type: Database["public"]["Enums"]["hl7_message_type"]
          patient_id: string | null
          received_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["integration_status"] | null
        }
        Insert: {
          ack_code?: string | null
          created_at?: string | null
          error_message?: string | null
          facility_id?: string | null
          id?: string
          message_content: string
          message_type: Database["public"]["Enums"]["hl7_message_type"]
          patient_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["integration_status"] | null
        }
        Update: {
          ack_code?: string | null
          created_at?: string | null
          error_message?: string | null
          facility_id?: string | null
          id?: string
          message_content?: string
          message_type?: Database["public"]["Enums"]["hl7_message_type"]
          patient_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["integration_status"] | null
        }
        Relationships: []
      }
      icd_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          parent_code: string | null
          title: string
          version: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          parent_code?: string | null
          title: string
          version: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          parent_code?: string | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          key: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          key: string
          sender_id: string
        }
        Update: {
          created_at?: string
          key?: string
          sender_id?: string
        }
        Relationships: []
      }
      inbound_collections: {
        Row: {
          actual_kg: number | null
          co2_saved_kg: number | null
          collected_at: string | null
          collection_photos: string[] | null
          collection_status:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          collection_type: Database["public"]["Enums"]["collection_type"]
          created_at: string | null
          estimated_kg: number | null
          id: string
          outbound_delivery_id: string | null
          quality_score: number | null
          reward_points: number | null
          route_id: string | null
        }
        Insert: {
          actual_kg?: number | null
          co2_saved_kg?: number | null
          collected_at?: string | null
          collection_photos?: string[] | null
          collection_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          collection_type: Database["public"]["Enums"]["collection_type"]
          created_at?: string | null
          estimated_kg?: number | null
          id?: string
          outbound_delivery_id?: string | null
          quality_score?: number | null
          reward_points?: number | null
          route_id?: string | null
        }
        Update: {
          actual_kg?: number | null
          co2_saved_kg?: number | null
          collected_at?: string | null
          collection_photos?: string[] | null
          collection_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          collection_type?: Database["public"]["Enums"]["collection_type"]
          created_at?: string | null
          estimated_kg?: number | null
          id?: string
          outbound_delivery_id?: string | null
          quality_score?: number | null
          reward_points?: number | null
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_collections_outbound_delivery_id_fkey"
            columns: ["outbound_delivery_id"]
            isOneToOne: false
            referencedRelation: "outbound_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_collections_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          code: string
          cost_per_unit: number | null
          created_at: string | null
          expiry_alert_days: number | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          max_stock: number
          max_temp: number | null
          min_temp: number | null
          name: string
          reorder_point: number
          storage_type: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_alert_days?: number | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          max_stock?: number
          max_temp?: number | null
          min_temp?: number | null
          name: string
          reorder_point?: number
          storage_type?: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_alert_days?: number | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          max_stock?: number
          max_temp?: number | null
          min_temp?: number | null
          name?: string
          reorder_point?: number
          storage_type?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_stock: {
        Row: {
          available_quantity: number | null
          batch_no: string | null
          created_at: string | null
          expiry_date: string | null
          facility_id: string
          id: string
          item_id: string
          last_temp_check: string | null
          quantity: number
          reserved_quantity: number
          temperature_log: Json | null
          unit_cost: number | null
          updated_at: string | null
          ward_id: string | null
        }
        Insert: {
          available_quantity?: number | null
          batch_no?: string | null
          created_at?: string | null
          expiry_date?: string | null
          facility_id: string
          id?: string
          item_id: string
          last_temp_check?: string | null
          quantity?: number
          reserved_quantity?: number
          temperature_log?: Json | null
          unit_cost?: number | null
          updated_at?: string | null
          ward_id?: string | null
        }
        Update: {
          available_quantity?: number | null
          batch_no?: string | null
          created_at?: string | null
          expiry_date?: string | null
          facility_id?: string
          id?: string
          item_id?: string
          last_temp_check?: string | null
          quantity?: number
          reserved_quantity?: number
          temperature_log?: Json | null
          unit_cost?: number | null
          updated_at?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lot_photos: {
        Row: {
          created_at: string | null
          id: string
          lot_id: string | null
          role: string
          sha256: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lot_id?: string | null
          role: string
          sha256: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lot_id?: string | null
          role?: string
          sha256?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_photos_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          cleanliness_score: number | null
          co2e_est: number | null
          created_at: string | null
          est_kg: number | null
          id: string
          issued_at: string | null
          moisture_pct: number | null
          net_kg: number | null
          qr_code: string
          receipt_url: string | null
          source_type: string
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          cleanliness_score?: number | null
          co2e_est?: number | null
          created_at?: string | null
          est_kg?: number | null
          id?: string
          issued_at?: string | null
          moisture_pct?: number | null
          net_kg?: number | null
          qr_code: string
          receipt_url?: string | null
          source_type: string
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          cleanliness_score?: number | null
          co2e_est?: number | null
          created_at?: string | null
          est_kg?: number | null
          id?: string
          issued_at?: string | null
          moisture_pct?: number | null
          net_kg?: number | null
          qr_code?: string
          receipt_url?: string | null
          source_type?: string
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: []
      }
      map_overlays: {
        Row: {
          id: string
          image_url: string
          ne_lat: number
          ne_lng: number
          opacity: number
          sw_lat: number
          sw_lng: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id: string
          image_url: string
          ne_lat: number
          ne_lng: number
          opacity?: number
          sw_lat: number
          sw_lng: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          image_url?: string
          ne_lat?: number
          ne_lng?: number
          opacity?: number
          sw_lat?: number
          sw_lng?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      observations: {
        Row: {
          geom: unknown
          id: string
          lat: number
          lon: number
          observed_at: string
          props: Json
        }
        Insert: {
          geom?: unknown
          id?: string
          lat: number
          lon: number
          observed_at?: string
          props?: Json
        }
        Update: {
          geom?: unknown
          id?: string
          lat?: number
          lon?: number
          observed_at?: string
          props?: Json
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          amount: number | null
          city: string | null
          created_at: string
          customer_name: string | null
          email: string
          id: string
          idea_summary: string | null
          name: string
          notes: string | null
          order_code: string | null
          order_status: string | null
          order_type: string | null
          payment_method: string | null
          payment_ref: string | null
          payment_status: string
          phone: string | null
          product: string
          product_name: string | null
          qty: number | null
          quantity: number
          shipping_fee: number | null
          source: string | null
          status: string | null
          total_amount: number | null
          transfer_proof_url: string | null
          transferred_amount: number | null
          unit_price: number | null
          user_id: string | null
          variant: string | null
        }
        Insert: {
          address?: string | null
          amount?: number | null
          city?: string | null
          created_at?: string
          customer_name?: string | null
          email: string
          id?: string
          idea_summary?: string | null
          name: string
          notes?: string | null
          order_code?: string | null
          order_status?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string
          phone?: string | null
          product: string
          product_name?: string | null
          qty?: number | null
          quantity?: number
          shipping_fee?: number | null
          source?: string | null
          status?: string | null
          total_amount?: number | null
          transfer_proof_url?: string | null
          transferred_amount?: number | null
          unit_price?: number | null
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          address?: string | null
          amount?: number | null
          city?: string | null
          created_at?: string
          customer_name?: string | null
          email?: string
          id?: string
          idea_summary?: string | null
          name?: string
          notes?: string | null
          order_code?: string | null
          order_status?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string
          phone?: string | null
          product?: string
          product_name?: string | null
          qty?: number | null
          quantity?: number
          shipping_fee?: number | null
          source?: string | null
          status?: string | null
          total_amount?: number | null
          transfer_proof_url?: string | null
          transferred_amount?: number | null
          unit_price?: number | null
          user_id?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      outbound_deliveries: {
        Row: {
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_status: Database["public"]["Enums"]["delivery_status"] | null
          id: string
          order_id: string | null
          product_details: Json | null
          route_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          id?: string
          order_id?: string | null
          product_details?: Json | null
          route_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          id?: string
          order_id?: string | null
          product_details?: Json | null
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_deliveries_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          document_name: string
          document_type: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          notes: string | null
          patient_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_name: string
          document_type?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          birth_year: number | null
          created_at: string
          facility_id: string | null
          full_name: string
          gender: string | null
          id: string
          mpi_hash: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          facility_id?: string | null
          full_name: string
          gender?: string | null
          id?: string
          mpi_hash: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          facility_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          mpi_hash?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          district_id: string | null
          h3: string | null
          id: string
          label: string | null
          lat: number
          lon: number
          model_version: string
          obs_id: string | null
          predicted: number
          ward_id: string | null
        }
        Insert: {
          created_at?: string
          district_id?: string | null
          h3?: string | null
          id?: string
          label?: string | null
          lat: number
          lon: number
          model_version: string
          obs_id?: string | null
          predicted: number
          ward_id?: string | null
        }
        Update: {
          created_at?: string
          district_id?: string | null
          h3?: string | null
          id?: string
          label?: string | null
          lat?: number
          lon?: number
          model_version?: string
          obs_id?: string | null
          predicted?: number
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_obs_id_fkey"
            columns: ["obs_id"]
            isOneToOne: false
            referencedRelation: "observations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string | null
          id: string
          packaging_co2_kg: number
          product_id: string
          production_co2_kg: number
          production_date: string
          status: string
          total_co2_kg: number | null
          transport_co2_kg: number
          updated_at: string
          weight_kg: number
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          packaging_co2_kg?: number
          product_id: string
          production_co2_kg?: number
          production_date: string
          status?: string
          total_co2_kg?: number | null
          transport_co2_kg?: number
          updated_at?: string
          weight_kg: number
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          packaging_co2_kg?: number
          product_id?: string
          production_co2_kg?: number
          production_date?: string
          status?: string
          total_co2_kg?: number | null
          transport_co2_kg?: number
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          factory_address: string | null
          factory_coordinates: unknown
          factory_name: string | null
          hs_code: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          factory_address?: string | null
          factory_coordinates?: unknown
          factory_name?: string | null
          hs_code?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          factory_address?: string | null
          factory_coordinates?: unknown
          factory_name?: string | null
          hs_code?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          email_norm: string | null
          full_name: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_norm?: string | null
          full_name?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_norm?: string | null
          full_name?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      promo_email_uses: {
        Row: {
          id: number
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          last_printed_at: string | null
          print_count: number
          qr_code: string
          qr_data: Json
          scan_count: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          last_printed_at?: string | null
          print_count?: number
          qr_code: string
          qr_data: Json
          scan_count?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          last_printed_at?: string | null
          print_count?: number
          qr_code?: string
          qr_data?: Json
          scan_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          id: string
          qr_code_id: string
          scanned_at: string
          scanner_address: string | null
          scanner_ip: string | null
          scanner_location: unknown
          user_agent: string | null
        }
        Insert: {
          id?: string
          qr_code_id: string
          scanned_at?: string
          scanner_address?: string | null
          scanner_ip?: string | null
          scanner_location?: unknown
          user_agent?: string | null
        }
        Update: {
          id?: string
          qr_code_id?: string
          scanned_at?: string
          scanner_address?: string | null
          scanner_ip?: string | null
          scanner_location?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          contest_name: string | null
          coupon_code: string | null
          created_at: string
          customer_name: string
          email: string
          email_verified: boolean | null
          id: string
          idea_summary: string | null
          organization: string | null
          pricing_config: Json
          student_mode: boolean | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contest_name?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name: string
          email: string
          email_verified?: boolean | null
          id?: string
          idea_summary?: string | null
          organization?: string | null
          pricing_config?: Json
          student_mode?: boolean | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contest_name?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          email?: string
          email_verified?: boolean | null
          id?: string
          idea_summary?: string | null
          organization?: string | null
          pricing_config?: Json
          student_mode?: boolean | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          co2e_kg: number | null
          created_at: string
          file_path: string
          id: string
          note: string | null
          status: string
          user_id: string
        }
        Insert: {
          co2e_kg?: number | null
          created_at?: string
          file_path: string
          id?: string
          note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          co2e_kg?: number | null
          created_at?: string
          file_path?: string
          id?: string
          note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          code: string | null
          cost_points: number
          created_at: string | null
          id: string
          reward_id: string
          user_id: string
        }
        Insert: {
          code?: string | null
          cost_points: number
          created_at?: string | null
          id?: string
          reward_id: string
          user_id: string
        }
        Update: {
          code?: string | null
          cost_points?: number
          created_at?: string | null
          id?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "user_reward_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_diseases: {
        Row: {
          code: string
          name: string
          threshold_daily: number | null
          threshold_growth: number | null
        }
        Insert: {
          code: string
          name: string
          threshold_daily?: number | null
          threshold_growth?: number | null
        }
        Update: {
          code?: string
          name?: string
          threshold_daily?: number | null
          threshold_growth?: number | null
        }
        Relationships: []
      }
      ref_districts: {
        Row: {
          geom: unknown
          id: string
          name: string
        }
        Insert: {
          geom: unknown
          id: string
          name: string
        }
        Update: {
          geom?: unknown
          id?: string
          name?: string
        }
        Relationships: []
      }
      ref_wards: {
        Row: {
          district_id: string
          geom: unknown
          id: string
          name: string
        }
        Insert: {
          district_id: string
          geom: unknown
          id: string
          name: string
        }
        Update: {
          district_id?: string
          geom?: unknown
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_wards_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "ref_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      report_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          photos: Json | null
          report_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          photos?: Json | null
          report_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          photos?: Json | null
          report_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_updates_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          address: string | null
          bank_account_masked: string | null
          bank_account_verified: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          geohash: string
          geom: unknown
          id: string
          last_update_at: string
          lat: number
          lng: number
          needs: Json
          phone_hash: string | null
          photos: Json | null
          public: boolean | null
          status: Database["public"]["Enums"]["report_status"]
          trust_score: number | null
          urgency: Database["public"]["Enums"]["urgency_level"]
          verified_at: string | null
          weight: number | null
        }
        Insert: {
          address?: string | null
          bank_account_masked?: string | null
          bank_account_verified?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          geohash: string
          geom?: unknown
          id?: string
          last_update_at?: string
          lat: number
          lng: number
          needs?: Json
          phone_hash?: string | null
          photos?: Json | null
          public?: boolean | null
          status?: Database["public"]["Enums"]["report_status"]
          trust_score?: number | null
          urgency?: Database["public"]["Enums"]["urgency_level"]
          verified_at?: string | null
          weight?: number | null
        }
        Update: {
          address?: string | null
          bank_account_masked?: string | null
          bank_account_verified?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          geohash?: string
          geom?: unknown
          id?: string
          last_update_at?: string
          lat?: number
          lng?: number
          needs?: Json
          phone_hash?: string | null
          photos?: Json | null
          public?: boolean | null
          status?: Database["public"]["Enums"]["report_status"]
          trust_score?: number | null
          urgency?: Database["public"]["Enums"]["urgency_level"]
          verified_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      reward_claims: {
        Row: {
          created_at: string | null
          id: string
          points_cost: number
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_cost: number
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_cost?: number
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "user_reward_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          code: string | null
          cost_points: number
          created_at: string | null
          id: string
          image_url: string | null
          partner: string | null
          status: string | null
          stock: number | null
          title: string
          url: string | null
        }
        Insert: {
          active?: boolean
          code?: string | null
          cost_points: number
          created_at?: string | null
          id?: string
          image_url?: string | null
          partner?: string | null
          status?: string | null
          stock?: number | null
          title: string
          url?: string | null
        }
        Update: {
          active?: boolean
          code?: string | null
          cost_points?: number
          created_at?: string | null
          id?: string
          image_url?: string | null
          partner?: string | null
          status?: string | null
          stock?: number | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      risk_alerts: {
        Row: {
          active: boolean | null
          affected_area: unknown
          affected_districts: string[] | null
          alert_type: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          rule_triggered: string | null
          severity: string
          title: string
        }
        Insert: {
          active?: boolean | null
          affected_area?: unknown
          affected_districts?: string[] | null
          alert_type: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          rule_triggered?: string | null
          severity: string
          title: string
        }
        Update: {
          active?: boolean | null
          affected_area?: unknown
          affected_districts?: string[] | null
          alert_type?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          rule_triggered?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      route_co2_metrics: {
        Row: {
          calculated_at: string | null
          collection_savings_kg: number | null
          delivery_emissions_kg: number | null
          distance_saved_km: number | null
          fuel_saved_liters: number | null
          id: string
          net_co2_impact_kg: number | null
          route_id: string | null
        }
        Insert: {
          calculated_at?: string | null
          collection_savings_kg?: number | null
          delivery_emissions_kg?: number | null
          distance_saved_km?: number | null
          fuel_saved_liters?: number | null
          id?: string
          net_co2_impact_kg?: number | null
          route_id?: string | null
        }
        Update: {
          calculated_at?: string | null
          collection_savings_kg?: number | null
          delivery_emissions_kg?: number | null
          distance_saved_km?: number | null
          fuel_saved_liters?: number | null
          id?: string
          net_co2_impact_kg?: number | null
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_co2_metrics_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_runs: {
        Row: {
          articles_found: number | null
          articles_new: number | null
          completed_at: string | null
          error_message: string | null
          id: string
          job_name: string
          metadata: Json | null
          started_at: string
          status: string | null
        }
        Insert: {
          articles_found?: number | null
          articles_new?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_name: string
          metadata?: Json | null
          started_at?: string
          status?: string | null
        }
        Update: {
          articles_found?: number | null
          articles_new?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_name?: string
          metadata?: Json | null
          started_at?: string
          status?: string | null
        }
        Relationships: []
      }
      scores_monthly: {
        Row: {
          budget_kg: number
          co2e_kg: number
          id: string
          points: number
          score: number
          updated_at: string
          user_id: string
          ym: string
        }
        Insert: {
          budget_kg?: number
          co2e_kg?: number
          id?: string
          points?: number
          score?: number
          updated_at?: string
          user_id: string
          ym: string
        }
        Update: {
          budget_kg?: number
          co2e_kg?: number
          id?: string
          points?: number
          score?: number
          updated_at?: string
          user_id?: string
          ym?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_monthly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audits: {
        Row: {
          action: string
          audit_type: string
          compliance_standard: Database["public"]["Enums"]["security_compliance"]
          id: string
          ip_address: unknown
          request_data: Json | null
          resource_id: string | null
          resource_type: string | null
          response_data: Json | null
          risk_level: string | null
          status: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          audit_type: string
          compliance_standard: Database["public"]["Enums"]["security_compliance"]
          id?: string
          ip_address?: unknown
          request_data?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          response_data?: Json | null
          risk_level?: string | null
          status?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          audit_type?: string
          compliance_standard?: Database["public"]["Enums"]["security_compliance"]
          id?: string
          ip_address?: unknown
          request_data?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          response_data?: Json | null
          risk_level?: string | null
          status?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shipper_earnings: {
        Row: {
          carbon_credit_value: number | null
          collection_bonus: number | null
          created_at: string | null
          delivery_fee: number | null
          id: string
          paid_at: string | null
          route_id: string | null
          shipper_id: string | null
          total_earnings: number | null
        }
        Insert: {
          carbon_credit_value?: number | null
          collection_bonus?: number | null
          created_at?: string | null
          delivery_fee?: number | null
          id?: string
          paid_at?: string | null
          route_id?: string | null
          shipper_id?: string | null
          total_earnings?: number | null
        }
        Update: {
          carbon_credit_value?: number | null
          collection_bonus?: number | null
          created_at?: string | null
          delivery_fee?: number | null
          id?: string
          paid_at?: string | null
          route_id?: string | null
          shipper_id?: string | null
          total_earnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipper_earnings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          batch_no: string | null
          created_at: string | null
          expiry_date: string | null
          facility_id: string
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference_no: string | null
          unit_cost: number | null
          user_id: string | null
          ward_id: string | null
        }
        Insert: {
          batch_no?: string | null
          created_at?: string | null
          expiry_date?: string | null
          facility_id: string
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference_no?: string | null
          unit_cost?: number | null
          user_id?: string | null
          ward_id?: string | null
        }
        Update: {
          batch_no?: string | null
          created_at?: string | null
          expiry_date?: string | null
          facility_id?: string
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_no?: string | null
          unit_cost?: number | null
          user_id?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          created_at: string
          id: string
          item_name: string
          location: string | null
          quantity: number
          reserved_quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          location?: string | null
          quantity?: number
          reserved_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          location?: string | null
          quantity?: number
          reserved_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stroke_alert_subscribers: {
        Row: {
          age_group: string | null
          ai_risk_analysis: Json | null
          created_at: string
          date_of_birth: string | null
          district_id: string | null
          gender: string | null
          health_data_history: Json | null
          id: string
          is_active: boolean | null
          last_alert_sent: string | null
          last_barometer_data: Json | null
          last_gps_data: Json | null
          last_push_sent: string | null
          lat: number | null
          lon: number | null
          notification_enabled: boolean | null
          phone: string
          push_subscription: Json | null
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          ai_risk_analysis?: Json | null
          created_at?: string
          date_of_birth?: string | null
          district_id?: string | null
          gender?: string | null
          health_data_history?: Json | null
          id?: string
          is_active?: boolean | null
          last_alert_sent?: string | null
          last_barometer_data?: Json | null
          last_gps_data?: Json | null
          last_push_sent?: string | null
          lat?: number | null
          lon?: number | null
          notification_enabled?: boolean | null
          phone: string
          push_subscription?: Json | null
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          ai_risk_analysis?: Json | null
          created_at?: string
          date_of_birth?: string | null
          district_id?: string | null
          gender?: string | null
          health_data_history?: Json | null
          id?: string
          is_active?: boolean | null
          last_alert_sent?: string | null
          last_barometer_data?: Json | null
          last_gps_data?: Json | null
          last_push_sent?: string | null
          lat?: number | null
          lon?: number | null
          notification_enabled?: boolean | null
          phone?: string
          push_subscription?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      stroke_risk_predictions: {
        Row: {
          ai_analysis: string | null
          aqi: number | null
          created_at: string
          data_source: string | null
          district_id: string | null
          humidity: number | null
          id: string
          lat: number | null
          lon: number | null
          pm10: number | null
          pm25: number | null
          predicted_at: string
          pressure: number | null
          recommendations: Json | null
          risk_factors: Json | null
          risk_level: string
          risk_score: number | null
          temperature: number | null
          valid_until: string | null
          ward_id: string | null
          weather_condition: string | null
        }
        Insert: {
          ai_analysis?: string | null
          aqi?: number | null
          created_at?: string
          data_source?: string | null
          district_id?: string | null
          humidity?: number | null
          id?: string
          lat?: number | null
          lon?: number | null
          pm10?: number | null
          pm25?: number | null
          predicted_at?: string
          pressure?: number | null
          recommendations?: Json | null
          risk_factors?: Json | null
          risk_level: string
          risk_score?: number | null
          temperature?: number | null
          valid_until?: string | null
          ward_id?: string | null
          weather_condition?: string | null
        }
        Update: {
          ai_analysis?: string | null
          aqi?: number | null
          created_at?: string
          data_source?: string | null
          district_id?: string | null
          humidity?: number | null
          id?: string
          lat?: number | null
          lon?: number | null
          pm10?: number | null
          pm25?: number | null
          predicted_at?: string
          pressure?: number | null
          recommendations?: Json | null
          risk_factors?: Json | null
          risk_level?: string
          risk_score?: number | null
          temperature?: number | null
          valid_until?: string | null
          ward_id?: string | null
          weather_condition?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          address: string
          billing_cycle: string
          city: string
          created_at: string | null
          customer_name: string
          email: string
          end_date: string | null
          id: string
          monthly_carbon_credits: number
          next_billing_date: string | null
          notes: string | null
          payment_content: string | null
          payment_method: string | null
          payment_proof_uploaded_at: string | null
          payment_proof_url: string | null
          payment_status: string | null
          phone: string
          plan_name: string
          plan_type: string
          price_per_cycle: number
          start_date: string | null
          status: string
          total_credits_used: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          billing_cycle?: string
          city: string
          created_at?: string | null
          customer_name: string
          email: string
          end_date?: string | null
          id?: string
          monthly_carbon_credits?: number
          next_billing_date?: string | null
          notes?: string | null
          payment_content?: string | null
          payment_method?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          phone: string
          plan_name: string
          plan_type: string
          price_per_cycle: number
          start_date?: string | null
          status?: string
          total_credits_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          billing_cycle?: string
          city?: string
          created_at?: string | null
          customer_name?: string
          email?: string
          end_date?: string | null
          id?: string
          monthly_carbon_credits?: number
          next_billing_date?: string | null
          notes?: string | null
          payment_content?: string | null
          payment_method?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          phone?: string
          plan_name?: string
          plan_type?: string
          price_per_cycle?: number
          start_date?: string | null
          status?: string
          total_credits_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      temperature_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          current_temp: number
          facility_id: string
          id: string
          resolved_at: string | null
          status: string | null
          ward_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          current_temp: number
          facility_id: string
          id?: string
          resolved_at?: string | null
          status?: string | null
          ward_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          current_temp?: number
          facility_id?: string
          id?: string
          resolved_at?: string | null
          status?: string | null
          ward_id?: string | null
        }
        Relationships: []
      }
      transfers: {
        Row: {
          asset: Database["public"]["Enums"]["asset_type"]
          claim_token: string
          created_at: string | null
          expires_at: string
          gp_awarded: boolean
          id: number
          qty: number
          recipient_email: string
          recipient_email_norm: string | null
          recipient_user_id: string | null
          sender_user_id: string | null
          settled_at: string | null
          status: string
        }
        Insert: {
          asset?: Database["public"]["Enums"]["asset_type"]
          claim_token?: string
          created_at?: string | null
          expires_at?: string
          gp_awarded?: boolean
          id?: number
          qty: number
          recipient_email: string
          recipient_email_norm?: string | null
          recipient_user_id?: string | null
          sender_user_id?: string | null
          settled_at?: string | null
          status?: string
        }
        Update: {
          asset?: Database["public"]["Enums"]["asset_type"]
          claim_token?: string
          created_at?: string | null
          expires_at?: string
          gp_awarded?: boolean
          id?: number
          qty?: number
          recipient_email?: string
          recipient_email_norm?: string | null
          recipient_user_id?: string | null
          sender_user_id?: string | null
          settled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transfers_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transport_logs: {
        Row: {
          address: string | null
          batch_id: string
          co2_increment_kg: number | null
          cumulative_distance_km: number | null
          distance_km: number | null
          id: string
          location: unknown
          timestamp: string
          vehicle_id: string | null
        }
        Insert: {
          address?: string | null
          batch_id: string
          co2_increment_kg?: number | null
          cumulative_distance_km?: number | null
          distance_km?: number | null
          id?: string
          location: unknown
          timestamp?: string
          vehicle_id?: string | null
        }
        Update: {
          address?: string | null
          batch_id?: string
          co2_increment_kg?: number | null
          cumulative_distance_km?: number | null
          distance_km?: number | null
          id?: string
          location?: unknown
          timestamp?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          created_at: string
          expires_at: string | null
          plan: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          phone_hash: string | null
          reputation: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          phone_hash?: string | null
          reputation?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          phone_hash?: string | null
          reputation?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          budget_kg: number
          created_at: string
          default_vehicle: string | null
          email: string | null
          id: string
          notify: boolean | null
          onboarded: boolean | null
          redeemed_points: number
          region: string | null
        }
        Insert: {
          budget_kg?: number
          created_at?: string
          default_vehicle?: string | null
          email?: string | null
          id?: string
          notify?: boolean | null
          onboarded?: boolean | null
          redeemed_points?: number
          region?: string | null
        }
        Update: {
          budget_kg?: number
          created_at?: string
          default_vehicle?: string | null
          email?: string | null
          id?: string
          notify?: boolean | null
          onboarded?: boolean | null
          redeemed_points?: number
          region?: string | null
        }
        Relationships: []
      }
      verification_queue: {
        Row: {
          action: Database["public"]["Enums"]["verification_action"] | null
          assigned_to: string | null
          auto_flags: Json | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          report_id: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["verification_action"] | null
          assigned_to?: string | null
          auto_flags?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          report_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["verification_action"] | null
          assigned_to?: string | null
          auto_flags?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_queue_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      vneid_integrations: {
        Row: {
          address: string | null
          citizen_id: string | null
          created_at: string | null
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          nationality: string | null
          patient_id: string | null
          place_of_birth: string | null
          verification_data: Json | null
          verification_status:
            | Database["public"]["Enums"]["integration_status"]
            | null
          verified_at: string | null
          vneid_number: string
        }
        Insert: {
          address?: string | null
          citizen_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          nationality?: string | null
          patient_id?: string | null
          place_of_birth?: string | null
          verification_data?: Json | null
          verification_status?:
            | Database["public"]["Enums"]["integration_status"]
            | null
          verified_at?: string | null
          vneid_number: string
        }
        Update: {
          address?: string | null
          citizen_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          nationality?: string | null
          patient_id?: string | null
          place_of_birth?: string | null
          verification_data?: Json | null
          verification_status?:
            | Database["public"]["Enums"]["integration_status"]
            | null
          verified_at?: string | null
          vneid_number?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          credit_balance: number | null
          gp_balance: number | null
          updated_at: string | null
          user_id: string
          vnd_balance: number | null
        }
        Insert: {
          balance?: number
          credit_balance?: number | null
          gp_balance?: number | null
          updated_at?: string | null
          user_id: string
          vnd_balance?: number | null
        }
        Update: {
          balance?: number
          credit_balance?: number | null
          gp_balance?: number | null
          updated_at?: string | null
          user_id?: string
          vnd_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      weather_nowcast: {
        Row: {
          alerts: Json | null
          center_lat: number
          center_lng: number
          created_at: string
          forecast_time: string
          id: string
          rain_mm: number | null
          temp_c: number | null
          wind_ms: number | null
        }
        Insert: {
          alerts?: Json | null
          center_lat: number
          center_lng: number
          created_at?: string
          forecast_time: string
          id: string
          rain_mm?: number | null
          temp_c?: number | null
          wind_ms?: number | null
        }
        Update: {
          alerts?: Json | null
          center_lat?: number
          center_lng?: number
          created_at?: string
          forecast_time?: string
          id?: string
          rain_mm?: number | null
          temp_c?: number | null
          wind_ms?: number | null
        }
        Relationships: []
      }
      zone_signal_intraday: {
        Row: {
          cases: number | null
          date: string
          positivity: number | null
          report_delay: number | null
          zone_id: string
        }
        Insert: {
          cases?: number | null
          date: string
          positivity?: number | null
          report_delay?: number | null
          zone_id: string
        }
        Update: {
          cases?: number | null
          date?: string
          positivity?: number | null
          report_delay?: number | null
          zone_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      alert_candidates: {
        Row: {
          avg7: number | null
          cases: number | null
          day: string | null
          disease_code: string | null
          district_id: string | null
          rule: string | null
          threshold_daily: number | null
          threshold_growth: number | null
          ward_id: string | null
        }
        Relationships: []
      }
      dashboard_kpis: {
        Row: {
          diseases_7d: number | null
          open_alerts: number | null
          today_cases: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      predictions_latest_by_cell: {
        Row: {
          created_at: string | null
          district_id: string | null
          h3_cell: string | null
          label: string | null
          lat: number | null
          lon: number | null
          model_version: string | null
          predicted: number | null
          ward_id: string | null
        }
        Relationships: []
      }
      user_reward_codes: {
        Row: {
          code: string | null
          id: string | null
          partner: string | null
          redeemed_at: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      v_preorder_metrics: {
        Row: {
          confirmed_vnd: number | null
          preorders: number | null
        }
        Relationships: []
      }
      zone_metric_daily: {
        Row: {
          avg7_dist: number | null
          avg7_ward: number | null
          cases: number | null
          d: string | null
          disease_code: string | null
          district_id: string | null
          ward_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_points:
        | { Args: { p_amount: number; p_note?: string }; Returns: undefined }
        | {
            Args: { points_amount: number; user_id: string }
            Returns: undefined
          }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      alltime_leaderboard: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          avatar_url: string
          co2_saved: number
          display_name: string
          last_activity: string
          points: number
          rank: number
          user_id: string
        }[]
      }
      apply_coupon: {
        Args: { p_coupon_code: string; p_reward_id?: string; p_user_id: string }
        Returns: {
          discount_type: string
          discount_value: number
          final_points: number
          message: string
          success: boolean
        }[]
      }
      apply_edu_discount:
        | { Args: { p_email: string }; Returns: Json }
        | {
            Args: { p_amount?: number; p_cooldown?: unknown; p_email: string }
            Returns: Json
          }
      apply_email_discount: { Args: never; Returns: boolean }
      calculate_report_weight: {
        Args: {
          p_last_update_at: string
          p_needs: Json
          p_urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Returns: number
      }
      calculate_trust_score: {
        Args: {
          p_exif_lat: number
          p_exif_lng: number
          p_exif_timestamp: string
          p_report_id: string
        }
        Returns: number
      }
      claim_transfer: { Args: { p_token: string }; Returns: string }
      compute_ewi: {
        Args: { in_date: string; lambda?: number }
        Returns: undefined
      }
      create_preorder: {
        Args: {
          p_address: string
          p_amount: number
          p_city: string
          p_name: string
          p_phone: string
          p_transfer_proof_url: string
          p_variant: string
        }
        Returns: string
      }
      create_transfer: {
        Args: {
          p_asset: Database["public"]["Enums"]["asset_type"]
          p_qty: number
          p_recipient_email: string
        }
        Returns: number
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      email_to_userid: { Args: { p_email: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_user_id_by_email: { Args: { p_email: string }; Returns: string }
      fn_daily_counts_upsert: {
        Args: {
          p_day: string
          p_delta: number
          p_dis: string
          p_dist: string
          p_ward: string
        }
        Returns: undefined
      }
      fn_inventory_reserve: {
        Args: { campaign_id: string; item_id: string; qty: number }
        Returns: Json
      }
      fn_log_event: {
        Args: { p_name: string; p_props: Json }
        Returns: undefined
      }
      fn_schedule_campaign: { Args: { campaign_data: Json }; Returns: Json }
      fn_unlock_plan: {
        Args: { plan_name: string; uid: string }
        Returns: undefined
      }
      generate_order_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_available_coupons: {
        Args: { p_user_id: string }
        Returns: {
          code: string
          description: string
          discount_type: string
          discount_value: number
          id: string
          min_points_required: number
          title: string
          valid_until: string
        }[]
      }
      get_leaderboard: {
        Args: { limit_n?: number }
        Returns: {
          avatar_url: string
          co2e_kg: number
          email: string
          full_name: string
          green_level: string
          points: number
          rank: number
          score: number
          user_id: string
        }[]
      }
      get_my_balance:
        | { Args: never; Returns: number }
        | { Args: { user_id?: string }; Returns: number }
      get_points_available: { Args: { p_user: string }; Returns: number }
      get_points_balance: { Args: { p_user: string }; Returns: number }
      gettransactionid: { Args: never; Returns: unknown }
      gp_per_ton: { Args: never; Returns: number }
      increment_print_count: { Args: { qr_id: string }; Returns: undefined }
      intake_case_fast: {
        Args: {
          p_address_hash: string
          p_birth_year: number
          p_disease_code: string
          p_district_id: string
          p_facility_id: string
          p_full_name: string
          p_gender: string
          p_lat: number
          p_lng: number
          p_mpi_hash: string
          p_onset_date: string
          p_phone_hash: string
          p_report_date: string
          p_status: string
          p_symptoms: Json
          p_ward_id: string
        }
        Returns: Json
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      metrics_json: {
        Args: { in_date: string; in_metric: string }
        Returns: Json
      }
      monthly_leaderboard: {
        Args: {
          end_ts?: string
          limit_count?: number
          offset_count?: number
          start_ts?: string
        }
        Returns: {
          avatar_url: string
          co2_saved: number
          display_name: string
          last_activity: string
          points: number
          rank: number
          user_id: string
        }[]
      }
      normalize_email: { Args: { raw: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      preorder_totals: {
        Args: never
        Returns: {
          confirmed: number
          confirmed_vnd: number
          preordered_vnd: number
          preorders: number
        }[]
      }
      recompute_month: {
        Args: { p_month: string; p_user: string }
        Returns: undefined
      }
      redeem_reward: {
        Args: { p_reward: string; p_user: string }
        Returns: string
      }
      refresh_baseline: { Args: { in_date: string }; Returns: undefined }
      send_points_simple: {
        Args: {
          p_amount: number
          p_idempotency_key?: string
          p_note?: string
          p_recipient_email: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      transfer_points: {
        Args: { p_amount: number; p_from: string; p_note: string; p_to: string }
        Returns: string
      }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_has_redeemed_reward: {
        Args: { reward_id: string; user_id: string }
        Returns: boolean
      }
      weekly_leaderboard: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          avatar_url: string
          co2_saved: number
          display_name: string
          last_activity: string
          points: number
          rank: number
          user_id: string
        }[]
      }
    }
    Enums: {
      asset_type: "credit" | "gp" | "vnd"
      collection_type: "uco" | "epr" | "flagged" | "recyclables"
      delivery_status:
        | "pending"
        | "assigned"
        | "in_transit"
        | "completed"
        | "cancelled"
      fhir_resource_type:
        | "Patient"
        | "Observation"
        | "DiagnosticReport"
        | "Procedure"
        | "Medication"
        | "Encounter"
        | "Organization"
        | "Practitioner"
      hl7_message_type: "ADT" | "ORU" | "ORM" | "MDM" | "SIU" | "DFT"
      integration_status: "active" | "inactive" | "pending" | "error"
      need_type: "food" | "water" | "shelter" | "medicine" | "school_supplies"
      report_status:
        | "pending_verification"
        | "public"
        | "resolved"
        | "more_needed"
        | "rejected"
      security_compliance: "iso27001" | "hipaa" | "vnlaw" | "gdpr"
      urgency_level: "P0" | "P1" | "P2"
      user_role: "reporter" | "verifier" | "coordinator" | "admin"
      verification_action: "approve" | "request_more_info" | "reject"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asset_type: ["credit", "gp", "vnd"],
      collection_type: ["uco", "epr", "flagged", "recyclables"],
      delivery_status: [
        "pending",
        "assigned",
        "in_transit",
        "completed",
        "cancelled",
      ],
      fhir_resource_type: [
        "Patient",
        "Observation",
        "DiagnosticReport",
        "Procedure",
        "Medication",
        "Encounter",
        "Organization",
        "Practitioner",
      ],
      hl7_message_type: ["ADT", "ORU", "ORM", "MDM", "SIU", "DFT"],
      integration_status: ["active", "inactive", "pending", "error"],
      need_type: ["food", "water", "shelter", "medicine", "school_supplies"],
      report_status: [
        "pending_verification",
        "public",
        "resolved",
        "more_needed",
        "rejected",
      ],
      security_compliance: ["iso27001", "hipaa", "vnlaw", "gdpr"],
      urgency_level: ["P0", "P1", "P2"],
      user_role: ["reporter", "verifier", "coordinator", "admin"],
      verification_action: ["approve", "request_more_info", "reject"],
    },
  },
} as const
