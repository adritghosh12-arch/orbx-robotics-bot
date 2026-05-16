// RAG Chain setup with LangChain + Groq
import { ChatGroq } from '@langchain/groq';
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableLambda } from '@langchain/core/runnables';
import { createSystemPrompt, validateResponse, isFTCQuestion, isGreeting } from './guardrails.js';

let ragChain = null;
let vectorStore = null;

// Initialize Groq LLM
const initGroq = () => {
  const groqApiKey = process.env.GROQ_API_KEY;
  console.log('Groq API Key check:', groqApiKey ? 'Present' : 'Missing');
  console.log('Groq API Key length:', groqApiKey ? groqApiKey.length : 0);

  if (!groqApiKey) {
    console.warn('GROQ_API_KEY not set - using fallback configuration');
    // Return a mock LLM for build time
    return {
      invoke: async () => ({
        content: "I'm temporarily unavailable. Please check back later or visit firstinspires.org for FTC information."
      })
    };
  }

  console.log('Attempting to use Groq model: llama3-8b-8192');

  try {
    return new ChatGroq({
      apiKey: groqApiKey,
      modelName: 'llama3-8b-8192', // Revert to modelName for compatibility
      temperature: 0.1, // Lower temperature for more consistent responses
      maxTokens: 800,   // Increase for fuller responses
    });
  } catch (error) {
    console.error('Failed to initialize Groq with llama3-8b-8192, trying gemma2-9b-it');
    return new ChatGroq({
      apiKey: groqApiKey,
      modelName: 'gemma2-9b-it', // Fallback model
      temperature: 0.1,
      maxTokens: 800,
    });
  }
};

// Format retrieved documents for context
const formatDocs = (docs) => {
  return docs
    .map((doc) => `Source: ${doc.metadata?.source || 'Unknown'}\n${doc.pageContent}`)
    .join('\n\n---\n\n');
};

// Initialize FTC knowledge base entries (in-memory for MVP; can be extended to vector DB)
const initFTCKnowledge = () => {
  return [
    {
      id: '1',
      content: `FTC Overview: FIRST Tech Challenge is a robotics competition for students in grades 7-12 (ages 12-18). Teams design, build, and operate robots to complete tasks specified in the annual game challenge. The competition includes regional, state, and national levels.`,
      category: 'basics',
      metadata: { source: 'FTC Official' }
    },
    {
      id: '2',
      content: `INTO THE DEEP Season (2024-2025): The current FTC challenge where teams score samples into baskets and specimen on chamber rungs. Robots start in submersible zones and can hang from high rungs during endgame. Visit ftc-events.firstinspires.org for official resources.`,
      category: 'game',
      metadata: { source: 'FTC Official' }
    },
    {
      id: '3',
      content: `Robot Specifications: FTC robots must fit within 18" x 18" x 18" (45.7cm cube) at the start of the match and weigh no more than 42 lbs (19 kg). Robots can expand beyond these dimensions during the match. Motors, servos, and sensors must be from approved vendors listed in the game manual.`,
      category: 'rules',
      metadata: { source: 'FTC Game Manual' }
    },
    {
      id: '4',
      content: `Team Eligibility: Teams must register through FIRST and include at least one adult mentor (21+). Students ages 12-18 in grades 7-12 can participate. Team size is flexible but typically 10-15 people. Registration opens in June each year.`,
      category: 'registration',
      metadata: { source: 'FTC Registration' }
    },
    {
      id: '5',
      content: `Getting Started: Visit firstinspires.org/ftc to find teams in your area or register a new team. Resources include FTC Skill Builders training modules, game manuals, robot building guides, and approved vendor lists. Team registration fee is typically $275.`,
      category: 'getting-started',
      metadata: { source: 'FTC Official' }
    },
    {
      id: '6',
      content: `Scouting: Scouting involves collecting data on competing teams' robots and strategies during matches. This helps alliance captains make informed decisions during alliance selection. Common metrics include autonomous scoring, cycle times, defense capabilities, and endgame performance.`,
      category: 'scouting',
      metadata: { source: 'FTC Community' }
    },
    {
      id: '7',
      content: `Programming Languages: FTC robots can be programmed using Java (Android Studio), Blocks (visual programming), or OnBot Java (browser-based). The FTC SDK provides hardware control, sensor integration, and autonomous navigation tools. TensorFlow Lite enables computer vision for object detection.`,
      category: 'programming',
      metadata: { source: 'FTC Technical' }
    },
    {
      id: '8',
      content: `Match Format: Matches are 2 minutes 30 seconds total: 30-second autonomous period (robots operate independently) followed by 2-minute driver-controlled period. Final 30 seconds is called "endgame" with special scoring opportunities like hanging or parking.`,
      category: 'competition',
      metadata: { source: 'FTC Game Manual' }
    },
    {
      id: '9',
      content: `Awards: FTC teams compete for various awards including Inspire Award (top overall team), Think Award (engineering design), Connect Award (outreach), and Control Award (programming). Awards are based on engineering notebooks, presentations, and robot performance.`,
      category: 'awards',
      metadata: { source: 'FTC Official' }
    },
    {
      id: '10',
      content: `Hardware: Legal FTC hardware includes REV Robotics, goBILDA, TETRIX, and approved COTS (Commercial Off-The-Shelf) parts. Motors include REV HD Hex Motors, Core Hex Motors, and servo motors. Sensors include IMU, distance, color, and touch sensors.`,
      category: 'hardware',
      metadata: { source: 'FTC Game Manual' }
    },
    {
      id: '11',
      content: `Competition Structure: Teams advance from League Meets or Qualifying Tournaments to Regional/State Championships, then to Super-Regionals (in some areas), and finally to FIRST World Championship held in Houston, TX each April.`,
      category: 'competition',
      metadata: { source: 'FTC Official' }
    },
    {
      id: '12',
      content: `Engineering Notebook: Teams must maintain an engineering notebook documenting their design process, meeting notes, testing results, and strategy development. This is crucial for judged awards and demonstrates the team's engineering methodology.`,
      category: 'documentation',
      metadata: { source: 'FTC Official' }
    }
  ];
};

// Enhanced retrieval with better scoring
const retrieveKnowledge = (query, topK = 3) => {
  const ftcKnowledge = initFTCKnowledge();
  const queryLower = query.toLowerCase();
  const queryWords = query.split(' ').filter(word => word.length > 2);

  // Score documents by multiple factors
  const scored = ftcKnowledge.map((doc) => {
    const contentLower = doc.content.toLowerCase();

    // Exact word matches
    const exactMatches = queryWords.filter(word =>
      contentLower.includes(word.toLowerCase())
    ).length;

    // Category relevance
    const categoryBonus = doc.category === 'basics' ? 0.5 : 0;

    // Length penalty for very short queries
    const lengthBonus = query.length > 10 ? 0.2 : 0;

    const totalScore = exactMatches + categoryBonus + lengthBonus;

    return { ...doc, score: totalScore };
  });

  // If no good matches, return all documents for general context
  const bestScore = Math.max(...scored.map(s => s.score));
  const threshold = bestScore > 0 ? 0.5 : 0;

  return scored
    .filter(doc => doc.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ content, metadata }) => ({ pageContent: content, metadata }));
};

// Initialize RAG chain
export const initializeRagChain = async () => {
  try {
    const llm = initGroq();
    
    // Retrieval function wrapped as Runnable
    const retriever = new RunnableLambda({
      func: async (input) => {
        const docs = retrieveKnowledge(input, 3);
        return docs;
      }
    });
    
    // System prompt template
    const promptTemplate = ChatPromptTemplate.fromTemplate(`You are an expert FTC (FIRST Tech Challenge) assistant and mentor with deep knowledge of robotics competition.

Your expertise includes:
- Current and past FTC game rules and strategies
- Robot design and engineering principles
- Programming (Java, Blocks, OnBot Java)
- Team management and competition preparation
- Awards criteria and judging process
- Hardware specifications and vendor information

Guidelines:
- Provide detailed, practical answers based on official FTC documentation
- Include specific examples and actionable advice when possible
- Reference current season (INTO THE DEEP 2024-2025) when relevant
- Encourage good engineering practices and documentation
- Be enthusiastic and supportive of FTC teams

Context from FTC Documentation:
{context}

Question: {question}

Provide a helpful, detailed answer as an FTC mentor would:`);
    
    // Chain: question -> retrieve docs -> format -> prompt -> LLM
    const chain = (input) => {
      const docs = retrieveKnowledge(input, 3);
      const context = formatDocs(docs);
      return promptTemplate.format({ context, question: input });
    };
    
    ragChain = {
      invoke: async (question) => {
        try {
          console.log('=== NO GUARDRAILS - DIRECT API TEST ===');
          console.log('Question received:', question);

          // REMOVE ALL GUARDRAILS - Direct API call
          const messages = [
            {
              role: "system",
              content: "You are a helpful AI assistant. Answer any question clearly and concisely."
            },
            {
              role: "user",
              content: question
            }
          ];

          console.log('Making direct LLM call...');
          const result = await llm.invoke(messages);
          console.log('Raw LLM result:', result);
          console.log('Result type:', typeof result);
          console.log('Result content:', result?.content);

          const answer = result?.content || result?.message || result || 'No response from LLM';

          console.log('Final answer:', answer);

          // RETURN DIRECT RESPONSE - NO VALIDATION
          return {
            answer: answer,
            confidence: 1.0,
            sources: ['Direct API - No Guardrails'],
            debug: {
              hasResult: !!result,
              resultType: typeof result,
              contentLength: answer.length
            }
          };
        } catch (error) {
          console.error('RAG Chain Error:', error);
          return {
            answer: "I encountered an error processing your question. Please try again or visit firstinspires.org for more information.",
            confidence: 0,
            sources: []
          };
        }
      }
    };
    
    return ragChain;
  } catch (error) {
    console.error('Failed to initialize RAG chain:', error);
    throw error;
  }
};

// Get or initialize RAG chain
export const getRagChain = async () => {
  if (!ragChain) {
    ragChain = await initializeRagChain();
  }
  return ragChain;
};

// Add document to knowledge base (for admin)
export const addDocument = async (content, category, source) => {
  // In production, add to vector DB
  console.log(`Document added: ${source} (${category})`);
};
