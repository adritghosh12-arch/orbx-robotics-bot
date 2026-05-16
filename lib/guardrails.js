// FTC-related keywords for guardrail validation
const FTC_KEYWORDS = [
  'ftc', 'first tech challenge', 'first robotics', 'robot', 'game',
  'rules', 'team', 'competition', 'challenge', 'scouting', 'scoring',
  'registration', 'tournament', 'regional', 'state', 'national', 'biobuzz',
  'canopy', 'centerstage', 'powerplay', 'ultimategoal', 'freight frenzy',
  'alliance', 'autonomous', 'driver controlled', 'endgame', 'servo',
  'motor', 'sensor', 'camera', 'odometry', 'mechanism', 'drivetrain',
  'strategy', 'scouting', 'match', 'points', 'cone', 'cube', 'platform',
  'eligibility', 'mentorship', 'outreach', 'innovation', 'stem', 'engineering',
  'build', 'design', 'programming', 'java', 'blocks', 'onbot'
];

// Basic greetings and conversational starters
const GREETING_PATTERNS = [
  'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon',
  'good evening', 'how are you', 'whats up', 'what\'s up', 'welcome',
  'thanks', 'thank you', 'please', 'help', 'can you', 'what can you do',
  'who are you', 'what are you', 'introduce yourself'
];

const OFF_TOPIC_RESPONSES = [
  "I'm specifically designed to help with FTC (FIRST Tech Challenge) questions. Could you ask me about FTC rules, game strategy, robot design, or team eligibility?",
  "That's outside my FTC expertise! I can help with FIRST Tech Challenge topics like competition rules, game elements, robot specifications, and team information.",
  "I focus on FTC content. Do you have questions about the current season, previous games, scouting strategies, or how to get started with FTC?"
];

export const isFTCQuestion = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Allow basic greetings and conversational starters
  const isGreeting = GREETING_PATTERNS.some(pattern =>
    lowerQuestion.includes(pattern)
  );

  // Allow FTC-related questions
  const isFTCRelated = FTC_KEYWORDS.some(keyword =>
    lowerQuestion.includes(keyword)
  );

  return isGreeting || isFTCRelated;
};

export const isGreeting = (question) => {
  const lowerQuestion = question.toLowerCase();
  return GREETING_PATTERNS.some(pattern =>
    lowerQuestion.includes(pattern)
  );
};

export const getOffTopicResponse = () => {
  return OFF_TOPIC_RESPONSES[Math.floor(Math.random() * OFF_TOPIC_RESPONSES.length)];
};

export const validateResponse = (question, answer, confidenceScore = 0.7) => {
  // Check if answer references FTC-related content
  const ftcContentScore = FTC_KEYWORDS.filter(kw => 
    answer.toLowerCase().includes(kw)
  ).length;
  
  // If confidence is too low or answer has no FTC keywords, trigger guardrail
  if (confidenceScore < 0.5 || ftcContentScore === 0) {
    return {
      valid: false,
      message: getOffTopicResponse(),
      confidence: confidenceScore
    };
  }
  
  return {
    valid: true,
    message: answer,
    confidence: confidenceScore
  };
};

export const createSystemPrompt = (context = '') => {
  const ftcInfo = `You are an expert FTC (FIRST Tech Challenge) assistant. 
Your role is to answer ONLY questions related to FTC, including:
- Competition rules and structure
- Game elements and challenges (current and past seasons like BIOBUZZ, CANOPY, CENTERSTAGE, etc.)
- Robot requirements and specifications
- Team eligibility and registration
- Scouting and scoring systems
- Engineering and design concepts for FTC robots
- Team mentorship and outreach

IMPORTANT GUARDRAILS:
1. Base ALL answers on the provided FTC documentation
2. If a question is outside FTC scope, politely decline
3. Be specific and cite relevant rules or game elements when possible
4. If unsure, suggest resources: firstinspires.org or community.firstinspires.org
5. For "how to" robot questions, explain the concept, not just code

${context ? `Context from FTC Documentation:\n${context}\n\n` : ''}

If the question is not about FTC, respond with:
"I'm specifically designed to help with FTC (FIRST Tech Challenge) questions. Could you ask me about [relevant FTC topic]?"`;

  return ftcInfo;
};
