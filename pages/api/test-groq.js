import { callGroqDirectly } from '../../lib/groq-direct.js';

export default async function handler(req, res) {
  console.log('=== COMPREHENSIVE GROQ TEST ===');

  try {
    console.log('Environment check...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('API Key exists:', !!process.env.GROQ_API_KEY);
    console.log('API Key length:', process.env.GROQ_API_KEY?.length || 0);
    console.log('Request method:', req.method);
    console.log('Timestamp:', new Date().toISOString());

    // Test 1: Environment variables
    const envTest = {
      hasGroqKey: !!process.env.GROQ_API_KEY,
      keyLength: process.env.GROQ_API_KEY?.length || 0,
      keyFormat: process.env.GROQ_API_KEY ?
        (process.env.GROQ_API_KEY.startsWith('gsk_') ? 'Valid format' : 'Invalid format') :
        'Missing',
      nodeEnv: process.env.NODE_ENV
    };

    console.log('Environment test results:', envTest);

    if (!process.env.GROQ_API_KEY) {
      return res.status(200).json({
        success: false,
        error: 'GROQ_API_KEY not found in environment',
        tests: {
          environment: envTest,
          api: 'Skipped - no API key'
        }
      });
    }

    // Test 2: Direct API call
    console.log('Testing direct API call...');
    const apiResult = await callGroqDirectly('Say "Hello World" in exactly 2 words.');
    console.log('Direct API test result:', apiResult);

    return res.status(200).json({
      success: apiResult.success,
      message: apiResult.success ? 'All tests passed!' : 'API test failed',
      tests: {
        environment: envTest,
        api: apiResult
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(200).json({
      success: false,
      error: error.message,
      errorType: error.name,
      stack: error.stack,
      tests: {
        environment: 'Failed during environment check',
        api: 'Not reached due to error'
      },
      timestamp: new Date().toISOString()
    });
  }
}