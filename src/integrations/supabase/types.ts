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
      app_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
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
      fitme_credit_packages: {
        Row: {
          badge: string | null
          code: string
          created_at: string
          credits: number
          currency: string
          id: string
          is_active: boolean
          is_free: boolean
          name: string
          once_per_user: boolean
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          code: string
          created_at?: string
          credits: number
          currency?: string
          id?: string
          is_active?: boolean
          is_free?: boolean
          name: string
          once_per_user?: boolean
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          code?: string
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          is_active?: boolean
          is_free?: boolean
          name?: string
          once_per_user?: boolean
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      fitme_credit_purchases: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          credited_at: string | null
          credits: number
          currency: string
          id: string
          package_id: string | null
          payment_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          created_at?: string
          credited_at?: string | null
          credits: number
          currency?: string
          id?: string
          package_id?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          credited_at?: string | null
          credits?: number
          currency?: string
          id?: string
          package_id?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitme_credit_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "fitme_credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      fitme_credit_transactions: {
        Row: {
          amount_paid: number
          created_at: string
          credits: number
          currency: string
          description: string | null
          id: string
          package_id: string | null
          payment_reference: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          credits: number
          currency?: string
          description?: string | null
          id?: string
          package_id?: string | null
          payment_reference?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          credits?: number
          currency?: string
          description?: string | null
          id?: string
          package_id?: string | null
          payment_reference?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitme_credit_transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "fitme_credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      fitme_generations: {
        Row: {
          completed_at: string | null
          created_at: string
          credit_transaction_id: string | null
          error_message: string | null
          generation_status: string
          id: string
          input_hash: string
          product_id: string | null
          product_ids: Json
          provider: string | null
          provider_generation_id: string | null
          result_url: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credit_transaction_id?: string | null
          error_message?: string | null
          generation_status?: string
          id?: string
          input_hash: string
          product_id?: string | null
          product_ids?: Json
          provider?: string | null
          provider_generation_id?: string | null
          result_url?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credit_transaction_id?: string | null
          error_message?: string | null
          generation_status?: string
          id?: string
          input_hash?: string
          product_id?: string | null
          product_ids?: Json
          provider?: string | null
          provider_generation_id?: string | null
          result_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitme_generations_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "fitme_credit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitme_generations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      fitme_wallets: {
        Row: {
          created_at: string
          current_balance: number
          lifetime_credits_purchased: number
          lifetime_credits_used: number
          lifetime_free_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          lifetime_credits_purchased?: number
          lifetime_credits_used?: number
          lifetime_free_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          lifetime_credits_purchased?: number
          lifetime_credits_used?: number
          lifetime_free_credits?: number
          updated_at?: string
          user_id?: string
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
      held_sales: {
        Row: {
          created_at: string
          customer_data: Json | null
          discount_amount: number | null
          hold_number: string
          id: string
          items: Json
          staff_user_id: string
          store_id: number
          subtotal: number
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_data?: Json | null
          discount_amount?: number | null
          hold_number: string
          id?: string
          items?: Json
          staff_user_id: string
          store_id: number
          subtotal?: number
          total_amount?: number
        }
        Update: {
          created_at?: string
          customer_data?: Json | null
          discount_amount?: number | null
          hold_number?: string
          id?: string
          items?: Json
          staff_user_id?: string
          store_id?: number
          subtotal?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "held_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      international_order_requests: {
        Row: {
          access_token: string
          address: string | null
          cart_items: Json
          city: string
          country: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          estimated_delivery: string | null
          final_currency: string | null
          final_total: number | null
          fulfillment_location: string | null
          id: string
          postcode: string | null
          product_total: number
          reference_number: string
          shipping_cost: number | null
          shipping_currency: string | null
          shipping_notes: string | null
          shipping_provider: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          address?: string | null
          cart_items?: Json
          city: string
          country: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          estimated_delivery?: string | null
          final_currency?: string | null
          final_total?: number | null
          fulfillment_location?: string | null
          id?: string
          postcode?: string | null
          product_total?: number
          reference_number: string
          shipping_cost?: number | null
          shipping_currency?: string | null
          shipping_notes?: string | null
          shipping_provider?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          address?: string | null
          cart_items?: Json
          city?: string
          country?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          estimated_delivery?: string | null
          final_currency?: string | null
          final_total?: number | null
          fulfillment_location?: string | null
          id?: string
          postcode?: string | null
          product_total?: number
          reference_number?: string
          shipping_cost?: number | null
          shipping_currency?: string | null
          shipping_notes?: string | null
          shipping_provider?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          staff_user_id: string | null
          store_id: number | null
          variant_key: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          staff_user_id?: string | null
          store_id?: number | null
          variant_key?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          staff_user_id?: string | null
          store_id?: number | null
          variant_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_activity: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          details: string | null
          id: string
          order_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          details?: string | null
          id?: string
          order_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          details?: string | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipment_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity_shipped: number
          shipment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity_shipped: number
          shipment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity_shipped?: number
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "order_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipments: {
        Row: {
          carrier: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          shipped_at: string
          status: string
          tracking_number: string | null
        }
        Insert: {
          carrier: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          shipped_at?: string
          status?: string
          tracking_number?: string | null
        }
        Update: {
          carrier?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string
          status?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number | null
          approved_by: string | null
          balance: number | null
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
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          id: string
          is_guest: boolean | null
          is_voided: boolean | null
          items: Json
          notes: string | null
          order_number: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          receipt_number: string | null
          sale_type: string
          snippe_checkout_url: string | null
          staff_user_id: string | null
          status: string
          stock_deducted_at: string | null
          store_id: number | null
          subtotal: number | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_paid?: number | null
          approved_by?: string | null
          balance?: number | null
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
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_guest?: boolean | null
          is_voided?: boolean | null
          items?: Json
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          receipt_number?: string | null
          sale_type?: string
          snippe_checkout_url?: string | null
          staff_user_id?: string | null
          status?: string
          stock_deducted_at?: string | null
          store_id?: number | null
          subtotal?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_paid?: number | null
          approved_by?: string | null
          balance?: number | null
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
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_guest?: boolean | null
          is_voided?: boolean | null
          items?: Json
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          receipt_number?: string | null
          sale_type?: string
          snippe_checkout_url?: string | null
          staff_user_id?: string | null
          status?: string
          stock_deducted_at?: string | null
          store_id?: number | null
          subtotal?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
      pos_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          reference: string | null
          store_id: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          reference?: string | null
          store_id?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          reference?: string | null
          store_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_audit_logs_store_id_fkey"
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
          variant_stock: Json
        }
        Insert: {
          id?: string
          is_available?: boolean
          product_id: string
          stock_quantity?: number
          store_id: number
          variant_stock?: Json
        }
        Update: {
          id?: string
          is_available?: boolean
          product_id?: string
          stock_quantity?: number
          store_id?: number
          variant_stock?: Json
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
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          payment_method: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          payment_method: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_staff: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          staff_role: string
          status: string
          store_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          staff_role?: string
          status?: string
          store_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
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
      adjust_store_inventory: {
        Args: {
          p_adjustment_type: string
          p_new_quantity: number
          p_product_id: string
          p_reason: string
          p_store_id: number
          p_variant: string
        }
        Returns: Json
      }
      confirm_order_payment: {
        Args: {
          p_amount?: number
          p_method?: string
          p_order_id: string
          p_reference?: string
        }
        Returns: Json
      }
      create_international_request: {
        Args: {
          p_address: string
          p_city: string
          p_country: string
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_postcode: string
        }
        Returns: Json
      }
      create_order_shipment: {
        Args: {
          p_actor_id?: string
          p_actor_name?: string
          p_carrier: string
          p_items: Json
          p_notes: string
          p_order_id: string
          p_tracking_number: string
        }
        Returns: string
      }
      fail_order_payment: {
        Args: { p_order_id: string; p_reference?: string; p_status?: string }
        Returns: Json
      }
      fitme_admin_adjust_credits: {
        Args: {
          p_credits: number
          p_description?: string
          p_transaction_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      fitme_admin_stats: { Args: { p_unit_cost?: number }; Returns: Json }
      fitme_admin_users: {
        Args: { p_query?: string }
        Returns: {
          current_balance: number
          full_name: string
          generations: number
          lifetime_credits_purchased: number
          lifetime_credits_used: number
          lifetime_free_credits: number
          phone_number: string
          user_id: string
        }[]
      }
      fitme_complete_generation: {
        Args: {
          p_generation_id: string
          p_provider_generation_id?: string
          p_result_url: string
        }
        Returns: Json
      }
      fitme_credit_purchase_failed: {
        Args: { p_reference: string; p_status: string }
        Returns: Json
      }
      fitme_credit_purchase_paid: {
        Args: { p_amount?: number; p_reference: string }
        Returns: Json
      }
      fitme_fail_generation: {
        Args: { p_error: string; p_generation_id: string }
        Returns: Json
      }
      fitme_get_wallet: { Args: never; Returns: Json }
      fitme_reserve_credit: {
        Args: { p_input_hash: string; p_product_ids: Json; p_user_id: string }
        Returns: Json
      }
      get_international_request: {
        Args: { p_reference: string; p_token: string }
        Returns: Json
      }
      get_staff_store: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_store_manager_of: { Args: { _store_id: number }; Returns: boolean }
      process_online_checkout: {
        Args: {
          p_currency?: string
          p_customer_email?: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address?: string
          p_delivery_fee?: number
          p_delivery_zone?: string
          p_discount_amount?: number
          p_is_guest?: boolean
          p_items?: Json
          p_user_id?: string
        }
        Returns: Json
      }
      process_pos_sale: {
        Args: {
          p_approved_by?: string
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_discount_amount?: number
          p_discount_type?: string
          p_discount_value?: number
          p_items?: Json
          p_notes?: string
          p_payments?: Json
          p_staff_user_id: string
          p_store_id: number
          p_subtotal?: number
          p_total_amount?: number
        }
        Returns: Json
      }
      respond_international_quote: {
        Args: { p_accept: boolean; p_reference: string; p_token: string }
        Returns: Json
      }
      void_pos_sale: {
        Args: { p_order_id: string; p_reason: string; p_staff_user_id: string }
        Returns: Json
      }
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
