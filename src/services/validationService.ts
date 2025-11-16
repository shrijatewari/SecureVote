import api from './api';

export interface AddressComponents {
  house_number?: string;
  street?: string;
  village_city?: string;
  district?: string;
  state?: string;
  pin_code?: string;
}

export interface AddressValidationResult {
  valid: boolean;
  normalized: string;
  normalizedComponents: any;
  addressHash: string;
  geocode: {
    latitude: number;
    longitude: number;
    confidence: number;
    provider: string;
  };
  qualityScore: number;
  validationResult: 'passed' | 'flagged' | 'rejected';
  flags: string[];
  pinValidation: {
    valid: boolean;
    reason?: string;
  };
}

export interface NameValidationResult {
  name: string;
  normalized: string;
  qualityScore: number;
  valid: boolean;
  flags: string[];
  reason?: string;
  soundex: string;
  tokens: string[];
  validationResult: 'passed' | 'flagged' | 'rejected';
}

export interface AddressFlag {
  id: number;
  address_hash: string;
  normalized_address: string;
  voter_count: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  created_at: string;
}

export interface ReviewTask {
  task_id: number;
  voter_id: number;
  task_type: string;
  priority: string;
  status: string;
  details: any;
  validation_scores: any;
  flags: string[];
  voter_name?: string;
  aadhaar_number?: string;
}

const validationService = {
  /**
   * Validate address
   */
  async validateAddress(addressComponents: AddressComponents): Promise<AddressValidationResult> {
    const response = await api.post('/validate/address', addressComponents);
    return response.data.data;
  },

  /**
   * Validate name
   */
  async validateName(name: string, nameType: string = 'first_name'): Promise<NameValidationResult> {
    const response = await api.post('/validate/name', { name, name_type: nameType });
    return response.data.data;
  },

  /**
   * Run address cluster detection
   */
  async runAddressClusterDetection(thresholds?: { low?: number; medium?: number; high?: number }) {
    const response = await api.post('/validate/anomaly/run-address-cluster', { thresholds });
    return response.data.data;
  },

  /**
   * Get address flags
   */
  async getAddressFlags(filters?: {
    status?: string;
    risk_level?: string;
    district?: string;
    state?: string;
    limit?: number;
  }): Promise<AddressFlag[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.risk_level) params.append('risk_level', filters.risk_level);
    if (filters?.district) params.append('district', filters.district);
    if (filters?.state) params.append('state', filters.state);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get(`/validate/address/flags?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Assign address flag
   */
  async assignAddressFlag(flagId: number, assignedTo: number, assignedRole: string) {
    const response = await api.post(`/validate/address/flags/${flagId}/assign`, {
      assigned_to: assignedTo,
      assigned_role: assignedRole
    });
    return response.data;
  },

  /**
   * Resolve address flag
   */
  async resolveAddressFlag(flagId: number, action: 'approved' | 'rejected' | 'false_positive', notes?: string) {
    const response = await api.post(`/validate/address/flags/${flagId}/resolve`, {
      action,
      notes
    });
    return response.data;
  },

  /**
   * Get review tasks
   */
  async getReviewTasks(filters?: {
    status?: string;
    task_type?: string;
    assigned_to?: number;
    assigned_role?: string;
    priority?: string;
    limit?: number;
  }): Promise<ReviewTask[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.task_type) params.append('task_type', filters.task_type);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
    if (filters?.assigned_role) params.append('assigned_role', filters.assigned_role);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get(`/validate/review-tasks?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Assign review task
   */
  async assignReviewTask(taskId: number, assignedTo: number, assignedRole: string) {
    const response = await api.post(`/validate/review-tasks/${taskId}/assign`, {
      assigned_to: assignedTo,
      assigned_role: assignedRole
    });
    return response.data;
  },

  /**
   * Resolve review task
   */
  async resolveReviewTask(
    taskId: number,
    action: 'approved' | 'rejected' | 'escalated' | 'needs_more_info',
    notes?: string
  ) {
    const response = await api.post(`/validate/review-tasks/${taskId}/resolve`, {
      action,
      notes
    });
    return response.data;
  },

  /**
   * Get review task statistics
   */
  async getReviewTaskStatistics(assignedTo?: number) {
    const params = assignedTo ? `?assigned_to=${assignedTo}` : '';
    const response = await api.get(`/validate/review-tasks/statistics${params}`);
    return response.data.data;
  },

  /**
   * Get notifications
   */
  async getNotifications(): Promise<any[]> {
    const response = await api.get('/validate/notifications');
    return response.data.data || [];
  }
};

export default validationService;

