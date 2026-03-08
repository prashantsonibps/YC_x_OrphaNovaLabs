const { onCall, HttpsError } = require('firebase-functions/v2/https');
const Anthropic = require('@anthropic-ai/sdk');

const PRIMARY_MODEL = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-3-5-haiku-20241022';
const PRIMARY_MODEL_FALLBACKS = [
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
];
const FAST_MODEL_FALLBACKS = [
  'claude-3-5-haiku-latest',
  'claude-3-haiku-20240307',
];

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

function uniqueModels(models) {
  return [...new Set(models.filter(Boolean))];
}

function getModelCandidates(useStructuredOutput) {
  if (useStructuredOutput) {
    return uniqueModels([
      process.env.CLAUDE_MODEL_PRIMARY,
      PRIMARY_MODEL,
      ...PRIMARY_MODEL_FALLBACKS,
    ]);
  }
  return uniqueModels([
    process.env.CLAUDE_MODEL_FAST,
    FAST_MODEL,
    ...FAST_MODEL_FALLBACKS,
  ]);
}

function isModelNotFoundError(error) {
  const status = error?.status || error?.statusCode;
  const message = `${error?.message || ''} ${error?.error?.message || ''}`.toLowerCase();
  return status === 404 || (
    message.includes('model') &&
    (message.includes('not found') || message.includes('does not exist') || message.includes('invalid'))
  );
}

function mapProviderError(error) {
  const status = error?.status || error?.statusCode;
  const providerMessage = error?.message || error?.error?.message || 'Anthropic request failed.';
  const norm = String(providerMessage).toLowerCase();

  if (status === 401 || status === 403 || norm.includes('api key')) {
    return { code: 'permission-denied', message: 'ANTHROPIC_API_KEY is invalid or lacks access. Update functions/.env and redeploy.', details: { providerMessage } };
  }
  if (status === 429 || norm.includes('rate limit')) {
    return { code: 'resource-exhausted', message: 'Anthropic rate limit exceeded. Please retry shortly.', details: { providerMessage } };
  }
  if (status === 400 || norm.includes('invalid request')) {
    return { code: 'invalid-argument', message: 'Invalid LLM request payload.', details: { providerMessage } };
  }
  if (isModelNotFoundError(error)) {
    return { code: 'failed-precondition', message: 'Configured Claude model is unavailable for this account.', details: { providerMessage } };
  }
  return { code: 'internal', message: 'Failed to process LLM request.', details: { providerMessage } };
}

exports.invokeLLM = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    const { prompt, response_json_schema, add_context_from_internet } = request.data || {};

    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'prompt must be a non-empty string.');
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'ANTHROPIC_API_KEY is not set. Add it to functions/.env and redeploy.');
    }

    const anthropic = new Anthropic({ apiKey });
    const useStructuredOutput = !!response_json_schema;
    const modelCandidates = getModelCandidates(useStructuredOutput);

    const internetHint = add_context_from_internet
      ? '\n\nInternet context requested: use your best available general knowledge and clearly avoid fabricated citations.'
      : '';

    const structuredInstruction = useStructuredOutput
      ? `\n\nReturn ONLY valid JSON matching this schema:\n${JSON.stringify(response_json_schema)}`
      : '';

    const fullPrompt = `${prompt}${internetHint}${structuredInstruction}`;

    try {
      let lastModelError;
      for (const model of modelCandidates) {
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

          return useStructuredOutput ? parseJsonSafe(rawText) : rawText;
        } catch (modelError) {
          if (isModelNotFoundError(modelError)) {
            lastModelError = modelError;
            continue;
          }
          throw modelError;
        }
      }
      throw lastModelError || new Error('No Claude model could be used for this request.');
    } catch (error) {
      console.error('invokeLLM error:', error);
      const mapped = mapProviderError(error);
      throw new HttpsError(mapped.code, mapped.message, mapped.details);
    }
  }
);
