export interface Job {
  id: string;
  user_id: string;
  mutation_type: string;
  input_mode: string;
  input_text: string | null;
  file_url: string | null;
  output_fasta_path: string | null;
  output_dbf_path: string | null;
  output_dbpepmutref_path: string | null;
  output_inframe_path?: string | null;
  output_ext_path?: string | null;
  error_message: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  size_bytes?: number;
  created_at: string;
  updated_at: string;
}

export interface ToolCardProps {
  title: string;
  desc: string;
  features: string[];
  btnLabel: string;
  btnVariant?: 'contained' | 'outlined' | 'text';
  accent: string;
  onClick: () => void;
}

export interface SheetInfo {
  columns: string[];
  row_count: number;
}

export interface SheetData {
  sheet_name?: string;
  columns: string[];
  all_columns: string[];
  data: Record<string, any>[];
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AvailableJob {
  id: string;
  mutation_type: string;
  created_at: string;
  has_dbpepmutref: boolean;
}
