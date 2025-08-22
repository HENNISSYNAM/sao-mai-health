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
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string | null
          email: string
          id: string
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
          total_amount: number | null
          transferred_amount: number | null
          unit_price: number | null
          variant: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name?: string | null
          email: string
          id?: string
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
          total_amount?: number | null
          transferred_amount?: number | null
          unit_price?: number | null
          variant?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string | null
          email?: string
          id?: string
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
          total_amount?: number | null
          transferred_amount?: number | null
          unit_price?: number | null
          variant?: string | null
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
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          email_norm: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_norm?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_norm?: string | null
          user_id?: string
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
      wallets: {
        Row: {
          credit_balance: number | null
          gp_balance: number | null
          updated_at: string | null
          user_id: string
          vnd_balance: number | null
        }
        Insert: {
          credit_balance?: number | null
          gp_balance?: number | null
          updated_at?: string | null
          user_id: string
          vnd_balance?: number | null
        }
        Update: {
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
    }
    Views: {
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
    }
    Functions: {
      claim_transfer: {
        Args: { p_token: string }
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
      find_user_id_by_email: {
        Args: { p_email: string }
        Returns: string
      }
      fn_log_event: {
        Args: { p_name: string; p_props: Json }
        Returns: undefined
      }
      generate_order_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_leaderboard: {
        Args: { limit_n?: number }
        Returns: {
          co2e_kg: number
          email: string
          points: number
          rank: number
          score: number
        }[]
      }
      get_points_available: {
        Args: { p_user: string }
        Returns: number
      }
      get_points_balance: {
        Args: { p_user: string }
        Returns: number
      }
      gp_per_ton: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      normalize_email: {
        Args: { raw: string }
        Returns: string
      }
      recompute_month: {
        Args: { p_month: string; p_user: string }
        Returns: undefined
      }
      redeem_reward: {
        Args: { p_reward: string; p_user: string }
        Returns: string
      }
      transfer_points: {
        Args: { p_amount: number; p_from: string; p_note: string; p_to: string }
        Returns: string
      }
      user_has_redeemed_reward: {
        Args: { reward_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      asset_type: "credit" | "gp" | "vnd"
    }
    CompositeTypes: {
      [_ in never]: never
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
    },
  },
} as const
