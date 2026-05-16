import { ChatGroq } from '@langchain/groq';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing Groq API...');
    console.log('API Key exists:', !!process.env.GROQ_API_KEY);
    console.log('API Key length:', process.env.GROQ_API_KEY?.length || 0);

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: 'GROQ_API_KEY not found',
        hasKey: false
      });
    }

    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama3-8b-8192',
      temperature: 0.1,
      maxTokens: 50,
    });

    console.log('Making test API call...');
    const result = await llm.invoke('Say hello');
    console.log('API call successful:', !!result);

    return res.status(200).json({
      success: true,
      hasKey: true,
      keyLength: process.env.GROQ_API_KEY.length,
      response: result?.content || result,
      message: 'Groq API is working!'
    });

  } catch (error) {
    console.error('Groq test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name,
      hasKey: !!process.env.GROQ_API_KEY
    });
  }
}