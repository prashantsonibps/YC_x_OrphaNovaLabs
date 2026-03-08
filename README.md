# OrphaNova Labs

**AI Scientist for Rare Diseases**

Most rare diseases have no treatment. 7,000+ conditions, 400 million people worldwide, and barely any research funding. We're building the AI that changes that.

OrphaNova takes a disease name and runs the entire research pipeline — from literature to paper draft — in minutes instead of months.

```
                            OrphaNova Labs
                     ┌──────────────────────────┐
                     │                          │
    "Down Syndrome"  │   AI Research Pipeline   │  Paper draft
    ───────────────► │                          │ ──────────────►
                     └──────────────────────────┘
                                 │
                     ┌───────────┼───────────┐
                     ▼           ▼           ▼
                 ┌───────┐ ┌─────────┐ ┌─────────┐
                 │PubMed │ │ UniProt │ │ PubChem │
                 │OpenTgt│ │AlphaFold│ │Clinical │
                 │  ...  │ │  Mol*   │ │Trials.gov│
                 └───────┘ └─────────┘ └─────────┘
```

## What it does

```
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  1. Upload  │     │ 2. Literatu │     │ 3. Evidence │
  │  Disease    │────►│    re Scan  │────►│  Extraction │
  │  Name/Data  │     │  (PubMed)  │     │  + Validation│
  └─────────────┘     └─────────────┘     └──────┬──────┘
                                                  │
                                    ┌─────────────┘
                                    ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  6. Paper   │     │ 5. Experim- │     │ 4. Hypothe- │
  │  Drafting   │◄────│  ent Design │◄────│  sis Gen    │
  │  (arXiv etc)│     │  + Analysis │     │  (Claude)   │
  └─────────────┘     └─────────────┘     └─────────────┘
```

**Stage 1 — Upload.** Enter a rare disease. That's it.

**Stage 2 — Literature.** NOVUS (our AI assistant) scans literature and pulls relevant papers, genes, pathways.

**Stage 3 — Evidence.** Extracts drug-gene-disease relationships. Enriches each one with:
- **Open Targets** association scores
- **UniProt** protein data and sequences
- **AlphaFold** 3D protein structures (viewable in Mol* right in the browser)

Click "Valid" on a relationship and it instantly fetches the protein structure.

**Stage 4 — Hypotheses.** Claude generates testable hypotheses grounded in the validated evidence + PubChem compound data.

**Stage 5 — Experiments.** Designs experiments with real data backing:
- **ADMET analysis** via Tamarind Bio (absorption, distribution, metabolism, excretion, toxicity)
- **Drug screening** via Modal (parallel RDKit QED + Lipinski on serverless GPUs)
- **Molecular docking** via Chai-1 on Tamarind Bio
- **ClinicalTrials.gov** integration for existing trial context
- AI analysis that cites actual pipeline data, not hallucinated metrics

**Stage 6 — Paper.** Generates full drafts in arXiv, Nature, Cell, NIH Grant, or Conference format. Export as PDF or LaTeX.

## The stack

```
  Frontend                    Backend                   External APIs
  ─────────────────           ──────────────────        ─────────────────
  React + Vite                Firebase Functions        Open Targets
  Tailwind CSS                Anthropic Claude          UniProt
  Framer Motion               Tamarind Bio             PubChem
  Mol* (3D viewer)                                     AlphaFold DB
  shadcn/ui                                            ClinicalTrials.gov
                              Modal (serverless)        PubMed
                              RDKit (cheminformatics)
```

## Run locally

```bash
# frontend
npm install
npm run dev

# firebase functions (needs .env with ANTHROPIC_API_KEY, TAMARIND_API_KEY)
cd functions
npm install
cd ..
firebase emulators:start --only functions

# modal drug screening (needs modal account)
pip install modal
modal deploy modal_app.py
```

Set these in `functions/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
TAMARIND_API_KEY=...
MODAL_ENDPOINT=https://your-modal-endpoint.modal.run
```

## How the data flows

```
  User enters disease
        │
        ▼
  Claude extracts relationships from literature
        │
        ▼
  Each relationship gets enriched:
        │
        ├──► Open Targets ──► association score (0-1)
        ├──► UniProt ──► protein info, sequence, function
        ├──► AlphaFold DB ──► 3D structure (instant) or Tamarind AlphaFold2 (fallback)
        │
        ▼
  User validates relationships ("Valid" / "Invalid")
        │
        ▼
  Claude generates hypotheses (fed real enriched data)
        │
        ▼
  Claude designs experiments (fed real enriched data)
        │
        ├──► PubChem ──► SMILES lookup
        ├──► Modal + RDKit ──► parallel drug screening (QED, Lipinski)
        ├──► Tamarind Bio ──► real ADMET prediction
        ├──► Tamarind Chai-1 ──► molecular docking
        ├──► ClinicalTrials.gov ──► existing trial context
        │
        ▼
  AI analyzes experiment feasibility using ALL the real data above
        │
        ▼
  Claude drafts paper in chosen journal format
```

## Why this matters

There are ~7,000 rare diseases. 95% have no FDA-approved treatment. A single drug takes 10-15 years and $2.6B to develop. Most rare disease researchers are working alone, underfunded, starting from scratch.

OrphaNova compresses the early research phase. It doesn't replace scientists — it gives them a running start.

---

Built by [OrphaNova Labs](https://orphanovalabs.web.app). YC x OrphaNova.
