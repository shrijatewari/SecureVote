/**
 * Quick test script to verify voters API works
 * Run: node test_voters_api.js
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './backend/.env' });

async function testVotersAPI() {
  try {
    // Generate a test token for superadmin
    const token = jwt.sign(
      {
        id: 1,
        user_id: 1,
        email: 'superadmin@election.gov.in',
        role: 'superadmin',
        permissions: []
      },
      process.env.JWT_SECRET || 'default_secret'
    );

    console.log('🔍 Testing voters API...\n');
    console.log('Token:', token.substring(0, 50) + '...\n');

    const response = await axios.get('http://localhost:3000/api/voters?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.voters) {
      console.log(`\n✅ Found ${response.data.voters.length} voters`);
    } else if (response.data.data?.voters) {
      console.log(`\n✅ Found ${response.data.data.voters.length} voters`);
    } else {
      console.log('\n⚠️  Unexpected response format');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testVotersAPI();

