const pool = require('../config/database');
const { generateHash, getLastVoteHash } = require('../utils/hashChain');
const voterService = require('./voterService');
const electionService = require('./electionService');

// Helper to get last ledger hash
async function getLastLedgerHash(connection) {
  try {
    const [ledger] = await connection.query(
      'SELECT block_hash FROM vote_ledger ORDER BY created_at DESC LIMIT 1'
    );
    return ledger.length > 0 ? ledger[0].block_hash : '0';
  } catch {
    return '0';
  }
}

class VoteService {
  async createVote(voteData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if voter exists and is verified
      const voter = await voterService.getVoterById(voteData.voter_id);
      if (!voter) {
        throw new Error('Voter not found');
      }
      if (!voter.is_verified) {
        throw new Error('Voter is not verified');
      }

      // Check profile completion for sensitive activities
      const profileService = require('./profileService');
      try {
        const completion = await profileService.getCompletionStatus(voteData.voter_id);
        const completionData = completion?.data || completion;
        
        if (completionData) {
          const mandatoryCheckpoints = [
            'aadhaar_otp',
            'email_otp',
            'mobile_otp',
            'address_doc',
            'personal_info',
            'biometrics',
          ];
          
          const checkpoints = completionData.checkpoints || {};
          const allMandatoryComplete = mandatoryCheckpoints.every(
            key => checkpoints[key] === true
          );
          
          if (!allMandatoryComplete || completionData.completionPercentage < 100) {
            const incomplete = mandatoryCheckpoints.filter(key => !checkpoints[key]);
            const incompleteNames = incomplete.map(k => {
              const names = {
                'aadhaar_otp': 'Aadhaar OTP Verification',
                'email_otp': 'Email Verification',
                'mobile_otp': 'Mobile Verification',
                'address_doc': 'Address Document',
                'personal_info': 'Personal Information',
                'biometrics': 'Biometric Registration'
              };
              return names[k] || k.replace('_', ' ');
            });
            throw new Error(`Profile incomplete (${completionData.completionPercentage || 0}% complete). Please complete: ${incompleteNames.join(', ')}`);
          }
        }
      } catch (profileError) {
        // If profile check fails, block voting for safety
        if (profileError.message.includes('Profile incomplete')) {
          throw profileError;
        }
        // For other errors, log but don't block (graceful degradation)
        console.warn('Profile completion check failed:', profileError.message);
      }

      // Check if voter is marked as inactive/deceased
      // Only block voting if voter is explicitly marked inactive
      // Death records alone don't block - they need admin verification
      if (voter.is_active === false) {
        throw new Error('Voter is deceased');
      }

      // Check if election is active
      const isActive = await electionService.isElectionActive(voteData.election_id);
      if (!isActive) {
        throw new Error('Election is not active');
      }

      // Check if voter already voted in this election
      const [existing] = await connection.query(
        'SELECT vote_id FROM votes WHERE voter_id = ? AND election_id = ?',
        [voteData.voter_id, voteData.election_id]
      );

      if (existing.length > 0) {
        throw new Error('Voter has already voted in this election');
      }

      // Get previous hash for hash-chain
      const previousHash = await getLastVoteHash(connection);
      const timestamp = new Date();

      // Generate current hash
      const hashData = {
        voter_id: voteData.voter_id,
        candidate_id: voteData.candidate_id,
        election_id: voteData.election_id,
        timestamp: timestamp.toISOString()
      };
      const currentHash = generateHash(previousHash, hashData, timestamp.toISOString());

      // Insert vote
      const [result] = await connection.query(
        'INSERT INTO votes (voter_id, candidate_id, election_id, timestamp, previous_hash, current_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [
          voteData.voter_id,
          voteData.candidate_id,
          voteData.election_id,
          timestamp,
          previousHash,
          currentHash
        ]
      );

      // Create ledger block after vote insert
      let ledgerBlock = null;
      try {
        const ledgerService = require('./ledgerService');
        const lastLedgerHash = await getLastLedgerHash(connection);
        ledgerBlock = await ledgerService.createVoteBlock({
          vote_id: result.insertId,
          voter_id: voteData.voter_id,
          election_id: voteData.election_id,
          candidate_id: voteData.candidate_id,
          timestamp: timestamp.toISOString()
        }, lastLedgerHash);
      } catch (err) {
        // Ledger service not critical, continue without it
        console.warn('Ledger service unavailable:', err.message);
      }

      await connection.commit();
      
      // Generate vote reference for end-to-end verification
      try {
        const endToEndService = require('./endToEndVerificationService');
        const reference = await endToEndService.generateVoteReference(result.insertId);
        if (reference) {
          // Reference stored in database, will be returned separately if needed
        }
      } catch (err) {
        console.warn('End-to-end verification service unavailable:', err.message);
      }
      
      const vote = await this.getVoteById(result.insertId);
      if (vote && ledgerBlock) {
        vote.ledger_block = ledgerBlock;
      }
      return vote;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getVoteById(voteId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM votes WHERE vote_id = ?',
        [voteId]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  async getVotesByElection(electionId, page = 1, limit = 10) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      const [rows] = await connection.query(
        'SELECT * FROM votes WHERE election_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [electionId, limit, offset]
      );
      const [countRows] = await connection.query(
        'SELECT COUNT(*) as total FROM votes WHERE election_id = ?',
        [electionId]
      );
      return {
        votes: rows,
        pagination: {
          page,
          limit,
          total: countRows[0].total,
          totalPages: Math.ceil(countRows[0].total / limit)
        }
      };
    } finally {
      connection.release();
    }
  }

  async getElectionResults(electionId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT 
          c.candidate_id,
          c.name,
          COUNT(v.vote_id) as vote_count
        FROM candidates c
        LEFT JOIN votes v ON c.candidate_id = v.candidate_id AND v.election_id = ?
        WHERE c.election_id = ?
        GROUP BY c.candidate_id, c.name
        ORDER BY vote_count DESC`,
        [electionId, electionId]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  async verifyHashChain() {
    const connection = await pool.getConnection();
    try {
      const { verifyHashChain } = require('../utils/hashChain');
      return await verifyHashChain(connection, 'votes');
    } finally {
      connection.release();
    }
  }
}

module.exports = new VoteService();

