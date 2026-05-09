export interface Database {
  public: {
    Tables: {
      exam_boards: {
        Row: {
          id: string;
          name: string;
          full_name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          full_name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          full_name?: string;
          slug?: string;
          created_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          exam_board_id: string;
          name: string;
          display_name: string;
          code: string | null;
          slug: string;
          icon: string | null;
          price_cny: number;
          is_published: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_board_id: string;
          name: string;
          display_name: string;
          code?: string | null;
          slug: string;
          icon?: string | null;
          price_cny: number;
          is_published?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          exam_board_id?: string;
          name?: string;
          display_name?: string;
          code?: string | null;
          slug?: string;
          icon?: string | null;
          price_cny?: number;
          is_published?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          name: string;
          display_name: string;
          slug: string;
          description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          name: string;
          display_name: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          name?: string;
          display_name?: string;
          slug?: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          topic_id: string;
          title: string;
          content: string;
          is_free_preview: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          title: string;
          content: string;
          is_free_preview?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          title?: string;
          content?: string;
          is_free_preview?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          topic_id: string;
          question_text: string;
          answer_text: string;
          difficulty: string;
          question_type: string;
          marks: number | null;
          is_free_preview: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          question_text: string;
          answer_text: string;
          difficulty?: string;
          question_type?: string;
          marks?: number | null;
          is_free_preview?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          question_text?: string;
          answer_text?: string;
          difficulty?: string;
          question_type?: string;
          marks?: number | null;
          is_free_preview?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      past_papers: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          year: number;
          season: string;
          paper_number: number;
          paper_type: string;
          file_url: string;
          is_free: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          title: string;
          year: number;
          season: string;
          paper_number: number;
          paper_type: string;
          file_url: string;
          is_free?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          title?: string;
          year?: number;
          season?: string;
          paper_number?: number;
          paper_type?: string;
          file_url?: string;
          is_free?: boolean;
          created_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          amount_cny: number;
          alipay_trade_no: string | null;
          status: string;
          paid_at: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          amount_cny: number;
          alipay_trade_no?: string | null;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          amount_cny?: number;
          alipay_trade_no?: string | null;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
      };
    };
  };
}
