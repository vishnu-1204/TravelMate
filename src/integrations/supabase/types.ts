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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_reference: string | null
          booking_terms: Json | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_locked: boolean
          last_name: string
          locked_price_per_person: number | null
          locked_total_amount: number | null
          package_id: string
          package_version_id: string | null
          package_title: string
          payment_id: string | null
          payment_order_id: string | null
          payment_status: string
          payment_verified: boolean
          phone: string
          total_amount: number
          travelers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_reference?: string | null
          booking_terms?: Json | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_locked?: boolean
          last_name: string
          locked_price_per_person?: number | null
          locked_total_amount?: number | null
          package_id: string
          package_version_id?: string | null
          package_title: string
          payment_id?: string | null
          payment_order_id?: string | null
          payment_status?: string
          payment_verified?: boolean
          phone: string
          total_amount: number
          travelers: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_reference?: string | null
          booking_terms?: Json | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_locked?: boolean
          last_name?: string
          locked_price_per_person?: number | null
          locked_total_amount?: number | null
          package_id?: string
          package_version_id?: string | null
          package_title?: string
          payment_id?: string | null
          payment_order_id?: string | null
          payment_status?: string
          payment_verified?: boolean
          phone?: string
          total_amount?: number
          travelers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_snapshots: {
        Row: {
          availability_lock: Json | null
          booking_id: string
          created_at: string
          id: string
          locked_hotel: string | null
          locked_price_per_person: number
          locked_total_amount: number
          locked_transport: string | null
          package_id: string
          package_version_id: string | null
          snapshot: Json
          terms_snapshot: Json | null
        }
        Insert: {
          availability_lock?: Json | null
          booking_id: string
          created_at?: string
          id?: string
          locked_hotel?: string | null
          locked_price_per_person: number
          locked_total_amount: number
          locked_transport?: string | null
          package_id: string
          package_version_id?: string | null
          snapshot: Json
          terms_snapshot?: Json | null
        }
        Update: {
          availability_lock?: Json | null
          booking_id?: string
          created_at?: string
          id?: string
          locked_hotel?: string | null
          locked_price_per_person?: number
          locked_total_amount?: number
          locked_transport?: string | null
          package_id?: string
          package_version_id?: string | null
          snapshot?: Json
          terms_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      package_versions: {
        Row: {
          created_at: string
          created_by: string
          duration_days: number | null
          id: string
          is_active: boolean
          package_id: string
          payload: Json
          payload_hash: string
          price: number | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          package_id: string
          payload: Json
          payload_hash: string
          price?: number | null
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          package_id?: string
          payload?: Json
          payload_hash?: string
          price?: number | null
          version_number?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
