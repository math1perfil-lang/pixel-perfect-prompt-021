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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          accessible: boolean | null
          address: string | null
          best_periods: string[]
          category_id: string | null
          city: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          crowd: string
          description: string | null
          duration_max_minutes: number
          duration_min_minutes: number
          energy: string
          external_url: string | null
          family_friendly: boolean
          group_friendly: boolean
          group_key: string
          id: string
          indoor: boolean
          is_active: boolean
          is_demo: boolean
          is_sponsored: boolean
          is_verified: boolean
          last_verified_at: string | null
          lat: number | null
          lng: number | null
          neighborhood: string | null
          price_is_estimate: boolean
          price_level: number | null
          price_max: number | null
          price_min: number | null
          solo_friendly: boolean
          source_id: string | null
          state: string
          title: string
          updated_at: string
          vibe_tags: string[]
        }
        Insert: {
          accessible?: boolean | null
          address?: string | null
          best_periods?: string[]
          category_id?: string | null
          city?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          crowd?: string
          description?: string | null
          duration_max_minutes?: number
          duration_min_minutes?: number
          energy?: string
          external_url?: string | null
          family_friendly?: boolean
          group_friendly?: boolean
          group_key: string
          id?: string
          indoor?: boolean
          is_active?: boolean
          is_demo?: boolean
          is_sponsored?: boolean
          is_verified?: boolean
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          neighborhood?: string | null
          price_is_estimate?: boolean
          price_level?: number | null
          price_max?: number | null
          price_min?: number | null
          solo_friendly?: boolean
          source_id?: string | null
          state?: string
          title: string
          updated_at?: string
          vibe_tags?: string[]
        }
        Update: {
          accessible?: boolean | null
          address?: string | null
          best_periods?: string[]
          category_id?: string | null
          city?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          crowd?: string
          description?: string | null
          duration_max_minutes?: number
          duration_min_minutes?: number
          energy?: string
          external_url?: string | null
          family_friendly?: boolean
          group_friendly?: boolean
          group_key?: string
          id?: string
          indoor?: boolean
          is_active?: boolean
          is_demo?: boolean
          is_sponsored?: boolean
          is_verified?: boolean
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          neighborhood?: string | null
          price_is_estimate?: boolean
          price_level?: number | null
          price_max?: number | null
          price_min?: number | null
          solo_friendly?: boolean
          source_id?: string | null
          state?: string
          title?: string
          updated_at?: string
          vibe_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_categories: {
        Row: {
          created_at: string
          group_key: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_key: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_key?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      activity_images: {
        Row: {
          activity_id: string
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          activity_id: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          activity_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_images_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_interactions: {
        Row: {
          activity_id: string
          context: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["interaction_kind"]
          user_id: string
        }
        Insert: {
          activity_id: string
          context?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["interaction_kind"]
          user_id?: string
        }
        Update: {
          activity_id?: string
          context?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["interaction_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_interactions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_opening_hours: {
        Row: {
          activity_id: string
          closes: string
          created_at: string
          id: string
          is_verified: boolean
          opens: string
          weekday: number
        }
        Insert: {
          activity_id: string
          closes: string
          created_at?: string
          id?: string
          is_verified?: boolean
          opens: string
          weekday: number
        }
        Update: {
          activity_id?: string
          closes?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          opens?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_opening_hours_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_experiences: {
        Row: {
          activity_id: string | null
          completed_at: string
          created_at: string
          group_key: string | null
          highlight: string | null
          id: string
          is_favorite: boolean
          notes: string | null
          rating: number | null
          spent: number | null
          title: string
          updated_at: string
          user_id: string
          would_recommend: boolean | null
          would_repeat: boolean | null
        }
        Insert: {
          activity_id?: string | null
          completed_at?: string
          created_at?: string
          group_key?: string | null
          highlight?: string | null
          id?: string
          is_favorite?: boolean
          notes?: string | null
          rating?: number | null
          spent?: number | null
          title: string
          updated_at?: string
          user_id?: string
          would_recommend?: boolean | null
          would_repeat?: boolean | null
        }
        Update: {
          activity_id?: string | null
          completed_at?: string
          created_at?: string
          group_key?: string | null
          highlight?: string | null
          id?: string
          is_favorite?: boolean
          notes?: string | null
          rating?: number | null
          spent?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          would_recommend?: boolean | null
          would_repeat?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "completed_experiences_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          created_at: string
          id: string
          kind: string
          last_updated_at: string
          name: string
          notes: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          last_updated_at?: string
          name: string
          notes?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          last_updated_at?: string
          name?: string
          notes?: string | null
          url?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          address: string | null
          category_id: string | null
          city: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          external_url: string | null
          group_key: string
          id: string
          image_url: string | null
          is_active: boolean
          is_demo: boolean
          is_free: boolean
          is_verified: boolean
          lat: number | null
          lng: number | null
          price_max: number | null
          price_min: number | null
          publish_until: string | null
          source_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          group_key?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_demo?: boolean
          is_free?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          price_max?: number | null
          price_min?: number | null
          publish_until?: string | null
          source_id?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          group_key?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_demo?: boolean
          is_free?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          price_max?: number | null
          price_min?: number | null
          publish_until?: string | null
          source_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          activity_id: string | null
          created_at: string
          day_date: string
          estimated_cost: number | null
          id: string
          itinerary_id: string
          label: string
          notes: string | null
          sort_order: number
          start_time: string | null
          travel_minutes: number | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          day_date: string
          estimated_cost?: number | null
          id?: string
          itinerary_id: string
          label: string
          notes?: string | null
          sort_order?: number
          start_time?: string | null
          travel_minutes?: number | null
          user_id?: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          day_date?: string
          estimated_cost?: number | null
          id?: string
          itinerary_id?: string
          label?: string
          notes?: string | null
          sort_order?: number
          start_time?: string | null
          travel_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "personal_itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leisure_budgets: {
        Row: {
          amount: number
          created_at: string
          group_key: string
          id: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          group_key?: string
          id?: string
          period: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          group_key?: string
          id?: string
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leisure_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_itineraries: {
        Row: {
          created_at: string
          deleted_at: string | null
          end_date: string
          free_days: string[]
          id: string
          is_public: boolean
          kind: string
          notes: string | null
          people_count: number
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          end_date: string
          free_days?: string[]
          id?: string
          is_public?: boolean
          kind?: string
          notes?: string | null
          people_count?: number
          start_date: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          end_date?: string
          free_days?: string[]
          id?: string
          is_public?: boolean
          kind?: string
          notes?: string | null
          people_count?: number
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_itineraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_invites: boolean
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          full_name: string
          home_lat: number | null
          home_lng: number | null
          id: string
          is_active: boolean
          is_public: boolean
          location_consent: boolean
          onboarding_completed: boolean
          plan: string
          share_activities: boolean
          share_availability: boolean
          state: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          allow_invites?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string
          home_lat?: number | null
          home_lng?: number | null
          id: string
          is_active?: boolean
          is_public?: boolean
          location_consent?: boolean
          onboarding_completed?: boolean
          plan?: string
          share_activities?: boolean
          share_availability?: boolean
          state?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          allow_invites?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          location_consent?: boolean
          onboarding_completed?: boolean
          plan?: string
          share_activities?: boolean
          share_availability?: boolean
          state?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_logs: {
        Row: {
          accepted: boolean | null
          activity_id: string | null
          created_at: string
          id: string
          reasons: string[]
          score: number | null
          surface: string
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          activity_id?: string | null
          created_at?: string
          id?: string
          reasons?: string[]
          score?: number | null
          surface: string
          user_id?: string
        }
        Update: {
          accepted?: boolean | null
          activity_id?: string | null
          created_at?: string
          id?: string
          reasons?: string[]
          score?: number | null
          surface?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_weights: {
        Row: {
          key: string
          label: string
          updated_at: string
          weight: number
        }
        Insert: {
          key: string
          label: string
          updated_at?: string
          weight: number
        }
        Update: {
          key?: string
          label?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      saved_activities: {
        Row: {
          activity_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_availability: {
        Row: {
          created_at: string
          end_time: string
          id: string
          start_time: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          user_id?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calendar_events: {
        Row: {
          activity_id: string | null
          created_at: string
          deleted_at: string | null
          ends_at: string
          estimated_cost: number | null
          id: string
          kind: Database["public"]["Enums"]["calendar_kind"]
          notes: string | null
          recurrence: string
          starts_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at: string
          estimated_cost?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["calendar_kind"]
          notes?: string | null
          recurrence?: string
          starts_at: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at?: string
          estimated_cost?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["calendar_kind"]
          notes?: string | null
          recurrence?: string
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_calendar_events_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          category_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          budget_per_experience: string
          company: string[]
          crowd: string[]
          max_distance_km: number
          novelty: string
          pace: string[]
          planning: string[]
          price_openness: string[]
          sleep_time: string | null
          updated_at: string
          user_id: string
          weekday_leisure: boolean
          weekend_leisure: boolean
        }
        Insert: {
          budget_per_experience?: string
          company?: string[]
          crowd?: string[]
          max_distance_km?: number
          novelty?: string
          pace?: string[]
          planning?: string[]
          price_openness?: string[]
          sleep_time?: string | null
          updated_at?: string
          user_id: string
          weekday_leisure?: boolean
          weekend_leisure?: boolean
        }
        Update: {
          budget_per_experience?: string
          company?: string[]
          crowd?: string[]
          max_distance_km?: number
          novelty?: string
          pace?: string[]
          planning?: string[]
          price_openness?: string[]
          sleep_time?: string | null
          updated_at?: string
          user_id?: string
          weekday_leisure?: boolean
          weekend_leisure?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recurring_commitments: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["calendar_kind"]
          start_time: string
          title: string
          updated_at: string
          user_id: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["calendar_kind"]
          start_time: string
          title: string
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["calendar_kind"]
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "user_recurring_commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          city: string
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          is_admin: boolean
          onboarding_completed: boolean
          state: string
        }[]
      }
      admin_metrics: { Args: never; Returns: Json }
      admin_set_user_active: {
        Args: { _active: boolean; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      calendar_kind:
        | "work"
        | "study"
        | "commitment"
        | "exercise"
        | "leisure"
        | "rest"
      interaction_kind:
        | "viewed"
        | "saved"
        | "scheduled"
        | "completed"
        | "ignored"
        | "disliked"
        | "shared"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      calendar_kind: [
        "work",
        "study",
        "commitment",
        "exercise",
        "leisure",
        "rest",
      ],
      interaction_kind: [
        "viewed",
        "saved",
        "scheduled",
        "completed",
        "ignored",
        "disliked",
        "shared",
      ],
    },
  },
} as const
