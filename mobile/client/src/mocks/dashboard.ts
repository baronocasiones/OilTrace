export interface NextRequest {
  id: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'none';
  request_type: 'on_demand' | 'scheduled';
  driver_name: string | null;
  scheduled_date: string | null;
}

export interface RecentCollection {
  id: string;
  collected_at: string;
  volume_liters: number;
  tpm_value: number;
  oil_grade: 'premium' | 'standard' | 'danger';
  blockchain_status: 'verified' | 'pending' | 'failed';
  points_awarded: number;
}

export interface DashboardData {
  business_name: string;
  points_balance: number;
  points_peso_value: number;
  next_request: NextRequest | null;
  recent_collection: RecentCollection | null;
}

export const mockDashboardData: Record<string, DashboardData> = {
  // Default populated dashboard
  default: {
    business_name: "Aling Maria's Karinderya",
    points_balance: 240,
    points_peso_value: 120.00,
    next_request: {
      id: "req-101",
      status: "assigned",
      request_type: "on_demand",
      driver_name: "Juan dela Cruz",
      scheduled_date: null,
    },
    recent_collection: {
      id: "col-201",
      collected_at: "2026-06-20T10:30:00Z",
      volume_liters: 5.0,
      tpm_value: 18.3,
      oil_grade: "premium",
      blockchain_status: "verified",
      points_awarded: 50,
    },
  },
  
  // Pending request
  pendingRequest: {
    business_name: "Aling Maria's Karinderya",
    points_balance: 240,
    points_peso_value: 120.00,
    next_request: {
      id: "req-102",
      status: "pending",
      request_type: "on_demand",
      driver_name: null,
      scheduled_date: null,
    },
    recent_collection: {
      id: "col-201",
      collected_at: "2026-06-20T10:30:00Z",
      volume_liters: 5.0,
      tpm_value: 18.3,
      oil_grade: "premium",
      blockchain_status: "verified",
      points_awarded: 50,
    },
  },

  // In-progress request
  inProgressRequest: {
    business_name: "Aling Maria's Karinderya",
    points_balance: 240,
    points_peso_value: 120.00,
    next_request: {
      id: "req-103",
      status: "in_progress",
      request_type: "on_demand",
      driver_name: "Juan dela Cruz",
      scheduled_date: null,
    },
    recent_collection: {
      id: "col-201",
      collected_at: "2026-06-20T10:30:00Z",
      volume_liters: 5.0,
      tpm_value: 18.3,
      oil_grade: "premium",
      blockchain_status: "verified",
      points_awarded: 50,
    },
  },

  // No upcoming pickups (null next_request)
  noRequest: {
    business_name: "Aling Maria's Karinderya",
    points_balance: 240,
    points_peso_value: 120.00,
    next_request: null,
    recent_collection: {
      id: "col-201",
      collected_at: "2026-06-20T10:30:00Z",
      volume_liters: 5.0,
      tpm_value: 18.3,
      oil_grade: "premium",
      blockchain_status: "verified",
      points_awarded: 50,
    },
  },

  // First time user (no collections, no request, 0 points)
  firstTime: {
    business_name: "Aling Maria's Karinderya",
    points_balance: 0,
    points_peso_value: 0.00,
    next_request: null,
    recent_collection: null,
  },
};
