/**
 * Seed Address Cluster Flags
 * Creates test address cluster flags for the Address Flags dashboard
 */

const pool = require('../config/database');
const crypto = require('crypto');

async function seedAddressFlags() {
  const connection = await pool.getConnection();
  try {
    console.log('🔍 Seeding address cluster flags...\n');

    // Get some voters to create realistic address clusters
    const [voters] = await connection.query(
      `SELECT voter_id, address_hash, district, state, house_number, street, village_city, pin_code
       FROM voters 
       WHERE address_hash IS NOT NULL 
       LIMIT 100`
    );

    if (voters.length < 5) {
      console.log('⚠️  Need at least 5 voters with addresses. Please seed voters first.');
      return;
    }

    console.log(`Found ${voters.length} voters with addresses. Creating address clusters...\n`);

    // Group voters by address_hash to find clusters
    const addressGroups = {};
    voters.forEach(voter => {
      if (!addressGroups[voter.address_hash]) {
        addressGroups[voter.address_hash] = [];
      }
      addressGroups[voter.address_hash].push(voter);
    });

    // Find addresses with multiple voters (clusters)
    const clusters = Object.entries(addressGroups)
      .filter(([hash, voters]) => voters.length >= 3)
      .slice(0, 15); // Create up to 15 clusters

    let created = 0;

    for (const [addressHash, clusterVoters] of clusters) {
      const voterCount = clusterVoters.length;
      const firstVoter = clusterVoters[0];
      
      // Calculate risk score based on voter count
      let riskScore = Math.min(voterCount / 30, 1.0);
      let riskLevel = 'low';
      let isSuspicious = false;

      if (voterCount >= 20) {
        riskLevel = 'critical';
        isSuspicious = true;
        riskScore = 0.9;
      } else if (voterCount >= 15) {
        riskLevel = 'high';
        isSuspicious = true;
        riskScore = 0.75;
      } else if (voterCount >= 10) {
        riskLevel = 'medium';
        isSuspicious = true;
        riskScore = 0.6;
      } else if (voterCount >= 6) {
        riskLevel = 'medium';
        riskScore = 0.4;
      }

      // Create normalized address JSON
      const normalizedAddress = JSON.stringify({
        full: `${firstVoter.house_number || ''} ${firstVoter.street || ''}, ${firstVoter.village_city || ''}, ${firstVoter.district || ''}, ${firstVoter.state || ''} - ${firstVoter.pin_code || ''}`.trim(),
        district: firstVoter.district || null,
        state: firstVoter.state || null,
        house_number: firstVoter.house_number || null,
        street: firstVoter.street || null,
        village_city: firstVoter.village_city || null,
        pin_code: firstVoter.pin_code || null
      });

      // Use address_hash as cluster_id (truncate if needed)
      const clusterId = addressHash.substring(0, 64);

      try {
        await connection.query(
          `INSERT INTO address_cluster_flags 
           (cluster_id, address_hash, normalized_address, voter_count, risk_score, is_suspicious)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             voter_count = VALUES(voter_count),
             risk_score = VALUES(risk_score),
             is_suspicious = VALUES(is_suspicious),
             normalized_address = VALUES(normalized_address)`,
          [
            clusterId,
            addressHash,
            normalizedAddress,
            voterCount,
            riskScore,
            isSuspicious ? 1 : 0
          ]
        );
        created++;
        console.log(`✅ Created flag: ${voterCount} voters at ${firstVoter.district || 'Unknown'} (${riskLevel})`);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.warn(`⚠️  Error creating flag: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Created ${created} address cluster flags`);

    // Show summary
    const [summary] = await connection.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_suspicious = 1 THEN 1 ELSE 0 END) as suspicious,
        SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) as reviewed
       FROM address_cluster_flags`
    );

    console.log('\n📊 Address Flags Summary:');
    console.log(`   Total Flags: ${summary[0].total}`);
    console.log(`   Suspicious: ${summary[0].suspicious}`);
    console.log(`   Reviewed: ${summary[0].reviewed}`);

  } catch (error) {
    console.error('❌ Error seeding address flags:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedAddressFlags()
    .then(() => {
      console.log('\n🎉 Address flags seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAddressFlags;

