// Direct Groq API calls without LangChain - ZERO DEPENDENCIES
export async function callGroqDirectly(question) {
  console.log('=== DIRECT GROQ API CALL ===');
  console.log('Question:', question);

  const apiKey = process.env.GROQ_API_KEY;
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('API Key starts with:', apiKey ? apiKey.substring(0, 8) + '...' : 'N/A');

  if (!apiKey) {
    console.error('GROQ_API_KEY not found in environment');
    return {
      success: false,
      error: 'API key not configured',
      answer: 'Configuration error: API key missing'
    };
  }

  try {
    console.log('Making direct fetch to Groq API...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specializing in FTC (FIRST Tech Challenge) robotics. Provide clear, accurate answers about FTC rules, robot design, programming, and competition strategies.'
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.1,
        max_tokens: 800,
        stream: false
      })
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error response:', errorText);

      return {
        success: false,
        error: `Groq API error: ${response.status}`,
        details: errorText,
        answer: `API Error ${response.status}: Unable to connect to AI service. Please try again.`
      };
    }

    const data = await response.json();
    console.log('Success! Groq response:', data);

    const answer = data?.choices?.[0]?.message?.content || 'No response content received';
    console.log('Extracted answer:', answer);

    return {
      success: true,
      answer: answer,
      confidence: 0.9,
      sources: ['Groq Direct API'],
      debug: {
        model: data?.model,
        usage: data?.usage,
        responseId: data?.id
      }
    };

  } catch (error) {
    console.error('Direct Groq API call failed:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Ultimate fallback - provide intelligent response even if API fails
    const fallbackResponse = getFallbackResponse(question);

    return {
      success: false,
      error: error.message,
      errorType: error.name,
      answer: fallbackResponse,
      usingFallback: true
    };
  }
}

// Intelligent fallback responses when API is completely down
function getFallbackResponse(question) {
  const lowerQ = question.toLowerCase();

  // Greetings
  if (lowerQ.includes('hello') || lowerQ.includes('hi') || lowerQ.includes('hey')) {
    return "Hello! I'm your FTC AI assistant. I'm currently experiencing connectivity issues, but I can still help with basic FTC questions. Try asking about FTC rules, robot specifications, or competition format.";
  }

  // Common FTC questions
  if (lowerQ.includes('ftc') || lowerQ.includes('first tech challenge')) {
    return "FTC (FIRST Tech Challenge) is a robotics competition for students grades 7-12. Teams design, build, and program robots to complete tasks in annual games. The current season is INTO THE DEEP (2024-2025). For detailed information, visit firstinspires.org/ftc.";
  }

  if (lowerQ.includes('robot') && (lowerQ.includes('size') || lowerQ.includes('specification') || lowerQ.includes('dimension'))) {
    return "FTC robots must fit within 18\" x 18\" x 18\" (45.7cm cube) at the start of the match and weigh no more than 42 lbs (19 kg). They can expand during the match. All parts must be from approved vendors listed in the game manual.";
  }

  if (lowerQ.includes('programming') || lowerQ.includes('code') || lowerQ.includes('java')) {
    return "FTC robots can be programmed using Java (Android Studio), Blocks (visual programming), or OnBot Java (browser-based). The FTC SDK provides hardware control and sensor integration. Popular control systems include REV Control Hub and REV Expansion Hub.";
  }

  if (lowerQ.includes('game') || lowerQ.includes('season') || lowerQ.includes('into the deep')) {
    return "The current FTC season is INTO THE DEEP (2024-2025). Teams score samples into baskets and hang specimens on chamber rungs. Matches have a 30-second autonomous period followed by 2 minutes of driver-controlled play, ending with a 30-second endgame period.";
  }

  // Generic response
  return "I'm currently experiencing connectivity issues with my AI service. For comprehensive FTC information, please visit firstinspires.org or try asking a more specific question about FTC rules, robot design, or competition format.";
}