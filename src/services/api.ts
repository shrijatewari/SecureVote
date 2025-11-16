import api from '../config/api';

// Admin
export const adminService = {
  getStats: () => api.get('/admin/dashboard/stats'),
  getGraphs: () => api.get('/admin/dashboard/graphs'),
  getAIStatus: () => api.get('/admin/dashboard/ai-status'),
};

// Auth
export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// Voters
export const voterService = {
  getAll: (page = 1, limit = 10) => api.get(`/voters?page=${page}&limit=${limit}`),
  getById: (id: number) => api.get(`/voters/${id}`),
  create: (data: any) => api.post('/voters', data),
  update: (id: number, data: any) => api.put(`/voters/${id}`, data),
  delete: (id: number) => api.delete(`/voters/${id}`),
  verifyBiometric: (aadhaar: string, biometricHash: string) =>
    api.post('/voters/verify-biometric', { aadhaar_number: aadhaar, biometric_hash: biometricHash }),
};

// Elections
export const electionService = {
  getAll: (page = 1, limit = 10) => api.get(`/elections?page=${page}&limit=${limit}`),
  getById: (id: number) => api.get(`/elections/${id}`),
  create: (data: any) => api.post('/elections', data),
  update: (id: number, data: any) => api.put(`/elections/${id}`, data),
  delete: (id: number) => api.delete(`/elections/${id}`),
};

// Candidates
export const candidateService = {
  getAll: (page = 1, limit = 10, electionId?: number) => {
    const url = electionId 
      ? `/candidates?election_id=${electionId}&page=${page}&limit=${limit}`
      : `/candidates?page=${page}&limit=${limit}`;
    return api.get(url);
  },
  getById: (id: number) => api.get(`/candidates/${id}`),
  create: (data: any) => api.post('/candidates', data),
  update: (id: number, data: any) => api.put(`/candidates/${id}`, data),
  delete: (id: number) => api.delete(`/candidates/${id}`),
};

// Votes
export const voteService = {
  create: (data: any) => api.post('/votes', data),
  getById: (id: number) => api.get(`/votes/${id}`),
  getByElection: (electionId: number, page = 1, limit = 10) =>
    api.get(`/votes/election/${electionId}?page=${page}&limit=${limit}`),
  getResults: (electionId: number) => api.get(`/votes/election/${electionId}/results`),
  verifyChain: () => api.get('/votes/verify-chain'),
};

// Audit Logs
export const auditLogService = {
  getAll: (filters: any = {}, page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), ...filters });
    return api.get(`/audit-logs?${params}`);
  },
  verifyChain: () => api.get('/audit-logs/verify-chain'),
};


// Biometric Admin
export const biometricAdminService = {
  getStats: () => api.get('/admin/biometrics/stats'),
  getVoterBiometric: (voterId: number) => api.get(`/admin/biometrics/voter/${voterId}`),
  compareFaces: (voterId1: number, voterId2: number) => api.post('/admin/biometrics/face-match', { voter_id_1: voterId1, voter_id_2: voterId2 }),
  compareFingerprints: (voterId1: number, voterId2: number) => api.post('/admin/biometrics/fingerprint-match', { voter_id_1: voterId1, voter_id_2: voterId2 }),
  getPendingVerifications: (page = 1, limit = 10) => api.get(`/admin/biometrics/pending?page=${page}&limit=${limit}`),
  approveBiometric: (biometricId: number) => api.post(`/admin/biometrics/${biometricId}/approve`),
  rejectBiometric: (biometricId: number, reason: string) => api.post(`/admin/biometrics/${biometricId}/reject`, { reason }),
  requestRecapture: (biometricId: number) => api.post(`/admin/biometrics/${biometricId}/recapture-request`),
  getFraudFlags: () => api.get('/admin/biometrics/fraud-flags'),
  getFraudClusters: () => api.get('/admin/biometrics/fraud-clusters'),
  getLogs: (page = 1, limit = 50) => api.get(`/admin/biometrics/logs?page=${page}&limit=${limit}`),
  getEnrollments: (page = 1, limit = 10) => api.get(`/admin/biometrics/enrollments?page=${page}&limit=${limit}`),
  approveEnrollment: (biometricId: number) => api.post(`/admin/biometrics/enrollment/${biometricId}/approve`),
};

// Biometric
export const biometricService = {
  register: (voterId: number, faceData: string, fingerprintData: string) =>
    api.post('/biometric/register', { voter_id: voterId, face_data: faceData, fingerprint_data: fingerprintData }),
  verify: (voterId: number, faceData: string, fingerprintData: string) =>
    api.post('/biometric/verify', { voter_id: voterId, face_data: faceData, fingerprint_data: fingerprintData }),
  findMatches: (faceData: string, fingerprintData: string, threshold = 80) =>
    api.post('/biometric/find-matches', { face_data: faceData, fingerprint_data: fingerprintData, threshold }),
  extractFace: (imageBase64: string) => api.post('/biometric/extract-face', { image_base64: imageBase64 }),
  extractFingerprint: (fingerprintBase64: string) =>
    api.post('/biometric/extract-fingerprint', { fingerprint_base64: fingerprintBase64 }),
  // New endpoints for face and fingerprint separately
  registerFace: (voterId: number, faceEmbedding: number[], faceHash: string, livenessPassed: boolean) =>
    api.post('/biometric/face/register', { voter_id: voterId, face_embedding: faceEmbedding, face_hash: faceHash, liveness_passed: livenessPassed }),
  registerFingerprint: (voterId: number, fingerprintTemplate: number[], fingerprintHash: string) =>
    api.post('/biometric/fingerprint/register', { voter_id: voterId, fingerprint_template: fingerprintTemplate, fingerprint_hash: fingerprintHash }),
  verifyFace: (voterId: number, faceEmbedding: number[]) =>
    api.post('/biometric/face/verify', { voter_id: voterId, face_embedding: faceEmbedding }),
  verifyFingerprint: (voterId: number, fingerprintTemplate: number[]) =>
    api.post('/biometric/fingerprint/verify', { voter_id: voterId, fingerprint_template: fingerprintTemplate }),
};

// Grievances
export const grievanceService = {
  create: (data: any) => api.post('/grievances', data),
  getAll: (filters: any = {}, page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), ...filters });
    return api.get(`/grievances?${params}`);
  },
  getById: (id: number) => api.get(`/grievances/${id}`),
  getByTicket: (ticketNumber: string) => api.get(`/grievances/ticket/${ticketNumber}`),
  update: (id: number, data: any) => api.put(`/grievances/${id}`, data),
  reopen: (id: number, reason: string) => api.post(`/grievances/${id}/reopen`, { reason }),
};

// OTP
export const otpService = {
  sendAadhaar: (aadhaarNumber: string) => api.post('/otp/send/aadhaar', { aadhaar_number: aadhaarNumber }),
  sendEmail: (email: string) => api.post('/otp/send/email', { email }),
  sendMobile: (mobileNumber: string) => api.post('/otp/send/mobile', { mobile_number: mobileNumber }),
  verify: (identifier: string, otpType: string, otpCode: string) =>
    api.post('/otp/verify', { identifier, otp_type: otpType, otp_code: otpCode }),
};

// Documents
export const documentService = {
  upload: (voterId: number, documentType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('voter_id', voterId.toString());
    formData.append('document_type', documentType);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getVoterDocuments: (voterId: number) => api.get(`/documents/voter/${voterId}`),
  getDocument: (documentId: number) => api.get(`/documents/${documentId}`, { responseType: 'blob' }),
  delete: (documentId: number) => api.delete(`/documents/${documentId}`),
};

// Polling Stations
export const pollingStationService = {
  create: (data: any) => api.post('/polling-stations', data),
  getAll: (filters: any = {}, page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), ...filters });
    return api.get(`/polling-stations?${params}`);
  },
  getById: (id: number) => api.get(`/polling-stations/${id}`),
  findNearest: (district: string, state: string, pinCode?: string) => {
    const params = new URLSearchParams({ district, state });
    if (pinCode) params.append('pin_code', pinCode);
    return api.get(`/polling-stations/nearest?${params}`);
  },
  assignVoter: (stationId: number, voterId: number) =>
    api.post(`/polling-stations/${stationId}/assign`, { voter_id: voterId }),
  getVoterCount: (stationId: number) => api.get(`/polling-stations/${stationId}/voter-count`),
};

// Applications
export const applicationService = {
  getApplication: (applicationId: string) => api.get(`/applications/${applicationId}`),
  getTrackingHistory: (applicationId: string) => api.get(`/applications/${applicationId}/tracking`),
  updateStatus: (applicationId: string, status: string, remarks?: string) =>
    api.put(`/applications/${applicationId}/status`, { status, remarks }),
};

// EPIC
export const epicService = {
  getDetails: (epicNumber: string) => api.get(`/epic/${epicNumber}`),
  download: (epicNumber: string) => api.get(`/epic/${epicNumber}/download`),
  generateForVoter: (voterId: number) => api.get(`/epic/voter/${voterId}/generate`),
};

// Profile
export const profileService = {
  getProfile: (voterId?: number) => {
    // If no voterId provided, get from current user or use empty string (backend will get from token)
    const id = voterId ? `/${voterId}` : '';
    return api.get(`/profile${id}`);
  },
  updateProfile: (voterId: number, data: any) => {
    if (!voterId) {
      return Promise.reject(new Error('Voter ID is required'));
    }
    return api.put(`/profile/${voterId}`, data);
  },
  getCompletionStatus: (voterId?: number) => {
    const id = voterId ? `/${voterId}` : '';
    return api.get(`/profile${id}/completion`);
  },
  verifyContact: (voterId: number, type: string, verified: boolean) => 
    api.post(`/profile/${voterId}/verify-contact`, { type, verified }),
  addFamilyRelation: (voterId: number, data: any) => 
    api.post(`/profile/${voterId}/family`, data),
  getFamilyRelations: (voterId?: number) => api.get(`/profile/${voterId || ''}/family`),
  removeFamilyRelation: (relationId: number) => api.delete(`/profile/family/${relationId}`),
  importFromDigiLocker: (voterId: number, aadhaarNumber: string) =>
    api.post(`/profile/${voterId}/import-digilocker`, { aadhaar_number: aadhaarNumber }),
};

// Duplicate Detection
export const duplicateService = {
  runDetection: (options: any) => api.post('/duplicates/run', options),
  getAll: (page = 1, limit = 10, resolved?: boolean) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (resolved !== undefined) params.append('resolved', resolved.toString());
    return api.get(`/duplicates?${params}`);
  },
  resolve: (id: number, data: any) => api.put(`/duplicates/${id}/resolve`, data),
};

// ML Duplicate Detection
export const mlDuplicateService = {
  detectDuplicatesML: (options: any) => api.post('/ml/duplicate', options),
  detectAnomalies: () => api.get('/ml/anomalies'),
};

// Death Records
export const deathRecordService = {
  getAll: (page = 1, limit = 10) => api.get(`/death-records?page=${page}&limit=${limit}`),
  create: (data: any) => api.post('/death-records', data),
  runSync: (options: any) => api.post('/death-records/sync/run', options),
  getDeathSyncFlags: () => api.get('/death-records/sync/flags'),
  markVoterDeceased: (voterId: number, data: any) => api.put(`/death-records/voters/${voterId}/mark-deceased`, data),
};

// BLO Tasks
export const bloTaskService = {
  assignTask: (data: any) => api.post('/tasks/assign', data),
  getBLOTasks: (bloId: number, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return api.get(`/tasks/blo/${bloId}${query}`);
  },
  submitTask: (taskId: number, data: any) => api.post(`/tasks/${taskId}/submit`, data),
};

// Transparency
export const transparencyService = {
  getMerkleRoot: (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return api.get(`/transparency/merkle-root${params}`);
  },
  exportData: (region?: string) => {
    const params = region ? `?region=${region}` : '';
    return api.get(`/transparency/export${params}`);
  },
  verifyMyRecord: (voterId: number) => api.post('/transparency/verify/my-record', { voter_id: voterId }),
};

// Appeals
export const appealService = {
  createAppeal: (data: any) => api.post('/appeals', data),
  getAppealStatus: (id: number) => api.get(`/appeals/${id}/status`),
  updateAppeal: (id: number, data: any) => api.put(`/appeals/${id}`, data),
};

// Revision Announcements & Roll Revision
export const revisionService = {
  // Batch Management
  getAll: (page = 1, limit = 10) => api.get(`/revision/batches?page=${page}&limit=${limit}`),
  getBatchById: (id: number) => api.get(`/revision/batches/${id}`),
  runDryRun: (options: any) => api.post('/revision/dry-run', options),
  commit: (batchId: number) => api.post(`/revision/batches/${batchId}/commit`),
  getBatchFlags: (batchId: number) => api.get(`/revision/batches/${batchId}/flags`),
  // Announcements
  getActiveAnnouncements: (region?: any) => {
    const params = new URLSearchParams();
    if (region?.district) params.append('district', region.district);
    if (region?.state) params.append('state', region.state);
    return api.get(`/revision/announcements?${params}`);
  },
  getAllAnnouncements: (page = 1, limit = 10) => api.get(`/revision/announcements/all?page=${page}&limit=${limit}`),
  getAnnouncementById: (id: number) => api.get(`/revision/announcements/${id}`),
  createAnnouncement: (data: any) => api.post('/revision/announce', data),
};

// Communications
export const communicationService = {
  getCommunicationsByType: (type: string, page = 1, limit = 10) => api.get(`/communications/type/${type}?page=${page}&limit=${limit}`),
  getCommunicationById: (id: number) => api.get(`/communications/${id}`),
  verifyCommunication: (id: number) => api.get(`/communications/verify/${id}`),
  createCommunication: (data: any) => api.post('/communications/notice', data),
};

// Rumor Flagging
export const rumorService = {
  flagRumor: (data: any) => api.post('/communications/rumour/flag', data),
  getRumorFlagsByStatus: (status: string, page = 1, limit = 10) => api.get(`/communications/rumour/status/${status}?page=${page}&limit=${limit}`),
  reviewRumorFlag: (id: number, data: any) => api.put(`/communications/rumour/${id}/review`, data),
};

// Data Import
export const dataImportService = {
  createImport: (data: any) => api.post('/data/import', data),
  getAllImports: (page = 1, limit = 10) => api.get(`/data/imports?page=${page}&limit=${limit}`),
  getImportById: (id: number) => api.get(`/data/import/${id}`),
  runDedupeOnImport: (id: number, options: any) => api.post(`/data/dedupe/run/${id}`, options),
  commitImport: (id: number, options: any) => api.post(`/data/migrate/commit/${id}`, options),
  rollbackImport: (id: number) => api.post(`/data/migrate/rollback/${id}`),
};

// SIEM
export const siemService = {
  logSecurityEvent: (data: any) => api.post('/security/incident', data),
  detectSuspiciousLogins: () => api.get('/security/suspicious-logins'),
  getSecurityStats: (days = 7) => api.get(`/security/stats?days=${days}`),
};

// Ledger
export const ledgerService = {
  createVoteBlock: (data: any) => api.post('/ledger/vote-block', data),
  verifyLedgerIntegrity: () => api.get('/ledger/verify'),
  getBlockByVoteId: (voteId: number) => api.get(`/ledger/vote/${voteId}`),
  getLedgerChain: (page = 1, limit = 100) => api.get(`/ledger/chain?page=${page}&limit=${limit}`),
};

// End-to-End Verification
export const endToEndVerificationService = {
  generateVoteReference: (voteId: number) => api.post(`/end-to-end/votes/${voteId}/reference`),
  verifyVoteReference: (referenceCode: string) => api.get(`/end-to-end/votes/verify/${referenceCode}`),
  generateElectionProof: (electionId: number) => api.get(`/end-to-end/votes/election/${electionId}/proof`),
};

// AI Services
export const aiService = {
  // Duplicate Detection
  predictDuplicate: (record1: any, record2: any) => api.post('/ai/duplicates/predict', { record1, record2 }),
  batchDetectDuplicates: (records: any[], threshold: number = 0.7) => 
    api.post('/ai/duplicates/batch-run', { records, threshold }),
  
  // Address Intelligence
  normalizeAddress: (address: any) => api.post('/ai/address/normalize', { address }),
  detectAddressFraud: (address: any) => api.post('/ai/address/fraud-detect', { address }),
  
  // Deceased Matching
  matchDeceased: (voterRecord: any, deathRecord: any) => 
    api.post('/ai/deceased/match', { voter_record: voterRecord, death_record: deathRecord }),
  
  // Document Verification
  verifyDocument: (documentBase64: string, documentType: string) => 
    api.post('/ai/documents/verify', { document_base64: documentBase64, document_type: documentType }),
  
  // Forgery Detection
  verifyNotice: (documentBase64: string, originalHash?: string) => 
    api.post('/ai/forgery/verify', { document_base64: documentBase64, original_hash: originalHash }),
  
  // Biometric Matching
  matchFace: (embedding1: number[], embedding2: number[]) => 
    api.post('/ai/biometrics/face-match', { embedding1, embedding2 }),
  matchFingerprint: (template1: number[], template2: number[]) => 
    api.post('/ai/biometrics/fingerprint-match', { template1, template2 }),
  
  // Health Check
  healthCheck: () => api.get('/ai/health'),
};

