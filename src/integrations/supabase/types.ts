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
      bookmarks: {
        Row: {
          ayat_number: number
          created_at: string
          id: string
          label: string | null
          page_number: number | null
          surah_number: number
          user_id: string
        }
        Insert: {
          ayat_number: number
          created_at?: string
          id?: string
          label?: string | null
          page_number?: number | null
          surah_number: number
          user_id: string
        }
        Update: {
          ayat_number?: number
          created_at?: string
          id?: string
          label?: string | null
          page_number?: number | null
          surah_number?: number
          user_id?: string
        }
        Relationships: []
      }
      halaman_quran: {
        Row: {
          ayat_end: number | null
          ayat_start: number | null
          id: string
          juz_number: number
          page_number: number
          surat_id: string | null
        }
        Insert: {
          ayat_end?: number | null
          ayat_start?: number | null
          id?: string
          juz_number: number
          page_number: number
          surat_id?: string | null
        }
        Update: {
          ayat_end?: number | null
          ayat_start?: number | null
          id?: string
          juz_number?: number
          page_number?: number
          surat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "halaman_quran_surat_id_fkey"
            columns: ["surat_id"]
            isOneToOne: false
            referencedRelation: "surat"
            referencedColumns: ["id"]
          },
        ]
      }
      mutabaah_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          keterangan: string | null
          murojaah_hifdzul_jadid_dari: number | null
          murojaah_hifdzul_jadid_hingga: number | null
          murojaah_hifdzul_qodim: string | null
          murojaah_tsnai: string | null
          status: Database["public"]["Enums"]["mutabaah_status"]
          student_id: string
          ziyadah_ayat_end: number | null
          ziyadah_ayat_start: number | null
          ziyadah_jumlah: number | null
          ziyadah_surat: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          keterangan?: string | null
          murojaah_hifdzul_jadid_dari?: number | null
          murojaah_hifdzul_jadid_hingga?: number | null
          murojaah_hifdzul_qodim?: string | null
          murojaah_tsnai?: string | null
          status?: Database["public"]["Enums"]["mutabaah_status"]
          student_id: string
          ziyadah_ayat_end?: number | null
          ziyadah_ayat_start?: number | null
          ziyadah_jumlah?: number | null
          ziyadah_surat?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          keterangan?: string | null
          murojaah_hifdzul_jadid_dari?: number | null
          murojaah_hifdzul_jadid_hingga?: number | null
          murojaah_hifdzul_qodim?: string | null
          murojaah_tsnai?: string | null
          status?: Database["public"]["Enums"]["mutabaah_status"]
          student_id?: string
          ziyadah_ayat_end?: number | null
          ziyadah_ayat_start?: number | null
          ziyadah_jumlah?: number | null
          ziyadah_surat?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          class?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          class?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      surat: {
        Row: {
          id: string
          juz: number
          name_arabic: string
          name_latin: string
          number: number
          total_ayat: number
        }
        Insert: {
          id?: string
          juz: number
          name_arabic: string
          name_latin: string
          number: number
          total_ayat: number
        }
        Update: {
          id?: string
          juz?: number
          name_arabic?: string
          name_latin?: string
          number?: number
          total_ayat?: number
        }
        Relationships: []
      }
      tahfizh_entries: {
        Row: {
          catatan: string | null
          created_at: string
          halaman_id: string | null
          id: string
          is_mutqin: boolean
          kualitas_hafalan: number
          kuantitas_murojaah: number
          page_number: number
          status: Database["public"]["Enums"]["tahfizh_status"]
          student_id: string
          tanggal_hafalan: string | null
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          halaman_id?: string | null
          id?: string
          is_mutqin?: boolean
          kualitas_hafalan?: number
          kuantitas_murojaah?: number
          page_number: number
          status?: Database["public"]["Enums"]["tahfizh_status"]
          student_id: string
          tanggal_hafalan?: string | null
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          halaman_id?: string | null
          id?: string
          is_mutqin?: boolean
          kualitas_hafalan?: number
          kuantitas_murojaah?: number
          page_number?: number
          status?: Database["public"]["Enums"]["tahfizh_status"]
          student_id?: string
          tanggal_hafalan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahfizh_entries_halaman_id_fkey"
            columns: ["halaman_id"]
            isOneToOne: false
            referencedRelation: "halaman_quran"
            referencedColumns: ["id"]
          },
        ]
      }
      ujian: {
        Row: {
          bulan: number
          catatan_guru: string | null
          created_at: string
          created_by: string | null
          id: string
          juz_tested: string
          nilai: number
          student_id: string
          tahun: number
        }
        Insert: {
          bulan: number
          catatan_guru?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          juz_tested: string
          nilai?: number
          student_id: string
          tahun: number
        }
        Update: {
          bulan?: number
          catatan_guru?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          juz_tested?: string
          nilai?: number
          student_id?: string
          tahun?: number
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "guru" | "siswa"
      mutabaah_status: "lulus" | "mengulang" | "libur" | "sakit"
      tahfizh_status: "belum_dihafalkan" | "murajaah" | "tasmi_done" | "mutqin"
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
      app_role: ["guru", "siswa"],
      mutabaah_status: ["lulus", "mengulang", "libur", "sakit"],
      tahfizh_status: ["belum_dihafalkan", "murajaah", "tasmi_done", "mutqin"],
    },
  },
} as const
