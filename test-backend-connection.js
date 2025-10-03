#!/usr/bin/env node

// Test script to verify backend connection
const axios = require('axios');

const BACKEND_URL = 'http://localhost:8000';

async function testBackendConnection() {
  console.log('🔍 Testing backend connection...');
  
  try {
    // Test basic connection
    console.log(`Testing connection to: ${BACKEND_URL}`);
    const response = await axios.get(`${BACKEND_URL}/api/health/`, {
      timeout: 5000
    });
    
    console.log('✅ Backend is running and accessible!');
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    console.log('❌ Backend connection failed!');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Backend is not running. Start it with:');
      console.log('   cd elif-shared-backend/backend');
      console.log('   python manage.py runserver 0.0.0.0:8000');
    } else if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('\n🔍 Testing API endpoints...');
  
  const endpoints = [
    '/api/health/',
    '/api/auth/login/',
    '/api/products/',
    '/api/sales/'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
        timeout: 3000
      });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️  ${endpoint} - Status: ${error.response.status} (${error.response.statusText})`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
  }
}

// Main test function
async function main() {
  console.log('🚀 ELIF Backend Connection Test\n');
  
  await testBackendConnection();
  await testAPIEndpoints();
  
  console.log('\n📋 Next steps:');
  console.log('1. If backend is not running, start it first');
  console.log('2. Then run the frontend apps:');
  console.log('   ./run-local-dev.sh');
  console.log('3. Or use Docker:');
  console.log('   ./run-local.sh');
}

main().catch(console.error);
