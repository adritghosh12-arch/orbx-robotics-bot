// RAG Chain setup with LangChain + Groq
import { ChatGroq } from '@langchain/groq';
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableLambda } from '@langchain/core/runnables';
import { createSystemPrompt, validateResponse } from './guardrails.js';

let ragChain = null;
let vectorStore = null;

// Initialize Groq LLM
const initGroq = () => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY not set in environment variables');
  }

  return new ChatGroq({
    apiKey: groqApiKey,
    modelName: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
    temperature: 0.3, // Lower temp = more consistent, less random
    maxTokens: 500,
  });
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
      content: `BIOBUZZ Season (2025-2026): The current FTC challenge released September 12, 2025. Teams must complete tasks related to biological science themes. Check community.firstinspires.org for detailed game rules and field specifications.`,
      category: 'game',
      metadata: { source: 'FTC Official' }
    },
    {
      id: '3',
      content: `Robot Specifications: FTC robots must fit within 18" x 18" x 18" at the start of the match and weigh no more than 42 lbs. Robots can expand beyond these dimensions during the match. Motors, servos, and sensors must be from approved vendors.`,
      category: 'rules',
      metadata: { source: 'FTC Game Manual' }
    },
    {
      id: '4',
      content: `Team Eligibility: Teams must register through FIRST and include at least one adult mentor. Students ages 12-18 in any school or organization can participate. Team size is flexible but typically 10-15 people.`,
      category: 'registration',
      metadata: { source: 'FTC Registration' }
    },
    {
      id: '5',
      content: `Getting Started: Visit firstinspires.org/programs/ftc/get-started to find teams in your area or register a new team. Resources include Skill Builders training modules, game manuals, and vendor lists.`,
      category: 'getting-started',
      metadata: { source: 'FTC Official' }
    },
    {
      id: '6',
      content: `Scouting: Scouting involves collecting data on competing teams' robots and strategies. This helps alliances make strategic decisions during tournaments. Scouting sheets typically track autonomous performance, mechanism capabilities, and consistency.`,
      category: 'scouting',
      metadata: { source: 'FTC Community' }
    },
    {
      id: '7',
      content: `Programming: FTC robots are programmed using Android Studio with the FTC SDK or blocks-based programming through TeleOp programming. Autonomous routines use odometry and sensors for field navigation. Teams often use TensorFlow for computer vision.`,
      category: 'programming',
      metadata: { source: 'FTC Technical' }
    },
    {
      id: '8',
      content: `Match Format: Matches typically consist of a 30-second autonomous period where robots operate without driver input, followed by a 2-minute driver-controlled period. Points are scored by completing objectives specified in the game rules.`,
      category: 'competition',
      metadata: { source: 'FTC Game Manual' }
    }
  ];
};

// Simple retrieval (for MVP; use vector DB for production)
const retrieveKnowledge = (query, topK = 3) => {
  const ftcKnowledge = initFTCKnowledge();
  const queryLower = query.toLowerCase();
  
  // Score documents by keyword relevance
  const scored = ftcKnowledge.map((doc) => {
    const contentLower = doc.content.toLowerCase();
    const exactMatches = query.split(' ').filter(word => 
      word.length > 3 && contentLower.includes(word.toLowerCase())
    ).length;
    
    return { ...doc, score: exactMatches };
  });
  
  return scored
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
    const promptTemplate = ChatPromptTemplate.fromTemplate(`You are an expert FTC (FIRST Tech Challenge) assistant.

Important: Answer ONLY questions related to FTC. Base your answers on the provided documentation.

If asked about non-FTC topics, respond: "I'm specifically designed to help with FTC questions. Could you ask me about FTC rules, game strategy, team eligibility, or robot design?"

Context from FTC Documentation:
{context}

Question: {question}

Answer:`);
    
    // Chain: question -> retrieve docs -> format -> prompt -> LLM
    const chain = (input) => {
      const docs = retrieveKnowledge(input, 3);
      const context = formatDocs(docs);
      return promptTemplate.format({ context, question: input });
    };
    
    ragChain = {
      invoke: async (question) => {
        try {
          // Guardrail 1: Check if question is FTC-related
          const { isFTCQuestion } = await import('./guardrails.js');
          if (!isFTCQuestion(question)) {
            return {
              answer: "I'm specifically designed to help with FTC questions. Could you ask me about FTC rules, game strategy, robot design, or team information?",
              confidence: 1.0,
              sources: []
            };
          }
          
          // Prepare prompt
          const promptText = await chain(question);
          
          // Call LLM
          const result = await llm.invoke(promptText);
          const answer = result.content || '';
          
          // Guardrail 2: Validate response
          const docs = retrieveKnowledge(question, 3);
          const validation = validateResponse(question, answer, 0.8);
          
          return {
            answer: validation.message,
            confidence: validation.confidence,
            sources: docs.map(d => d.metadata?.source || 'Unknown')
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
