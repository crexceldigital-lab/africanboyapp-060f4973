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
      countries: {
        Row: {
          code: string
          currency_code: string
          currency_symbol: string
          flag_emoji: string | null
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          currency_code: string
          currency_symbol: string
          flag_emoji?: string | null
          id?: number
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          currency_code?: string
          currency_symbol?: string
          flag_emoji?: string | null
          id?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          from_currency: string
          id: number
          rate: number
          to_currency: string
          updated_at: string
        }
        Insert: {
          from_currency: string
          id?: number
          rate: number
          to_currency: string
          updated_at?: string
        }
        Update: {
          from_currency?: string
          id?: number
          rate?: number
          to_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_zone: string | null
          id: string
          items: Json
          payment_method: string | null
          payment_reference: string | null
          snippe_checkout_url: string | null
          status: string
          store_id: number | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_zone?: string | null
          id?: string
          items?: Json
          payment_method?: string | null
          payment_reference?: string | null
          snippe_checkout_url?: string | null
          status?: string
          store_id?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_zone?: string | null
          id?: string
          items?: Json
          payment_method?: string | null
          payment_reference?: string | null
          snippe_checkout_url?: string | null
          status?: string
          store_id?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      product_colors: {
        Row: {
          created_at: string | null
          hex: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          hex: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string | null
          hex?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      product_of_the_day: {
        Row: {
          created_at: string
          id: string
          product_id: string
          set_for_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          set_for_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          set_for_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_of_the_day_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          status?: string
        }
        Relationships: []
      }
      product_store_availability: {
        Row: {
          id: string
          is_available: boolean
          product_id: string
          stock_quantity: number
          store_id: number
        }
        Insert: {
          id?: string
          is_available?: boolean
          product_id: string
          stock_quantity?: number
          store_id: number
        }
        Update: {
          id?: string
          is_available?: boolean
          product_id?: string
          stock_quantity?: number
          store_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_store_availability_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_store_availability_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_subcategories: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          colors: Json
          cost_price: number
          created_at: string | null
          description: string
          discount_percent: number
          id: string
          image_url: string
          name: string
          on_sale: boolean
          price: number
          sale_price: number | null
          sizes: string[]
          sku: string | null
          status: string
          stock: Json
          stock_quantity: number
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          colors?: Json
          cost_price?: number
          created_at?: string | null
          description?: string
          discount_percent?: number
          id?: string
          image_url?: string
          name: string
          on_sale?: boolean
          price?: number
          sale_price?: number | null
          sizes?: string[]
          sku?: string | null
          status?: string
          stock?: Json
          stock_quantity?: number
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          colors?: Json
          cost_price?: number
          created_at?: string | null
          description?: string
          discount_percent?: number
          id?: string
          image_url?: string
          name?: string
          on_sale?: boolean
          price?: number
          sale_price?: number | null
          sizes?: string[]
          sku?: string | null
          status?: string
          stock?: Json
          stock_quantity?: number
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_id: number | null
          created_at: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          vip_tier: string | null
        }
        Insert: {
          country_id?: number | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          vip_tier?: string | null
        }
        Update: {
          country_id?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          vip_tier?: string | null
        }
        Relationships: []
      }
      store_staff: {
        Row: {
          created_at: string
          id: string
          staff_role: string
          status: string
          store_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          staff_role?: string
          status?: string
          store_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          staff_role?: string
          status?: string
          store_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          country: string
          country_code: string
          created_at: string
          currency_code: string
          email: string | null
          id: number
          is_active: boolean
          location_name: string | null
          name: string
          phone: string | null
          status: string
          store_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string
          country_code?: string
          created_at?: string
          currency_code?: string
          email?: string | null
          id?: number
          is_active?: boolean
          location_name?: string | null
          name: string
          phone?: string | null
          status?: string
          store_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          country_code?: string
          created_at?: string
          currency_code?: string
          email?: string | null
          id?: number
          is_active?: boolean
          location_name?: string | null
          name?: string
          phone?: string | null
          status?: string
          store_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_staff_store: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
