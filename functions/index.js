const { onCall, HttpsError } = require('firebase-functions/v2/https');
const functionsV1 = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const adminDb = admin.firestore();

const ADMIN_EMAILS = ['psoni@mail.yu.edu', 'prashantsonibps@gmail.com'];

function isAdmin(auth) {
  if (!auth || !auth.token) return false;
  const email = (auth.token.email || '').toLowerCase();
  return ADMIN_EMAILS.includes(email);
}

const TAMARIND_BASE = 'https://app.tamarind.bio/api';
const PUBCHEM_API = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const UNIPROT_API = 'https://rest.uniprot.org/uniprotkb/search';

const PRIMARY_MODEL = 'gemini-2.5-pro';
const FAST_MODEL = 'gemini-2.5-flash';
const PRIMARY_MODEL_FALLBACKS = [
  'gemini-pro-latest',
  'gemini-2.0-flash',
  'gemini-flash-latest',
];
const FAST_MODEL_FALLBACKS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-pro-latest',
];

async function sendWelcomeEmail({
  toEmail,
  toName,
  appUrl,
  supportEmail,
  fromEmail,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('sendWelcomeEmail skipped: RESEND_API_KEY is not set.');
    return;
  }

  const html = `
  <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px;">
    <div style="margin: 0 0 16px;">
      <img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6914994ade0eb501881d7e25/0ee5cd7ea_image.png"
        alt="OrphaNova Labs"
        width="56"
        height="56"
        style="display:block;border-radius:8px;"
      />
    </div>
    <h2 style="margin: 0 0 12px;">Welcome to OrphaNova Labs${toName ? `, ${toName}` : ''}</h2>
    <p style="margin: 0 0 12px;">
      Your account is now active. You can start new rare disease research projects, run the AI pipeline, and generate publication-ready outputs.
    </p>
    <p style="margin: 0 0 20px;">
      Click below to open your dashboard.
    </p>
    <a href="${appUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
      Open OrphaNova
    </a>
    <p style="margin: 20px 0 0; font-size: 14px; color: #334155;">
      Don't forget to send us your review, and let us know if you run into any issue.
    </p>
    <p style="margin: 10px 0 0; font-size: 13px; color: #475569;">
      Need help? Email <a href="mailto:${supportEmail}">${supportEmail}</a>.
    </p>
  </div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: 'Welcome to OrphaNova Labs',
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

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
      process.env.GEMINI_MODEL_PRIMARY,
      PRIMARY_MODEL,
      ...PRIMARY_MODEL_FALLBACKS,
    ]);
  }
  return uniqueModels([
    process.env.GEMINI_MODEL_FAST,
    FAST_MODEL,
    ...FAST_MODEL_FALLBACKS,
  ]);
}

function isModelNotFoundError(error) {
  const status = error?.status || error?.statusCode;
  const message = `${error?.message || ''} ${error?.error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return status === 404 || (
    message.includes('model') &&
    (message.includes('not found') || message.includes('does not exist') || message.includes('invalid'))
  );
}

function mapProviderError(error) {
  const status = error?.status || error?.statusCode;
  const providerMessage = error?.message || error?.error?.message || 'Gemini request failed.';
  const norm = String(providerMessage).toLowerCase();

  if (status === 401 || status === 403 || norm.includes('api key')) {
    return { code: 'permission-denied', message: 'GEMINI_API_KEY is invalid or lacks access. Update functions/.env and redeploy.', details: { providerMessage } };
  }
  if (status === 429 || norm.includes('rate limit')) {
    return { code: 'resource-exhausted', message: 'Gemini rate limit exceeded. Please retry shortly.', details: { providerMessage } };
  }
  if (status === 400 || norm.includes('invalid request')) {
    return { code: 'invalid-argument', message: 'Invalid LLM request payload.', details: { providerMessage } };
  }
  if (isModelNotFoundError(error)) {
    return { code: 'failed-precondition', message: 'Configured Gemini model is unavailable for this account.', details: { providerMessage } };
  }
  return { code: 'internal', message: 'Failed to process LLM request.', details: { providerMessage } };
}

function extractGeminiText(response) {
  const candidates = response?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

async function generateWithGemini(apiKey, model, prompt, { temperature, maxOutputTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens },
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const err = payload?.error || {};
    const error = new Error(err.message || `Gemini request failed (${response.status})`);
    error.status = response.status;
    error.details = err.status || '';
    throw error;
  }

  return payload;
}

exports.invokeLLM = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    const { prompt, response_json_schema, add_context_from_internet } = request.data || {};

    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'prompt must be a non-empty string.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not set. Add it to functions/.env and redeploy.');
    }

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
          const response = await generateWithGemini(apiKey, model, fullPrompt, {
            maxOutputTokens: useStructuredOutput ? 8192 : 2048,
            temperature: useStructuredOutput ? 0.2 : 0.6,
          });

          const rawText = extractGeminiText(response);
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
      throw lastModelError || new Error('No Gemini model could be used for this request.');
    } catch (error) {
      console.error('invokeLLM error:', error);
      const mapped = mapProviderError(error);
      throw new HttpsError(mapped.code, mapped.message, mapped.details);
    }
  }
);

// ---------------------------------------------------------------------------
// runExperiment — Tamarind Bio ADMET + Docking with Gemini fallback
// ---------------------------------------------------------------------------

const DRUG_NAME_NOISE = /\b(analog|analogue|derivative|inhibitor|agonist|antagonist|mimetic|peptide|compound|therapy|treatment|combination|based|novel|selective|potent|oral|small[\s-]molecule|recombinant|humanized|monoclonal|antibody|fusion protein)\b/gi;

async function lookupSmilesExact(name) {
  const res = await fetch(
    `${PUBCHEM_API}/compound/name/${encodeURIComponent(name.trim())}/property/CanonicalSMILES,MolecularFormula,MolecularWeight,IUPACName/JSON`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.PropertyTable?.Properties?.[0] || null;
}

async function lookupSmiles(drugName) {
  if (!drugName || drugName === 'N/A') return null;

  // Try the exact name first
  let result = await lookupSmilesExact(drugName);
  if (result?.CanonicalSMILES) return result;

  // Strip common qualifiers and retry
  const cleaned = drugName.replace(DRUG_NAME_NOISE, '').replace(/\s+/g, ' ').trim();
  if (cleaned && cleaned !== drugName) {
    result = await lookupSmilesExact(cleaned);
    if (result?.CanonicalSMILES) return result;
  }

  // Try individual words (longest first) — some names are "Drug X" where "Drug" is the real compound
  const words = drugName.split(/[\s\-\/,]+/).filter(w => w.length > 2 && !/^\d+$/.test(w));
  const unique = [...new Set(words.map(w => w.replace(DRUG_NAME_NOISE, '').trim()).filter(w => w.length > 2))];
  for (const word of unique) {
    result = await lookupSmilesExact(word);
    if (result?.CanonicalSMILES) return result;
  }

  console.warn(`PubChem: no SMILES found for "${drugName}" (cleaned: "${cleaned}", words: [${unique.join(', ')}])`);
  return null;
}

async function lookupProteinSequence(geneName) {
  const res = await fetch(
    `${UNIPROT_API}?query=gene_exact:${encodeURIComponent(geneName)}+AND+organism_id:9606&format=json&size=1&fields=accession,gene_names,sequence,protein_name`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data?.results?.[0];
  if (!entry) return null;
  return {
    accession: entry.primaryAccession || '',
    sequence: entry.sequence?.value || '',
    length: entry.sequence?.length || 0,
    protein_name: entry.proteinDescription?.recommendedName?.fullName?.value || '',
  };
}

async function tamarindSubmit(apiKey, type, settings, jobName) {
  const res = await fetch(`${TAMARIND_BASE}/submit-job`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, settings, jobName }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Tamarind submit failed (${res.status}): ${text}`);
  return text;
}

async function tamarindPollUntilDone(apiKey, jobName, maxWaitMs = 180000) {
  const start = Date.now();
  const pollInterval = 5000;
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${TAMARIND_BASE}/jobs?jobName=${encodeURIComponent(jobName)}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      const jobs = Array.isArray(data) ? data : (data?.jobs || []);
      const job = jobs.find(j => j.jobName === jobName || j.name === jobName);
      if (job) {
        const status = (job.status || job.state || '').toLowerCase();
        if (status === 'completed' || status === 'succeeded' || status === 'done') {
          return { status: 'completed', job };
        }
        if (status === 'failed' || status === 'error') {
          return { status: 'failed', job };
        }
      }
    }
    await new Promise(r => setTimeout(r, pollInterval));
  }
  return { status: 'timeout' };
}

async function tamarindGetResult(apiKey, jobName) {
  const res = await fetch(`${TAMARIND_BASE}/result`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobName }),
  });
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) return res.json();
  return res.text();
}

async function geminiAdmetFallback(apiKey, drugName, smiles, molecularFormula, molecularWeight) {
  const modelCandidates = getModelCandidates(true);
  const prompt = `You are a computational pharmacology expert. Predict ADMET properties for this compound.

Drug: ${drugName}
SMILES: ${smiles || 'N/A'}
Molecular Formula: ${molecularFormula || 'N/A'}
Molecular Weight: ${molecularWeight || 'N/A'}

Based on the chemical structure and known pharmacological data, predict:
1. Absorption: oral bioavailability (%), Caco-2 permeability, HIA (human intestinal absorption)
2. Distribution: plasma protein binding (%), BBB penetration, VDss
3. Metabolism: CYP450 interactions (1A2, 2C9, 2C19, 2D6, 3A4 — inhibitor/substrate)
4. Excretion: half-life estimate, clearance route
5. Toxicity: hERG liability, hepatotoxicity risk, AMES mutagenicity, LD50 class
6. Overall drug-likeness: Lipinski violations, bioavailability score (0-1)

Return ONLY valid JSON matching this schema:
${JSON.stringify({
  type: "object",
  properties: {
    absorption: { type: "object", properties: {
      oral_bioavailability: { type: "string" },
      caco2_permeability: { type: "string" },
      hia: { type: "string" },
      summary: { type: "string" }
    }},
    distribution: { type: "object", properties: {
      ppb: { type: "string" },
      bbb_penetration: { type: "string" },
      vdss: { type: "string" },
      summary: { type: "string" }
    }},
    metabolism: { type: "object", properties: {
      cyp_interactions: { type: "array", items: { type: "object", properties: { enzyme: { type: "string" }, role: { type: "string" } }}},
      summary: { type: "string" }
    }},
    excretion: { type: "object", properties: {
      half_life: { type: "string" },
      clearance: { type: "string" },
      summary: { type: "string" }
    }},
    toxicity: { type: "object", properties: {
      herg_liability: { type: "string" },
      hepatotoxicity: { type: "string" },
      ames_mutagenicity: { type: "string" },
      ld50_class: { type: "string" },
      overall_risk: { type: "string" },
      summary: { type: "string" }
    }},
    druglikeness: { type: "object", properties: {
      lipinski_violations: { type: "number" },
      bioavailability_score: { type: "number" },
      summary: { type: "string" }
    }},
    binding_affinity_estimate: { type: "string" },
    confidence_note: { type: "string" }
  }
})}`;

  for (const model of modelCandidates) {
    try {
      const response = await generateWithGemini(apiKey, model, prompt, {
        maxOutputTokens: 4096,
        temperature: 0.15,
      });
      const rawText = extractGeminiText(response);
      return parseJsonSafe(rawText);
    } catch (err) {
      if (isModelNotFoundError(err)) continue;
      throw err;
    }
  }
  throw new Error('Gemini ADMET fallback failed: no model available.');
}

exports.runExperiment = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    const { drugName, geneName, diseaseName, experimentTitle } = request.data || {};

    if (!drugName && !geneName) {
      throw new HttpsError('invalid-argument', 'drugName or geneName is required.');
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const tamarindKey = process.env.TAMARIND_API_KEY;
    const useTamarind = !!tamarindKey;

    // Step 1: Look up compound data from PubChem
    let pubchem = null;
    try {
      if (drugName && drugName !== 'N/A') {
        pubchem = await lookupSmiles(drugName);
      }
    } catch (err) {
      console.warn('PubChem lookup failed:', err.message);
    }

    const smiles = pubchem?.CanonicalSMILES || null;
    const molecularFormula = pubchem?.MolecularFormula || null;
    const molecularWeight = pubchem?.MolecularWeight || null;
    const iupacName = pubchem?.IUPACName || null;

    // Step 2: Look up protein sequence from UniProt
    let protein = null;
    try {
      if (geneName && geneName !== 'N/A') {
        protein = await lookupProteinSequence(geneName);
      }
    } catch (err) {
      console.warn('UniProt lookup failed:', err.message);
    }

    // Step 3: Try Tamarind Bio ADMET + Docking
    let tamarindAdmet = null;
    let tamarindDocking = null;
    let source = 'gemini_prediction';

    if (useTamarind && smiles) {
      const ts = Date.now();

      // ADMET job — smilesStrings takes a comma-separated list
      try {
        const admetJobName = `orphanova_admet_${ts}`;
        await tamarindSubmit(tamarindKey, 'admet', { smilesStrings: smiles }, admetJobName);
        const pollResult = await tamarindPollUntilDone(tamarindKey, admetJobName, 120000);
        if (pollResult.status === 'completed') {
          tamarindAdmet = await tamarindGetResult(tamarindKey, admetJobName);
          source = 'tamarind_bio';
        }
      } catch (err) {
        console.warn('Tamarind ADMET failed:', err.message);
      }

      // Docking job (Chai-1) — protein sequence + ligands SMILES
      if (protein?.sequence) {
        try {
          const dockJobName = `orphanova_dock_${ts}`;
          await tamarindSubmit(tamarindKey, 'chai', {
            inputFormat: 'sequence',
            sequence: protein.sequence,
            ligands: smiles,
            useMSA: false,
            numSamples: 1,
            numTrunkSamples: 1,
          }, dockJobName);
          const pollResult = await tamarindPollUntilDone(tamarindKey, dockJobName, 180000);
          if (pollResult.status === 'completed') {
            tamarindDocking = await tamarindGetResult(tamarindKey, dockJobName);
          }
        } catch (err) {
          console.warn('Tamarind docking failed:', err.message);
        }
      }
    }

    // Step 4: Gemini fallback if Tamarind didn't produce ADMET results
    let admetResults = null;
    if (tamarindAdmet) {
      admetResults = tamarindAdmet;
    } else if (geminiKey) {
      try {
        admetResults = await geminiAdmetFallback(
          geminiKey, drugName || 'unknown', smiles, molecularFormula, molecularWeight
        );
        source = smiles ? 'gemini_with_structure' : 'gemini_prediction';
      } catch (err) {
        console.error('Gemini ADMET fallback error:', err);
      }
    }

    return {
      source,
      drug: {
        name: drugName,
        smiles,
        molecular_formula: molecularFormula,
        molecular_weight: molecularWeight,
        iupac_name: iupacName,
      },
      protein: protein ? {
        name: protein.protein_name,
        gene: geneName,
        accession: protein.accession,
        sequence_length: protein.length,
      } : null,
      admet: admetResults,
      docking: tamarindDocking,
      experiment_title: experimentTitle || '',
    };
  }
);

// ---------------------------------------------------------------------------
// runAlphaFold — Tamarind Bio AlphaFold2 structure prediction
// ---------------------------------------------------------------------------

async function checkAlphaFoldDB(accession) {
  // AlphaFold DB stores pre-computed structures for most UniProt proteins
  const url = `https://alphafold.ebi.ac.uk/api/prediction/${accession}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const entry = Array.isArray(data) ? data[0] : data;
  if (!entry?.pdbUrl) return null;
  return {
    pdbUrl: entry.pdbUrl,
    cifUrl: entry.cifUrl || null,
    paeImageUrl: entry.paeImageUrl || null,
    modelCreatedDate: entry.modelCreatedDate || null,
    uniprotId: entry.uniprotId || accession,
    latestVersion: entry.latestVersion || null,
  };
}

exports.runAlphaFold = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (request) => {
    const { geneName, sequence } = request.data || {};

    if (!sequence && !geneName) {
      throw new HttpsError('invalid-argument', 'sequence or geneName is required.');
    }

    // Step 1: Look up protein metadata from UniProt
    let proteinMeta = null;
    if (geneName) {
      try {
        proteinMeta = await lookupProteinSequence(geneName);
      } catch (err) {
        console.warn('UniProt lookup failed:', err.message);
      }
    }

    if (!proteinMeta && !sequence) {
      throw new HttpsError('not-found', `Could not find protein for gene "${geneName}" on UniProt.`);
    }

    const accession = proteinMeta?.accession;
    const proteinSeq = sequence || proteinMeta?.sequence;

    // Step 2: Check AlphaFold DB (instant — pre-computed structures for ~200M proteins)
    if (accession) {
      try {
        const afdb = await checkAlphaFoldDB(accession);
        if (afdb) {
          console.log(`AlphaFold DB hit for ${accession} (${geneName})`);
          return {
            status: 'completed',
            source: 'alphafold_db',
            geneName: geneName || null,
            accession,
            proteinName: proteinMeta?.protein_name || null,
            sequenceLength: proteinSeq?.length || proteinMeta?.length || 0,
            pdbUrl: afdb.pdbUrl,
            cifUrl: afdb.cifUrl,
            paeImageUrl: afdb.paeImageUrl,
            modelCreatedDate: afdb.modelCreatedDate,
          };
        }
      } catch (err) {
        console.warn('AlphaFold DB check failed:', err.message);
      }
    }

    // Step 3: Fall back to Tamarind Bio AlphaFold2 for novel sequences
    const tamarindKey = process.env.TAMARIND_API_KEY;
    if (!tamarindKey) {
      throw new HttpsError('failed-precondition', 'No pre-computed structure found and TAMARIND_API_KEY is not set.');
    }

    if (!proteinSeq) {
      throw new HttpsError('not-found', `No sequence available for gene "${geneName}".`);
    }

    const ts = Date.now();
    const jobName = `orphanova_af2_${geneName || 'seq'}_${ts}`;

    await tamarindSubmit(tamarindKey, 'alphafold', {
      sequence: proteinSeq,
      numModels: '1',
      numRecycles: 3,
      useMSA: false,
    }, jobName);

    const pollResult = await tamarindPollUntilDone(tamarindKey, jobName, 120000);

    if (pollResult.status === 'completed') {
      const result = await tamarindGetResult(tamarindKey, jobName);
      return {
        status: 'completed',
        source: 'tamarind_alphafold2',
        geneName: geneName || null,
        accession: accession || null,
        proteinName: proteinMeta?.protein_name || null,
        sequenceLength: proteinSeq.length,
        jobName,
        result,
      };
    }

    if (pollResult.status === 'failed') {
      return { status: 'failed', geneName, jobName, error: 'AlphaFold job failed on Tamarind.' };
    }

    return { status: 'timeout', geneName, jobName, error: 'AlphaFold job timed out (2 min). It may still be running on Tamarind.' };
  }
);

// ---------------------------------------------------------------------------
// screenDrugsModal — Parallel drug screening via Modal (RDKit QED + Lipinski)
// ---------------------------------------------------------------------------

async function geminiResolveSMILES(apiKey, drugNames) {
  const modelCandidates = getModelCandidates(true);
  const prompt = `You are a medicinal chemistry expert. For each drug/compound name below, provide the canonical SMILES string. If the name is a class (e.g. "HDAC inhibitor") use the most well-known representative compound. If the name is too vague or not a real compound, provide the closest real FDA-approved or clinical-stage drug.

Drug names:
${drugNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return ONLY valid JSON matching this schema:
${JSON.stringify({
  type: "object",
  properties: {
    drugs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          input_name: { type: "string" },
          resolved_name: { type: "string" },
          smiles: { type: "string" },
        }
      }
    }
  }
})}`;

  for (const model of modelCandidates) {
    try {
      const response = await generateWithGemini(apiKey, model, prompt, {
        maxOutputTokens: 2048,
        temperature: 0.1,
      });
      const rawText = extractGeminiText(response);
      const parsed = parseJsonSafe(rawText);
      return parsed?.drugs || [];
    } catch (err) {
      if (isModelNotFoundError(err)) continue;
      throw err;
    }
  }
  return [];
}

exports.screenDrugsModal = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request) => {
    const { drugNames } = request.data || {};
    if (!Array.isArray(drugNames) || drugNames.length === 0) {
      throw new HttpsError('invalid-argument', 'drugNames must be a non-empty array.');
    }

    const modalEndpoint = process.env.MODAL_ENDPOINT;
    if (!modalEndpoint) {
      throw new HttpsError(
        'failed-precondition',
        'MODAL_ENDPOINT is not configured. Deploy modal_app.py and set the URL in functions/.env.'
      );
    }

    const uniqueDrugs = [...new Set(drugNames.filter(n => n && n !== 'N/A'))];
    if (uniqueDrugs.length === 0) {
      throw new HttpsError('invalid-argument', 'No valid drug names provided.');
    }

    console.log('screenDrugsModal: incoming drug names:', uniqueDrugs);

    // Layer 1: Try PubChem for each drug in parallel
    const pubchemLookups = await Promise.allSettled(
      uniqueDrugs.map(async (name) => {
        try {
          const data = await lookupSmiles(name);
          return { name, smiles: data?.CanonicalSMILES || null };
        } catch {
          return { name, smiles: null };
        }
      })
    );

    const resolved = {};
    const unresolved = [];
    for (const r of pubchemLookups) {
      if (r.status === 'fulfilled' && r.value.smiles) {
        resolved[r.value.name] = r.value.smiles;
      } else if (r.status === 'fulfilled') {
        unresolved.push(r.value.name);
      }
    }

    console.log(`PubChem resolved ${Object.keys(resolved).length}/${uniqueDrugs.length}, unresolved: [${unresolved.join(', ')}]`);

    // Layer 2: Ask Gemini to resolve remaining drug names to SMILES
    if (unresolved.length > 0) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const geminiResults = await geminiResolveSMILES(geminiKey, unresolved);
          for (const cr of geminiResults) {
            if (cr.smiles && cr.smiles.length > 2 && cr.smiles !== 'N/A') {
              const origName = cr.input_name || cr.resolved_name;
              resolved[origName] = cr.smiles;
              console.log(`Gemini resolved "${origName}" → "${cr.resolved_name}" (${cr.smiles.slice(0, 40)}...)`);
            }
          }
        } catch (err) {
          console.warn('Gemini SMILES resolution failed:', err.message);
        }
      }
    }

    const drugs = Object.entries(resolved).map(([name, smiles]) => ({ name, smiles }));

    if (drugs.length === 0) {
      throw new HttpsError(
        'not-found',
        `Could not resolve SMILES for any of ${uniqueDrugs.length} drugs: [${uniqueDrugs.join(', ')}]. Try using specific compound names in evidence extraction.`
      );
    }

    console.log(`Sending ${drugs.length} drugs to Modal for screening`);

    // Call Modal web endpoint for parallel screening
    const res = await fetch(modalEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(drugs),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Modal screening error:', res.status, errText);
      throw new HttpsError('internal', `Modal screening failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const result = await res.json();
    return {
      ...result,
      drugs_submitted: drugs.length,
      drugs_requested: uniqueDrugs.length,
    };
  }
);

// ---------------------------------------------------------------------------
// getAdminProjects — Admin-only: list all users and all projects
// ---------------------------------------------------------------------------
exports.getAdminProjects = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    if (!isAdmin(request.auth)) {
      throw new HttpsError('permission-denied', 'Admin only.');
    }

    try {
      const usersSnap = await adminDb.collection('users').get();
      const users = [];
      const projects = [];

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const email = userData.email || userData.full_name || uid;
        const displayName = userData.full_name || userData.displayName || email;
        const updatedVal = userData.updated_date;
        const updatedStr = updatedVal && typeof updatedVal.toDate === 'function'
          ? updatedVal.toDate().toISOString()
          : (updatedVal && typeof updatedVal === 'string' ? updatedVal : null);
        users.push({
          id: uid,
          email,
          full_name: displayName,
          updated_date: updatedStr,
        });

        const projectsSnap = await adminDb.collection('users').doc(uid).collection('projects').get();
        projectsSnap.docs.forEach((pDoc) => {
          const d = pDoc.data();
          const createdVal = d.created_date;
          const updatedVal = d.updated_date;
          const createdStr = createdVal && typeof createdVal.toDate === 'function'
            ? createdVal.toDate().toISOString()
            : (createdVal && typeof createdVal === 'string' ? createdVal : null);
          const updatedStr = updatedVal && typeof updatedVal.toDate === 'function'
            ? updatedVal.toDate().toISOString()
            : (updatedVal && typeof updatedVal === 'string' ? updatedVal : null);
          projects.push({
            id: pDoc.id,
            owner_uid: uid,
            owner_email: email,
            owner_name: displayName,
            ...d,
            created_date: createdStr,
            updated_date: updatedStr,
          });
        });
      }

      projects.sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));
      return { users, projects };
    } catch (err) {
      console.error('getAdminProjects error:', err);
      throw new HttpsError('internal', err.message || 'Failed to load admin data.');
    }
  }
);

// ---------------------------------------------------------------------------
// adminUpdateProject — Admin-only: update any user's project (archive, reset stage)
// ---------------------------------------------------------------------------
exports.adminUpdateProject = onCall(
  { region: 'us-central1', timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.');
    if (!isAdmin(request.auth)) throw new HttpsError('permission-denied', 'Admin only.');

    const { uid, projectId, data } = request.data || {};
    if (!uid || !projectId) {
      throw new HttpsError('invalid-argument', 'uid and projectId are required.');
    }
    if (!data || typeof data !== 'object') {
      throw new HttpsError('invalid-argument', 'data must be a non-empty object.');
    }

    try {
      const ref = adminDb.collection('users').doc(uid).collection('projects').doc(projectId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Project not found.');
      }
      await ref.update({
        ...data,
        updated_date: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error('adminUpdateProject error:', err);
      throw new HttpsError('internal', err.message || 'Failed to update project.');
    }
  }
);

// ---------------------------------------------------------------------------
// sendWelcomeOnSignup — Sends welcome email after first account creation
// ---------------------------------------------------------------------------

exports.sendWelcomeOnSignup = functionsV1
  .region('us-central1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .auth.user()
  .onCreate(async (user) => {
    if (!user?.email) {
      console.log('sendWelcomeOnSignup: skipped user without email', user?.uid || 'unknown');
      return;
    }

    const appUrl = process.env.APP_URL || 'https://orphanovalabs.web.app';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@orphanova.com';
    const fromEmail = process.env.WELCOME_FROM_EMAIL || 'OrphaNova Labs <hello@orphanova.com>';

    try {
      await sendWelcomeEmail({
        toEmail: user.email,
        toName: user.displayName || '',
        appUrl,
        supportEmail,
        fromEmail,
      });
      console.log('sendWelcomeOnSignup: welcome email sent to', user.email);
    } catch (error) {
      console.error('sendWelcomeOnSignup failed:', error.message);
    }
  });
