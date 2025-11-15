const pool = require('../config/database');
const crypto = require('crypto');
const { generateToken } = require('../middleware/auth');

// Helper function to generate hash
function generateHash(previousHash, data, timestamp) {
  const dataString = JSON.stringify(data);
  const combined = (previousHash || '0') + dataString + timestamp;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// Generate random Aadhaar number
function generateAadhaar() {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

// Generate biometric hash
function generateBiometricHash() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate random phone number
function generatePhone() {
  return Math.floor(6000000000 + Math.random() * 4000000000).toString();
}

// Generate random email
function generateEmail(name) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleanName}${Math.floor(Math.random() * 1000)}@${domain}`;
}

async function seedComprehensiveDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('🌱 Starting comprehensive database seeding...\n');

    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tablesToClear = [
      'votes', 'candidate_manifestos', 'candidates', 'duplicate_checks',
      'audit_logs', 'death_records', 'voters', 'elections',
      'grievances', 'grievance_attachments', 'voter_documents',
      'polling_stations', 'applications', 'application_tracking',
      'otp_verifications', 'notifications', 'transparency_merkle_roots',
      'vote_references', 'revision_batches', 'revision_flags',
      'death_sync_flags', 'blo_tasks', 'task_submissions',
      'communications', 'appeals', 'data_imports', 'ai_scores',
      'ocr_results', 'address_cluster_flags', 'biometric_scores',
      'biometrics', 'biometric_verification_logs'
    ];
    
    for (const table of tablesToClear) {
      try {
        await connection.query(`TRUNCATE TABLE ${table}`);
      } catch (err) {
        // Table might not exist, skip
      }
    }
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Cleared existing data\n');

    // ============================================
    // 1. SEED VOTERS (50 voters with full data)
    // ============================================
    console.log('👥 Seeding voters...');
    const voters = [];
    const voterNames = [
      'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh',
      'Anjali Mehta', 'Rahul Gupta', 'Kavita Nair', 'Suresh Iyer', 'Meera Joshi',
      'Arjun Desai', 'Divya Rao', 'Karan Malhotra', 'Pooja Shah', 'Nikhil Agarwal',
      'Riya Kapoor', 'Aditya Verma', 'Shreya Menon', 'Rohan Bhatia', 'Neha Chawla',
      'Vikram Mehta', 'Sunita Patel', 'Rajesh Reddy', 'Kavita Sharma', 'Amit Kumar',
      'Priya Nair', 'Rahul Iyer', 'Sneha Joshi', 'Anjali Desai', 'Vikram Rao',
      'Karan Shah', 'Pooja Agarwal', 'Nikhil Kapoor', 'Riya Verma', 'Aditya Menon',
      'Shreya Bhatia', 'Rohan Chawla', 'Neha Mehta', 'Sunita Patel', 'Rajesh Kumar',
      'Kavita Sharma', 'Amit Reddy', 'Priya Nair', 'Rahul Iyer', 'Sneha Joshi',
      'Anjali Desai', 'Vikram Rao', 'Karan Shah', 'Pooja Agarwal', 'Nikhil Kapoor'
    ];

    const states = ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'West Bengal', 'Uttar Pradesh'];
    const districts = {
      'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
      'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
      'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
      'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
      'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
      'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
      'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad']
    };

    for (let i = 0; i < 50; i++) {
      const dob = new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const aadhaar = generateAadhaar();
      const biometricHash = generateBiometricHash();
      const state = states[Math.floor(Math.random() * states.length)];
      const district = districts[state][Math.floor(Math.random() * districts[state].length)];
      const gender = ['Male', 'Female', 'Other'][Math.floor(Math.random() * 3)];
      const name = voterNames[i];
      
      const [result] = await connection.query(
        `INSERT INTO voters (
          name, dob, aadhaar_number, biometric_hash, is_verified,
          email, mobile_number, father_name, gender,
          house_number, street, village_city, district, state, pin_code,
          mother_name, guardian_name, fingerprint_hash, face_embedding_hash,
          email_verified, mobile_verified, application_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          dob.toISOString().split('T')[0],
          aadhaar,
          biometricHash,
          Math.random() > 0.3, // 70% verified
          generateEmail(name),
          generatePhone(),
          `${name.split(' ')[0]} ${['Kumar', 'Singh', 'Sharma', 'Patel', 'Reddy'][Math.floor(Math.random() * 5)]}`,
          gender,
          `${Math.floor(Math.random() * 999) + 1}`,
          `${['Main Street', 'Park Avenue', 'Gandhi Road', 'Nehru Nagar', 'Rajiv Chowk'][Math.floor(Math.random() * 5)]}`,
          district,
          district,
          state,
          `${Math.floor(100000 + Math.random() * 900000)}`,
          `${name.split(' ')[0]} ${['Devi', 'Bai', 'Kumari', 'Laxmi'][Math.floor(Math.random() * 4)]}`,
          null,
          Math.random() > 0.5 ? generateBiometricHash() : null,
          Math.random() > 0.5 ? generateBiometricHash() : null,
          Math.random() > 0.5,
          Math.random() > 0.5,
          ['submitted', 'under_review', 'field_verification', 'approved', 'epic_generated'][Math.floor(Math.random() * 5)]
        ]
      );
      voters.push({ voter_id: result.insertId, aadhaar_number: aadhaar, name });
    }
    console.log(`✅ Seeded ${voters.length} voters\n`);

    // ============================================
    // 2. SEED ELECTIONS (5 elections)
    // ============================================
    console.log('🗳️ Seeding elections...');
    const elections = [];
    const electionTitles = [
      'Lok Sabha General Election 2024',
      'State Assembly Election - Maharashtra 2024',
      'Municipal Corporation Election - Delhi 2024',
      'Panchayat Election - Karnataka 2024',
      'By-Election - Constituency 12'
    ];

    for (let i = 0; i < 5; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (i * 30));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      const statuses = ['upcoming', 'active', 'completed'];
      const status = i < 2 ? 'upcoming' : i === 2 ? 'active' : 'completed';
      
      const [result] = await connection.query(
        'INSERT INTO elections (title, start_date, end_date, status) VALUES (?, ?, ?, ?)',
        [electionTitles[i], startDate, endDate, status]
      );
      elections.push({ election_id: result.insertId, title: electionTitles[i], status });
    }
    console.log(`✅ Seeded ${elections.length} elections\n`);

    // ============================================
    // 3. SEED CANDIDATES (3-5 per election)
    // ============================================
    console.log('👔 Seeding candidates...');
    const candidates = [];
    const candidateNames = [
      'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh',
      'Anjali Mehta', 'Rahul Gupta', 'Kavita Nair', 'Suresh Iyer', 'Meera Joshi',
      'Arjun Desai', 'Divya Rao', 'Karan Malhotra', 'Pooja Shah', 'Nikhil Agarwal'
    ];

    for (const election of elections) {
      const numCandidates = 3 + Math.floor(Math.random() * 3); // 3-5 candidates
      for (let i = 0; i < numCandidates; i++) {
        const name = candidateNames[Math.floor(Math.random() * candidateNames.length)];
        const [result] = await connection.query(
          'INSERT INTO candidates (election_id, name, manifesto) VALUES (?, ?, ?)',
          [election.election_id, `${name} (Candidate ${i + 1})`, `Manifesto for ${name} in ${election.title}`]
        );
        candidates.push({ candidate_id: result.insertId, election_id: election.election_id, name });
      }
    }
    console.log(`✅ Seeded ${candidates.length} candidates\n`);

    // ============================================
    // 4. SEED VOTES (for completed/active elections)
    // ============================================
    console.log('✅ Seeding votes...');
    let previousHash = null;
    let voteCount = 0;
    
    for (const election of elections) {
      if (election.status === 'completed' || election.status === 'active') {
        const electionCandidates = candidates.filter(c => c.election_id === election.election_id);
        const numVotes = election.status === 'completed' ? 30 : 10;
        
        for (let i = 0; i < numVotes && i < voters.length; i++) {
          const voter = voters[i];
          const candidate = electionCandidates[Math.floor(Math.random() * electionCandidates.length)];
          
          const timestamp = new Date();
          const voteData = {
            voter_id: voter.voter_id,
            candidate_id: candidate.candidate_id,
            election_id: election.election_id,
            timestamp: timestamp.toISOString()
          };
          const currentHash = generateHash(previousHash, voteData, timestamp.toISOString());
          
          await connection.query(
            'INSERT INTO votes (voter_id, candidate_id, election_id, timestamp, previous_hash, current_hash) VALUES (?, ?, ?, ?, ?, ?)',
            [voter.voter_id, candidate.candidate_id, election.election_id, timestamp, previousHash, currentHash]
          );
          
          previousHash = currentHash;
          voteCount++;
        }
      }
    }
    console.log(`✅ Seeded ${voteCount} votes\n`);

    // ============================================
    // 5. SEED DUPLICATE CHECKS (10 flagged duplicates)
    // ============================================
    console.log('🔍 Seeding duplicate checks...');
    for (let i = 0; i < 10 && i < voters.length - 1; i++) {
      const similarity = 75 + Math.random() * 20; // 75-95%
      await connection.query(
        'INSERT INTO duplicate_checks (voter_id_1, voter_id_2, similarity_score, flagged_date, resolved) VALUES (?, ?, ?, NOW(), ?)',
        [voters[i].voter_id, voters[i + 1].voter_id, similarity.toFixed(2), Math.random() > 0.5]
      );
    }
    console.log('✅ Seeded duplicate checks\n');

    // ============================================
    // 6. SEED DEATH RECORDS (5 records)
    // ============================================
    console.log('💀 Seeding death records...');
    for (let i = 0; i < 5 && i < voters.length; i++) {
      const deathDate = new Date();
      deathDate.setDate(deathDate.getDate() - Math.floor(Math.random() * 365));
      await connection.query(
        'INSERT INTO death_records (aadhaar_number, death_date, recorded_at) VALUES (?, ?, NOW())',
        [voters[i].aadhaar_number, deathDate.toISOString().split('T')[0]]
      );
    }
    console.log('✅ Seeded death records\n');

    // ============================================
    // 7. SEED AUDIT LOGS (100 logs)
    // ============================================
    console.log('📝 Seeding audit logs...');
    let previousAuditHash = null;
    const actions = ['voter_registered', 'voter_updated', 'vote_cast', 'election_created', 'candidate_added'];
    
    for (let i = 0; i < 100; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entityType = ['voter', 'election', 'vote', 'candidate'][Math.floor(Math.random() * 4)];
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30));
      
      const logData = {
        action_type: action,
        entity_type: entityType,
        timestamp: timestamp.toISOString()
      };
      const currentHash = generateHash(previousAuditHash, logData, timestamp.toISOString());
      
      await connection.query(
        'INSERT INTO audit_logs (action_type, entity_type, timestamp, previous_hash, current_hash, details) VALUES (?, ?, ?, ?, ?, ?)',
        [
          action,
          entityType,
          timestamp,
          previousAuditHash,
          currentHash,
          JSON.stringify({ message: `Sample audit log entry ${i + 1}` })
        ]
      );
      
      previousAuditHash = currentHash;
    }
    console.log('✅ Seeded 100 audit logs\n');

    // ============================================
    // 8. SEED GRIEVANCES (20 grievances)
    // ============================================
    console.log('📋 Seeding grievances...');
    const issueTypes = ['wrong_details', 'duplicate_entry', 'missing_name', 'deceased_not_removed', 'wrong_polling_station', 'other'];
    const statuses = ['open', 'in_progress', 'resolved', 'closed', 'reopened'];
    
    for (let i = 0; i < 20 && i < voters.length; i++) {
      const voter = voters[i];
      const issueType = issueTypes[Math.floor(Math.random() * issueTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)];
      // Generate ticket number like GRV-12345678-AB (max 20 chars)
      const timestamp = Date.now().toString().slice(-8);
      const random = crypto.randomBytes(2).toString('hex').toUpperCase();
      const ticketNumber = `GRV-${timestamp}-${random}`;
      const subject = `Grievance ${i + 1}: ${issueType.replace(/_/g, ' ')}`;
      const description = `Sample grievance ${i + 1}: ${issueType.replace(/_/g, ' ')} issue for voter ${voter.name}`;
      
      await connection.query(
        `INSERT INTO grievances (ticket_number, voter_id, aadhaar_number, issue_type, subject, description, status, priority, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          ticketNumber,
          voter.voter_id,
          voter.aadhaar_number,
          issueType,
          subject,
          description,
          status,
          priority
        ]
      );
    }
    console.log('✅ Seeded grievances\n');

    // ============================================
    // 9. SEED POLLING STATIONS (10 stations)
    // ============================================
    console.log('🏛️ Seeding polling stations...');
    for (let i = 0; i < 10; i++) {
      const state = states[Math.floor(Math.random() * states.length)];
      const district = districts[state][Math.floor(Math.random() * districts[state].length)];
      const stationCode = `PS${(i + 1).toString().padStart(4, '0')}`;
      const latitude = 20 + Math.random() * 10; // India latitude range
      const longitude = 70 + Math.random() * 20; // India longitude range
      
      await connection.query(
        `INSERT INTO polling_stations (station_code, station_name, address, district, state, pin_code, capacity, latitude, longitude) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stationCode,
          `Polling Station ${i + 1}`,
          `${Math.floor(Math.random() * 999) + 1} Main Street, ${district}`,
          district,
          state,
          `${Math.floor(100000 + Math.random() * 900000)}`,
          Math.floor(500 + Math.random() * 1000),
          latitude,
          longitude
        ]
      );
    }
    console.log('✅ Seeded polling stations\n');

    // ============================================
    // 10. SEED APPLICATIONS (30 applications)
    // ============================================
    console.log('📄 Seeding applications...');
    for (let i = 0; i < 30 && i < voters.length; i++) {
      const voter = voters[i];
      const statuses = ['submitted', 'under_review', 'field_verification', 'approved', 'rejected', 'epic_generated'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const applicationId = `APP${Date.now()}${i}`;
      
      await connection.query(
        `INSERT INTO application_tracking (voter_id, application_id, status, status_changed_at) 
         VALUES (?, ?, ?, NOW())`,
        [voter.voter_id, applicationId, status]
      );
      
      // Update voter with application_id if column exists
      try {
        await connection.query(
          'UPDATE voters SET application_id = ? WHERE voter_id = ?',
          [applicationId, voter.voter_id]
        );
      } catch (err) {
        // application_id column might not exist, skip
      }
    }
    console.log('✅ Seeded applications\n');

    // ============================================
    // 11. SEED REVISION BATCHES (5 batches)
    // ============================================
    console.log('🔄 Seeding revision batches...');
    try {
      for (let i = 0; i < 5; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (i * 7));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 14);
        
        const statuses = ['draft', 'in_progress', 'completed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const merkleRoot = crypto.randomBytes(32).toString('hex');
        
        await connection.query(
          `INSERT INTO revision_batches (region, start_date, end_date, status, merkle_root, created_at) 
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [states[Math.floor(Math.random() * states.length)], startDate, endDate, status, merkleRoot]
        );
      }
      console.log('✅ Seeded revision batches\n');
    } catch (err) {
      console.log('⏭️  Skipping revision batches (table might not exist)\n');
    }

    // ============================================
    // 12. SEED BLO TASKS (15 tasks)
    // ============================================
    console.log('📋 Seeding BLO tasks...');
    try {
      const taskTypes = ['field-verification', 'address-verification', 'document-verification', 'other'];
      const taskStatuses = ['pending', 'in-progress', 'completed', 'rejected'];
      
      for (let i = 0; i < 15 && i < voters.length; i++) {
        const voter = voters[i];
        const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
        const status = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30));
        const bloId = Math.floor(Math.random() * 10) + 1;
        
        await connection.query(
          `INSERT INTO blo_tasks (voter_id, task_type, blo_id, status, due_date, notes, assigned_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            voter.voter_id,
            taskType,
            bloId,
            status,
            dueDate,
            `Task ${i + 1}: ${taskType.replace(/-/g, ' ')} for ${voter.name}`
          ]
        );
      }
      console.log('✅ Seeded BLO tasks\n');
    } catch (err) {
      console.log('⏭️  Skipping BLO tasks (table might not exist)\n');
    }

    // ============================================
    // 13. SEED TRANSPARENCY MERKLE ROOTS (10 roots)
    // ============================================
    console.log('🔐 Seeding Merkle roots...');
    try {
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const merkleRoot = crypto.randomBytes(32).toString('hex');
        const signature = crypto.randomBytes(32).toString('hex');
        
        await connection.query(
          `INSERT INTO transparency_merkle_roots (date, merkle_root, total_records, signature, published_at) 
           VALUES (?, ?, ?, ?, NOW())`,
          [date.toISOString().split('T')[0], merkleRoot, Math.floor(10 + Math.random() * 90), signature]
        );
      }
      console.log('✅ Seeded Merkle roots\n');
    } catch (err) {
      console.log('⏭️  Skipping Merkle roots (table might not exist)\n');
    }

    // ============================================
    // 14. SEED COMMUNICATIONS (10 notices)
    // ============================================
    console.log('📢 Seeding communications...');
    try {
      const noticeTypes = ['election_notice', 'revision_announcement', 'polling_station_change', 'general_notice'];
      
      for (let i = 0; i < 10; i++) {
        const type = noticeTypes[Math.floor(Math.random() * noticeTypes.length)];
        const docHash = crypto.randomBytes(32).toString('hex');
        const signature = crypto.randomBytes(32).toString('hex');
        
        await connection.query(
          `INSERT INTO communications (notice_type, title, content_en, content_hi, doc_hash, signature, published_by, published_at, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [
            type,
            `Notice ${i + 1}: ${type.replace('_', ' ')}`,
            `English content for notice ${i + 1}`,
            `हिंदी सामग्री सूचना ${i + 1} के लिए`,
            docHash,
            signature,
            1,
            true
          ]
        );
      }
      console.log('✅ Seeded communications\n');
    } catch (err) {
      console.log('⏭️  Skipping communications (table might not exist)\n');
    }

    // ============================================
    // 15. SEED ADMIN USERS (5 admin users)
    // ============================================
    console.log('👨‍💼 Seeding admin users...');
    try {
      const adminRoles = ['admin', 'blo', 'ero', 'deo', 'ceo'];
      const adminNames = ['Admin User', 'BLO Officer', 'ERO Officer', 'DEO Officer', 'CEO Officer'];
      
      for (let i = 0; i < 5; i++) {
        const email = `admin${i + 1}@election.gov.in`;
        const password = crypto.createHash('sha256').update(`admin${i + 1}`).digest('hex');
        const role = adminRoles[i];
        
        await connection.query(
          `INSERT INTO users (username, email, password_hash, role, created_at) 
           VALUES (?, ?, ?, ?, NOW())`,
          [adminNames[i], email, password, role]
        );
      }
      console.log('✅ Seeded admin users\n');
    } catch (err) {
      console.log('⏭️  Skipping admin users (table might not exist)\n');
    }

    // ============================================
    // 16. SEED VOTE REFERENCES (for end-to-end verification)
    // ============================================
    console.log('🔗 Seeding vote references...');
    try {
      const [allVotes] = await connection.query('SELECT vote_id FROM votes LIMIT 20');
      
      for (const vote of allVotes) {
        const referenceCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const proofData = JSON.stringify({
          vote_id_hash: crypto.createHash('sha256').update(String(vote.vote_id)).digest('hex'),
          timestamp: new Date().toISOString()
        });
        
        await connection.query(
          `INSERT INTO vote_references (vote_id, reference_code, proof_data, created_at) 
           VALUES (?, ?, ?, NOW())`,
          [vote.vote_id, referenceCode, proofData]
        );
      }
      console.log('✅ Seeded vote references\n');
    } catch (err) {
      console.log('⏭️  Skipping vote references (table might not exist)\n');
    }

    await connection.commit();
    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - ${voters.length} voters`);
    console.log(`   - ${elections.length} elections`);
    console.log(`   - ${candidates.length} candidates`);
    console.log(`   - ${voteCount} votes`);
    console.log(`   - 10 duplicate checks`);
    console.log(`   - 5 death records`);
    console.log(`   - 100 audit logs`);
    console.log(`   - 20 grievances`);
    console.log(`   - 10 polling stations`);
    console.log(`   - 30 applications`);
    console.log(`   - 5 revision batches`);
    console.log(`   - 15 BLO tasks`);
    console.log(`   - 10 Merkle roots`);
    console.log(`   - 10 communications`);
    console.log(`   - 20 vote references`);
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run seeding
seedComprehensiveDatabase()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });

