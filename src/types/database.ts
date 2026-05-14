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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attack_record: {
        Row: {
          attacked_at: string
          attacker_in_game_name: string
          defense_deck_id: number
          id: number
          initial_monster_1_id: number
          initial_monster_2_id: number
          initial_monster_3_id: number
          points_earned: number | null
          replacement_monsters: Json
          result: string
        }
        Insert: {
          attacked_at?: string
          attacker_in_game_name: string
          defense_deck_id: number
          id?: number
          initial_monster_1_id: number
          initial_monster_2_id: number
          initial_monster_3_id: number
          points_earned?: number | null
          replacement_monsters?: Json
          result: string
        }
        Update: {
          attacked_at?: string
          attacker_in_game_name?: string
          defense_deck_id?: number
          id?: number
          initial_monster_1_id?: number
          initial_monster_2_id?: number
          initial_monster_3_id?: number
          points_earned?: number | null
          replacement_monsters?: Json
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "attack_record_defense_deck_id_fkey"
            columns: ["defense_deck_id"]
            isOneToOne: false
            referencedRelation: "defense_deck"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_record_initial_monster_1_id_fkey"
            columns: ["initial_monster_1_id"]
            isOneToOne: false
            referencedRelation: "monster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_record_initial_monster_2_id_fkey"
            columns: ["initial_monster_2_id"]
            isOneToOne: false
            referencedRelation: "monster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_record_initial_monster_3_id_fkey"
            columns: ["initial_monster_3_id"]
            isOneToOne: false
            referencedRelation: "monster"
            referencedColumns: ["id"]
          },
        ]
      }
      defense_deck: {
        Row: {
          artifacts_summary: Json | null
          captured_at: string
          captured_by_in_game_name: string
          enemy_guild_id: number
          id: number
          monster_1_id: number
          monster_2_id: number
          monster_3_id: number
          slot_index: number
        }
        Insert: {
          artifacts_summary?: Json | null
          captured_at?: string
          captured_by_in_game_name: string
          enemy_guild_id: number
          id?: number
          monster_1_id: number
          monster_2_id: number
          monster_3_id: number
          slot_index: number
        }
        Update: {
          artifacts_summary?: Json | null
          captured_at?: string
          captured_by_in_game_name?: string
          enemy_guild_id?: number
          id?: number
          monster_1_id?: number
          monster_2_id?: number
          monster_3_id?: number
          slot_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "defense_deck_enemy_guild_id_fkey"
            columns: ["enemy_guild_id"]
            isOneToOne: false
            referencedRelation: "enemy_guild"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defense_deck_monster_1_id_fkey"
            columns: ["monster_1_id"]
            isOneToOne: false
            referencedRelation: "monster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defense_deck_monster_2_id_fkey"
            columns: ["monster_2_id"]
            isOneToOne: false
            referencedRelation: "monster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defense_deck_monster_3_id_fkey"
            columns: ["monster_3_id"]
            isOneToOne: false
            referencedRelation: "monster"
            referencedColumns: ["id"]
          },
        ]
      }
      enemy_guild: {
        Row: {
          game_guild_id: number | null
          id: number
          last_seen_at: string
          name: string
          world_id: number | null
        }
        Insert: {
          game_guild_id?: number | null
          id?: number
          last_seen_at?: string
          name: string
          world_id?: number | null
        }
        Update: {
          game_guild_id?: number | null
          id?: number
          last_seen_at?: string
          name?: string
          world_id?: number | null
        }
        Relationships: []
      }
      monster: {
        Row: {
          archetype: string | null
          awakened: boolean
          element: string | null
          id: number
          image_url: string | null
          name_en: string | null
          name_ko: string
        }
        Insert: {
          archetype?: string | null
          awakened?: boolean
          element?: string | null
          id: number
          image_url?: string | null
          name_en?: string | null
          name_ko: string
        }
        Update: {
          archetype?: string | null
          awakened?: boolean
          element?: string | null
          id?: number
          image_url?: string | null
          name_en?: string | null
          name_ko?: string
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
