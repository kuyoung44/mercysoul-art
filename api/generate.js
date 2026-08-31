export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { vision } = req.body || {};
    if (typeof vision !== 'string' || !vision.trim()) {
      return res.status(400).json({ error: 'A vision is required.' });
    }
    if (vision.length > 2000) {
      return res.status(400).json({ error: 'Vision is too long.' });
    }

    const prompt = [
      'Create a beautiful symbolic digital talisman artwork based on this user vision:',
      vision.trim(),
      '',
      'Style: premium mystical African-inspired digital art, luminous symbolism, elegant composition, rich detail, sacred atmosphere, suitable as a phone wallpaper. Do not make claims that the image provides guaranteed supernatural effects.'
    ].join('\n');

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(response.status).json({ error: data?.error?.message || 'Gemini image generation failed.' });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    if (!imagePart) {
      return res.status(502).json({ error: 'Gemini returned no image.' });
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const image = `data:${mimeType};base64,${imagePart.inlineData.data}`;
    return res.status(200).json({ image });
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: 'Unable to generate the talisman right now.' });
  }
}
