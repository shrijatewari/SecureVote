const pool = require('../config/database');

/**
 * Seed Elections Data
 * Creates sample elections with various statuses
 */

async function seedElections() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🗳️  Starting to seed elections...\n');
    
    await connection.beginTransaction();
    
    const elections = [
      {
        title: '2024 Lok Sabha General Elections',
        start_date: '2024-04-19',
        end_date: '2024-06-01',
        status: 'completed',
        description: 'General elections for the 18th Lok Sabha'
      },
      {
        title: '2024 State Assembly Elections - Maharashtra',
        start_date: '2024-10-15',
        end_date: '2024-10-20',
        status: 'completed',
        description: 'Maharashtra State Legislative Assembly elections'
      },
      {
        title: '2025 Municipal Corporation Elections - Delhi',
        start_date: '2025-02-10',
        end_date: '2025-02-12',
        status: 'upcoming',
        description: 'Delhi Municipal Corporation elections'
      },
      {
        title: '2025 State Assembly Elections - West Bengal',
        start_date: '2025-03-15',
        end_date: '2025-03-20',
        status: 'upcoming',
        description: 'West Bengal State Legislative Assembly elections'
      },
      {
        title: '2025 Panchayat Elections - Karnataka',
        start_date: '2025-01-20',
        end_date: '2025-01-25',
        status: 'upcoming',
        description: 'Karnataka Panchayat Raj elections'
      },
      {
        title: '2024 By-Elections - Multiple Constituencies',
        start_date: '2024-11-10',
        end_date: '2024-11-12',
        status: 'completed',
        description: 'By-elections for vacant Lok Sabha and Assembly seats'
      },
      {
        title: '2025 Lok Sabha By-Election - Amethi',
        start_date: '2025-04-15',
        end_date: '2025-04-17',
        status: 'upcoming',
        description: 'By-election for Amethi Lok Sabha constituency'
      },
      {
        title: '2024 Rajya Sabha Elections',
        start_date: '2024-09-01',
        end_date: '2024-09-05',
        status: 'completed',
        description: 'Rajya Sabha (Upper House) elections'
      },
      {
        title: '2025 State Assembly Elections - Tamil Nadu',
        start_date: '2025-05-10',
        end_date: '2025-05-15',
        status: 'upcoming',
        description: 'Tamil Nadu State Legislative Assembly elections'
      },
      {
        title: '2025 Zilla Parishad Elections - Gujarat',
        start_date: '2025-06-01',
        end_date: '2025-06-05',
        status: 'upcoming',
        description: 'Gujarat Zilla Parishad elections'
      }
    ];
    
    let count = 0;
    for (const election of elections) {
      try {
        // Check if election already exists
        const [existing] = await connection.query(
          'SELECT election_id FROM elections WHERE title = ?',
          [election.title]
        );
        
        if (existing.length === 0) {
          await connection.query(
            `INSERT INTO elections (title, start_date, end_date, status) 
             VALUES (?, ?, ?, ?)`,
            [
              election.title,
              election.start_date,
              election.end_date,
              election.status
            ]
          );
          count++;
          console.log(`   ✓ Created: ${election.title} (${election.status})`);
        } else {
          console.log(`   ⏭️  Skipped: ${election.title} (already exists)`);
        }
      } catch (err) {
        console.error(`   ✗ Error seeding election "${election.title}":`, err.message);
      }
    }
    
    await connection.commit();
    console.log(`\n✅ Successfully seeded ${count} elections!\n`);
    
    // Print summary
    const [summary] = await connection.query(
      `SELECT status, COUNT(*) as count 
       FROM elections 
       GROUP BY status 
       ORDER BY status`
    );
    
    console.log('📊 Elections by Status:');
    summary.forEach(row => {
      console.log(`   ${row.status}: ${row.count} elections`);
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error seeding elections:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedElections()
    .then(() => {
      console.log('✅ Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedElections };

