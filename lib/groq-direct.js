// List of Groq models to try in order of preference
const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma-7b-it'
];

// Direct Groq API calls without LangChain - ZERO DEPENDENCIES
export async function callGroqDirectly(question, modelIndex = 0) {
  console.log('=== DIRECT GROQ API CALL ===');
  console.log('Question:', question);
  console.log('Model attempt:', modelIndex + 1, 'of', GROQ_MODELS.length);

  const apiKey = process.env.GROQ_API_KEY;
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('API Key starts with:', apiKey ? apiKey.substring(0, 8) + '...' : 'N/A');

  if (!apiKey) {
    console.error('GROQ_API_KEY not found in environment');
    return {
      success: false,
      error: 'API key not configured',
      answer: getFallbackResponse(question)
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
        model: GROQ_MODELS[modelIndex],
        messages: [
          {
            "role": "system",
            "content": `You are an expert FTC (FIRST Tech Challenge) mentor and coach. Provide well-structured, organized responses that are easy to read and understand.

FORMATTING GUIDELINES:
- Use clear headings and bullet points when appropriate
- Structure complex answers with numbered steps
- Include specific examples and practical advice
- Keep paragraphs concise (2-3 sentences max)
- Use technical terms but explain them clearly
- End with actionable next steps when relevant

CONTENT FOCUS:
- FTC rules and game mechanics (current: INTO THE DEEP 2024-2025)
- Robot design principles and best practices
- Programming concepts (Java, Blocks, OnBot Java)
- Competition strategies and team management
- Hardware specifications and vendor requirements
- Awards criteria and judging process

Always provide accurate, helpful information that helps FTC teams succeed.`
          },
          {
            "role": "user",
            "content": `Please provide a well-organized answer to this FTC question: ${question}`
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
      console.error('=== GROQ API ERROR DETAILS ===');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      console.error('Error body:', errorText);
      console.error('Request model:', 'llama-3.1-8b-instant');
      console.error('API Key format:', apiKey ? `${apiKey.substring(0,8)}...` : 'Missing');

      // Try to parse error as JSON for better details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorJson.message || errorText;
        console.error('Parsed error:', errorDetails);
      } catch (e) {
        console.error('Could not parse error as JSON');
      }

      // If this model failed and we have more to try, recursively try next model
      if (response.status === 400 && modelIndex < GROQ_MODELS.length - 1) {
        console.log(`Model ${GROQ_MODELS[modelIndex]} failed, trying next model...`);
        return await callGroqDirectly(question, modelIndex + 1);
      }

      return {
        success: false,
        error: `Groq API error: ${response.status}`,
        details: errorDetails,
        answer: getFallbackResponse(question),
        modelTried: GROQ_MODELS[modelIndex]
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
        modelUsed: GROQ_MODELS[modelIndex],
        modelAttempt: modelIndex + 1,
        groqModel: data?.model,
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
    return `# Welcome to FTC AI Assistant! 🤖

Hello! I'm here to help you with FIRST Tech Challenge questions.

## What I Can Help With:
• **Game Rules** - Current season (INTO THE DEEP) and past games
• **Robot Design** - Specifications, mechanisms, and best practices
• **Programming** - Java, Blocks, and OnBot Java guidance
• **Competition Strategy** - Scoring, alliances, and tournament prep
• **Team Management** - Awards, outreach, and engineering notebooks

*Currently running in offline mode. Ask me anything about FTC!*`;
  }

  // Common FTC questions with organized structure
  if (lowerQ.includes('ftc') || lowerQ.includes('first tech challenge')) {
    return `# FTC Overview 🏆

## What is FIRST Tech Challenge?
FIRST Tech Challenge (FTC) is a robotics competition for students in grades 7-12 (ages 12-18).

## Key Components:
• **Design & Build** - Teams create robots to complete game-specific tasks
• **Programming** - Autonomous and driver-controlled periods
• **Competition** - Regional, state, and world championship levels
• **Awards** - Engineering design, outreach, and robot performance

## Current Season:
**INTO THE DEEP (2024-2025)** - Teams score samples and specimens while navigating underwater-themed challenges.

## Getting Started:
Visit [firstinspires.org/ftc](https://firstinspires.org/ftc) for team registration and resources.`;
  }

  if (lowerQ.includes('robot') && (lowerQ.includes('size') || lowerQ.includes('specification') || lowerQ.includes('dimension'))) {
    return `# FTC Robot Specifications 📐

## Size Requirements:
• **Starting Configuration:** 18" × 18" × 18" maximum (45.7cm cube)
• **Weight Limit:** 42 lbs (19 kg) maximum
• **Expansion:** Can extend beyond starting size during matches

## Hardware Requirements:
• **Controllers:** REV Control Hub or REV Expansion Hub
• **Motors:** Must be from approved vendor list (REV, TETRIX, etc.)
• **Sensors:** Touch, color, distance, IMU from approved suppliers
• **Materials:** COTS (Commercial Off-The-Shelf) parts encouraged

## Key Rules:
• All components must be from approved vendors
• No custom machining of structural elements
• Safety regulations apply to all mechanisms`;
  }

  if (lowerQ.includes('programming') || lowerQ.includes('code') || lowerQ.includes('java')) {
    return `# FTC Programming Guide 💻

## Programming Options:
1. **Java (Android Studio)** - Full-featured, professional IDE
2. **Blocks** - Visual drag-and-drop programming
3. **OnBot Java** - Browser-based Java coding

## Core Concepts:
• **OpModes** - Autonomous and TeleOp programs
• **Hardware Mapping** - Configure motors, servos, and sensors
• **Control Flow** - Loops, conditionals, and timing
• **Sensor Integration** - IMU, encoders, vision processing

## Popular Libraries:
• **FTC SDK** - Official software development kit
• **RoadRunner** - Advanced motion planning
• **EasyOpenCV** - Computer vision processing

## Getting Started:
Download the FTC SDK from [GitHub](https://github.com/FIRST-Tech-Challenge/FtcRobotController)`;
  }

  if (lowerQ.includes('game') || lowerQ.includes('season') || lowerQ.includes('into the deep')) {
    return `# INTO THE DEEP Season (2024-2025) 🌊

## Game Overview:
Teams navigate underwater-themed challenges with alliance partners.

## Scoring Elements:
• **Samples** - Score into low and high baskets
• **Specimens** - Hang on chamber rungs for points
• **Parking/Hanging** - End-game positioning bonuses

## Match Structure:
1. **Autonomous (30 seconds)** - Robot operates independently
2. **Driver-Controlled (2 minutes)** - Human operators control robots
3. **End Game (final 30 seconds)** - Special scoring opportunities

## Key Strategies:
• Efficient sample/specimen cycling
• Reliable autonomous routines
• Strong alliance partnerships
• Consistent end-game execution

Visit [ftc-events.firstinspires.org](https://ftc-events.firstinspires.org) for detailed game manual.`;
  }

  // Generic organized response
  return `# FTC AI Assistant - Offline Mode 🔧

I'm currently experiencing connectivity issues but can still help with FTC questions!

## Popular Topics:
• **Current Game** - INTO THE DEEP season rules and strategy
• **Robot Building** - Specifications, mechanisms, and design tips
• **Programming** - Java, Blocks, and autonomous development
• **Competition** - Tournament format, awards, and team management

## Quick Resources:
• **Official Site:** [firstinspires.org/ftc](https://firstinspires.org/ftc)
• **Game Manual:** [ftc-events.firstinspires.org](https://ftc-events.firstinspires.org)
• **Community:** FTC Discord and Chief Delphi forums

*Ask me a specific question about any FTC topic!*`;
}