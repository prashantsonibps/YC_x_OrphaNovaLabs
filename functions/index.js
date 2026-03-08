const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Anthropic = require('@anthropic-ai/sdk');

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

const PRIMARY_MODEL = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-3-5-haiku-20241022';

function extractTextContent(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function parseJsonSafe(rawText) {
  if (typeof rawText !== 'string') return rawText;
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Model returned non-JSON text for a schema-based request.');
  }
}

exports.invokeLLM = onCall(
  {
    region: 'us-central1',
    secrets: [anthropicApiKey],
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    const { prompt, response_json_schema, add_context_from_internet } = request.data || {};

    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'prompt must be a non-empty string.');
    }

    const apiKey = anthropicApiKey.value() || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'ANTHROPIC_API_KEY is not configured.');
    }

    const anthropic = new Anthropic({ apiKey });
    const useStructuredOutput = !!response_json_schema;
    const model =
      (useStructuredOutput
        ? process.env.CLAUDE_MODEL_PRIMARY || PRIMARY_MODEL
        : process.env.CLAUDE_MODEL_FAST || FAST_MODEL);

    const internetHint = add_context_from_internet
      ? '\n\nInternet context requested: use your best available general knowledge and clearly avoid fabricated citations.'
      : '';

    const structuredInstruction = useStructuredOutput
      ? `\n\nReturn ONLY valid JSON matching this schema:\n${JSON.stringify(response_json_schema)}`
      : '';

    const fullPrompt = `${prompt}${internetHint}${structuredInstruction}`;

    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: useStructuredOutput ? 4000 : 1500,
        temperature: useStructuredOutput ? 0.2 : 0.6,
        messages: [{ role: 'user', content: fullPrompt }],
      });

      const rawText = extractTextContent(response.content);
      if (!rawText) {
        throw new Error('Model returned an empty response.');
      }

      if (useStructuredOutput) {
        return parseJsonSafe(rawText);
      }

      return rawText;
    } catch (error) {
      console.error('invokeLLM error:', error);
      throw new HttpsError('internal', error.message || 'Failed to process LLM request.');
    }
  }
);
