import { generateCADCode } from '../../lib/cad-generator.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description } = req.body;

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required' });
  }

  if (description.length > 2000) {
    return res.status(400).json({ error: 'Description too long (max 2000 characters)' });
  }

  try {
    const result = await generateCADCode(description.trim());

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Pre-built assembly from part library
    if (result.useLibrary) {
      return res.status(200).json({
        success: true,
        useLibrary: true,
        assemblyId: result.assemblyId,
        model: result.model,
      });
    }

    // LLM-generated geometry
    return res.status(200).json({
      success: true,
      geometry: result.geometry,
      model: result.model,
    });
  } catch (error) {
    console.error('CAD API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
