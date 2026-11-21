export interface OperationVolunteer {
  user_id: string;
  email: string;
  name: string | null;
  permission: string;
  is_active: boolean;
}

export interface OperationActivityItem {
  action: string;
  created_at: string;
  email: string | null;
  registration_id: string | null;
  details: Record<string, unknown>;
}

export interface OperationsSummary {
  total_registered: number;
  checked_in: number;
  snacks_distributed: number;
  pending_checkin: number;
  snack_policy: string;
  volunteers: OperationVolunteer[];
  recent_activity: OperationActivityItem[];
}