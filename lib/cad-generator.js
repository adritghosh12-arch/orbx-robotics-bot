// CAD Generator - Uses pre-built parametric FTC part library + Groq LLM fallback
// Real engineering parts modeled after goBILDA/REV hardware - completely free

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];

// Keywords that trigger pre-built assemblies (much better quality than LLM primitives)
const ASSEMBLY_TRIGGERS = {
  'mecanum-drivetrain': ['mecanum', 'drivetrain', 'mecanum drivetrain', 'mecanum drive', 'drive train'],
};

const CAD_SYSTEM_PROMPT = `Output ONLY JSON. You make detailed 3D CAD assemblies.
{"name":"...","parts":[{"id":"p1","type":"box|cylinder|cone|torus","color":"#hex","params":{...},"position":[x,y,z],"rotation":[rx,ry,rz]}],"subtractions":[{"from":"p1","type":"cylinder","params":{...},"position":[x,y,z]}]}
Types: box{width,height,depth} cylinder{radius,height} cone{radiusTop,radiusBottom,height} torus{radius,tube}
Rules: 30-50 parts. mm units. FTC max 457mm. Colors: #2d2d2d rubber #555555 dark-metal #888888 aluminum #3366cc motor #ffaa00 brass #33aa33 PCB #cc3333 red #444444 steel. Y=up. Include: every bracket, bolt, bearing, motor, axle, wheel roller as separate part.`;

// Check if description matches a pre-built assembly
function matchAssembly(description) {
  const lower = description.toLowerCase();
  for (const [id, keywords] of Object.entries(ASSEMBLY_TRIGGERS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return id;
    }
  }
  return null;
}

export async function generateCADCode(description, modelIndex = 0) {
  // First: check if we have a pre-built assembly for this
  const assemblyId = matchAssembly(description);
  if (assemblyId) {
    return {
      success: true,
      useLibrary: true,
      assemblyId: assemblyId,
      model: 'part-library',
      partCount: null, // will be counted client-side
    };
  }

  // Fallback: use LLM for custom parts
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GROQ_API_KEY not configured', geometry: null };
  }

  if (modelIndex >= GROQ_MODELS.length) {
    return { success: false, error: 'All models failed', geometry: null };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODELS[modelIndex],
        messages: [
          { role: 'system', content: CAD_SYSTEM_PROMPT },
          { role: 'user', content: `3D CAD model: ${description}` },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData.error?.message || '';
      if (response.status === 429 || response.status === 503 || errMsg.includes('decommissioned')) {
        return generateCADCode(description, modelIndex + 1);
      }
      if (response.status === 413) {
        return { success: false, error: 'Request too large for free tier. Try a simpler description.', geometry: null };
      }
      return { success: false, error: errMsg || `API error: ${response.status}`, geometry: null };
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { success: false, error: 'No geometry generated', geometry: null };
    }

    content = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');

    let geometry;
    try {
      geometry = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          geometry = JSON.parse(jsonMatch[0]);
        } catch {
          return { success: false, error: 'Failed to parse geometry JSON', geometry: null };
        }
      } else {
        return { success: false, error: 'Model did not return valid JSON', geometry: null };
      }
    }

    if (!geometry.parts || !Array.isArray(geometry.parts) || geometry.parts.length === 0) {
      return { success: false, error: 'Invalid geometry: missing parts', geometry: null };
    }

    return { success: true, geometry, model: GROQ_MODELS[modelIndex], partCount: geometry.parts.length };
  } catch (error) {
    if (modelIndex < GROQ_MODELS.length - 1) {
      return generateCADCode(description, modelIndex + 1);
    }
    return { success: false, error: error.message || 'Unknown error', geometry: null };
  }
}
