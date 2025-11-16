const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const auditLogMiddleware = require('./middleware/auditLog');
const siemMiddleware = require('./middleware/siemMiddleware');
const swaggerSpec = require('./config/swagger');

// Import routes
const voterRoutes = require('./routes/voterRoutes');
const electionRoutes = require('./routes/electionRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const voteRoutes = require('./routes/voteRoutes');
const duplicateRoutes = require('./routes/duplicateRoutes');
const deathRecordRoutes = require('./routes/deathRecordRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');
const grievanceRoutes = require('./routes/grievanceRoutes');
const otpRoutes = require('./routes/otpRoutes');
const documentRoutes = require('./routes/documentRoutes');
const pollingStationRoutes = require('./routes/pollingStationRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const epicRoutes = require('./routes/epicRoutes');
const profileRoutes = require('./routes/profileRoutes');
const bloTaskRoutes = require('./routes/bloTaskRoutes');
const transparencyRoutes = require('./routes/transparencyRoutes');
const appealRoutes = require('./routes/appealRoutes');
const revisionRoutes = require('./routes/revisionRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const dataImportRoutes = require('./routes/dataImportRoutes');
const mlDuplicateRoutes = require('./routes/mlDuplicateRoutes');
const siemRoutes = require('./routes/siemRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const endToEndVerificationRoutes = require('./routes/endToEndVerificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_ORIGIN || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl/postman
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true); // permissive during development; tighten if needed
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// SIEM middleware (after request logging, before routes)
app.use(siemMiddleware);

// Audit logging middleware (logs all requests)
app.use(auditLogMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Voting DBMS Backend'
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Voting DBMS API Documentation'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/death-records', deathRecordRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/polling-stations', pollingStationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/epic', epicRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tasks', bloTaskRoutes);
app.use('/api/transparency', transparencyRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/revision', revisionRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/data', dataImportRoutes);
app.use('/api/ml', mlDuplicateRoutes);
app.use('/api/security', siemRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/end-to-end', endToEndVerificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminDashboardRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Voting DBMS API',
    version: '1.0.0',
    endpoints: {
      voters: {
        'POST /api/voters': 'Create a new voter',
        'GET /api/voters': 'Get all voters (paginated)',
        'GET /api/voters/:id': 'Get voter by ID',
        'PUT /api/voters/:id': 'Update voter',
        'DELETE /api/voters/:id': 'Delete voter',
        'POST /api/voters/verify-biometric': 'Verify voter biometric'
      },
      elections: {
        'POST /api/elections': 'Create a new election',
        'GET /api/elections': 'Get all elections (paginated)',
        'GET /api/elections/:id': 'Get election by ID',
        'PUT /api/elections/:id': 'Update election',
        'DELETE /api/elections/:id': 'Delete election'
      },
      candidates: {
        'POST /api/candidates': 'Create a new candidate',
        'GET /api/candidates': 'Get all candidates (paginated, optional ?election_id=)',
        'GET /api/candidates/:id': 'Get candidate by ID',
        'PUT /api/candidates/:id': 'Update candidate',
        'DELETE /api/candidates/:id': 'Delete candidate'
      },
      votes: {
        'POST /api/votes': 'Cast a vote (with hash-chain)',
        'GET /api/votes/:id': 'Get vote by ID',
        'GET /api/votes/election/:election_id': 'Get votes by election',
        'GET /api/votes/election/:election_id/results': 'Get election results',
        'GET /api/votes/verify-chain': 'Verify vote hash-chain integrity'
      },
      duplicates: {
        'POST /api/duplicates/run': 'Run duplicate detection',
        'GET /api/duplicates': 'Get all duplicate checks (paginated, optional ?resolved=)',
        'PUT /api/duplicates/:id/resolve': 'Resolve a duplicate check'
      },
      deathRecords: {
        'POST /api/death-records': 'Create a death record',
        'POST /api/death-records/sync/run': 'Run death record sync',
        'GET /api/death-records': 'Get all death records (paginated)'
      },
      auditLogs: {
        'GET /api/audit-logs': 'Get audit logs (filterable by entity_type, action_type, voter_id, election_id, start_date, end_date)',
        'GET /api/audit-logs/verify-chain': 'Verify audit log hash-chain integrity'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.originalUrl} was not found on this server.`,
    availableEndpoints: '/api'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Ensure users are seeded on startup
const ensureUsersSeeded = require('./db/ensure_users_seeded');
ensureUsersSeeded().catch(err => {
  console.error('⚠️  Warning: Could not seed users:', err.message);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`📖 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;

