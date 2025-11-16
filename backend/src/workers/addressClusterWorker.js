const addressAnomalyService = require('../services/addressAnomalyDetectionService');
const auditLogService = require('../services/auditLogService');

/**
 * Background Worker for Address Cluster Detection
 * Runs periodically to detect suspicious address clusters
 */
class AddressClusterWorker {
  constructor(intervalMinutes = 60) {
    this.intervalMinutes = intervalMinutes;
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Run cluster detection once
   */
  async runDetection() {
    if (this.isRunning) {
      console.log('⏸️  Address cluster detection already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🔍 Starting address cluster detection...');
      
      const thresholds = {
        low: 6,
        medium: 12,
        high: 20
      };

      const result = await addressAnomalyService.detectAddressClusters(thresholds);

      // Log audit event
      try {
        await auditLogService.logAction({
          action_type: 'anomaly_detection_run',
          entity_type: 'address_cluster',
          metadata: JSON.stringify({
            flags_created: result.flagsCreated,
            thresholds,
            execution_time_ms: Date.now() - startTime
          })
        });
      } catch (e) {
        console.warn('Audit log failed:', e.message);
      }

      console.log(`✅ Address cluster detection completed: ${result.flagsCreated} flags created/updated`);
      
      return result;
    } catch (error) {
      console.error('❌ Address cluster detection failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start periodic detection
   */
  start() {
    if (this.intervalId) {
      console.log('⚠️  Address cluster worker already started');
      return;
    }

    console.log(`🚀 Starting address cluster worker (interval: ${this.intervalMinutes} minutes)`);
    
    // Run immediately on start
    this.runDetection().catch(err => {
      console.error('Initial cluster detection failed:', err);
    });

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runDetection().catch(err => {
        console.error('Periodic cluster detection failed:', err);
      });
    }, this.intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic detection
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Address cluster worker stopped');
    }
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.intervalId !== null,
      intervalMinutes: this.intervalMinutes
    };
  }
}

// Singleton instance
const worker = new AddressClusterWorker(
  parseInt(process.env.ADDRESS_CLUSTER_INTERVAL_MINUTES) || 60
);

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  worker.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping address cluster worker...');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping address cluster worker...');
    worker.stop();
    process.exit(0);
  });
}

module.exports = worker;

