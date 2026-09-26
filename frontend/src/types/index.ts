export interface Department {
  id: number;
  name_ar: string;
  name_en: string;
  code: string;
  icon: string;
  color: string;
  description?: string;
  roles?: string[];
  services?: string[];
}

export interface TeamMember {
  id: number;
  username: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  avatar?: string;
  department_id?: number;
  department_ids?: number[];
  role_type: 'admin' | 'manager' | 'head' | 'employee' | 'super_admin';
  is_active: boolean;
  department?: Department;
  departments?: Department[];
}

export interface DriveItem {
  id: number;
  name: string;
  path: string;
  is_folder: boolean;
  file_type?: string;
  file_size?: string;
  created_at: string;
  drive_url?: string;
  mime_type?: string;
}

export interface AuditLog {
  id: number;
  client_id?: number;
  stage_id?: number;
  action: string;
  performed_by: string;
  timestamp: string;
  details?: string;
}

export interface TaskStage {
  id: number;
  client_id: number;
  department_id: number;
  assigned_member_id?: number | null;
  assigned_by_id?: number | null;
  stage_name: string;
  description?: string | null;
  head_instructions?: string | null;
  status: 'pending' | 'in_progress' | 'under_review' | 'revision_requested' | 'completed';
  completion_timestamp?: string | null;
  deliverable_note?: string | null;
  deliverable_url?: string | null;
  order_index: number;
  revision_notes?: string | null;
  reviewer_id?: number | null;
  reviewed_at?: string | null;
  department?: Department;
  assigned_member?: TeamMember | null;
  assigned_by?: TeamMember | null;
  reviewer?: TeamMember | null;
}

export interface TaskReviewPayload {
  stage_id: number;
  reviewer_id: number;
  action: 'approve' | 'request_revision';
  notes?: string;
}

export interface PendingReviewItem {
  stage: TaskStage;
  client_name: string;
  company_name: string;
  client_id: number;
}

export interface Client {
  id: number;
  name: string;
  company_name: string;
  service_type: string;
  request_details?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'intake' | 'in_progress' | 'review' | 'completed';
  drive_folder_url: string;
  drive_folder_id: string;
  website_url?: string;
  agency_email?: string;
  phone?: string;
  platform?: string;
  ticket_number?: string;
  store_id?: string;
  package_name?: string;
  sheet_url?: string;
  brief_sheet?: string;
  intake_timestamp: string;
  target_deadline?: string;
  completion_timestamp?: string;
  progress_percentage: number;
  stages: TaskStage[];
  drive_items: DriveItem[];
  audit_logs: AuditLog[];
}

export interface BriefSheetField {
  id: number;
  key: string;
  title: string;
  description: string;
  value: string;
}

export interface ClientBriefSheetData {
  client_id: number;
  company_name: string;
  sheet_url: string;
  fields: BriefSheetField[];
  raw_data: Record<string, string>;
}

export interface DepartmentWorkload {
  department_id: number;
  name_ar: string;
  name_en: string;
  color: string;
  icon: string;
  total_active_tasks: number;
  total_completed_tasks: number;
  assigned_members_count: number;
}

export interface SystemKPIs {
  total_clients: number;
  active_clients: number;
  completed_clients: number;
  avg_completion_hours: number;
  on_time_sla_rate: number;
  department_workloads: DepartmentWorkload[];
}

export interface NewClientAssignment {
  department_id: number;
  assigned_member_id: number;
  assigned_by_id?: number;
  stage_name: string;
  description?: string;
}

export interface FolderShareConfig {
  folder_type: 'client_uploads' | 'team_deliverables';
  email: string;
  role: 'reader' | 'writer';
}

export interface NewClientPayload {
  name: string;
  company_name: string;
  service_type: string;
  request_details: string;
  priority: string;
  target_deadline_hours: number;
  target_deadline?: string;
  website_url?: string;
  agency_email?: string;
  phone?: string;
  platform?: string;
  ticket_number?: string;
  store_id?: string;
  package_name?: string;
  created_at?: string;
  status?: string;
  assignments: NewClientAssignment[];
  share_email?: string;
  share_role?: 'reader' | 'writer';
  folder_shares?: FolderShareConfig[];
}

export interface ClientGroupHierarchy {
  client_name: string;
  total_companies: number;
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  overall_progress: number;
  companies: Client[];
}

