export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          tier: "free" | "pro"
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          tier?: "free" | "pro"
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          tier?: "free" | "pro"
          credits?: number
          updated_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          created_at?: string
        }
        Update: Record<string, never>
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          updated_at?: string
        }
      }
      saved_outputs: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          content_type: string
          platform: string | null
          language: string | null
          business_name: string | null
          text: string
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          content_type: string
          platform?: string | null
          language?: string | null
          business_name?: string | null
          text: string
          label?: string | null
          created_at?: string
        }
        Update: {
          campaign_id?: string | null
          label?: string | null
        }
      }
      scheduled_posts: {
        Row: {
          id: string
          user_id: string
          saved_output_id: string | null
          platform: string
          caption: string
          image_url: string | null
          scheduled_at: string
          status: "pending" | "published" | "failed"
          meta_post_id: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          saved_output_id?: string | null
          platform: string
          caption: string
          image_url?: string | null
          scheduled_at: string
          status?: "pending" | "published" | "failed"
          meta_post_id?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          status?: "pending" | "published" | "failed"
          meta_post_id?: string | null
          error_message?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          stripe_session_id: string | null
          stripe_payment_id: string | null
          amount_inr: number
          credits_purchased: number
          status: "pending" | "completed" | "failed"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_session_id?: string | null
          stripe_payment_id?: string | null
          amount_inr: number
          credits_purchased: number
          status?: "pending" | "completed" | "failed"
          created_at?: string
        }
        Update: {
          stripe_payment_id?: string | null
          status?: "pending" | "completed" | "failed"
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
    ? U
    : never
  : never

export const Constants = {
  public: { Enums: {} },
} as const
