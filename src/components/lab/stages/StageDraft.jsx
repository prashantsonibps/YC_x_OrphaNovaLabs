import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, Download, RefreshCw, Image as ImageIcon, Eye, BarChart2, Lock } from 'lucide-react';
import { auth } from '@/api/authClient';
import { Draft, Hypothesis, Experiment } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTheme } from '../../ThemeContext';
import DiseaseImageGallery from '../visualizations/DiseaseImageGallery';
import { Core } from '@/api/integrationsClient';
import FullResearchReport from './FullResearchReport';

const FORMATS = [
  { id: 'arxiv', name: 'arXiv', description: 'Open-access preprint format', enabled: true },
  { id: 'nature', name: 'Nature', description: 'Nature journal format', enabled: false },
  { id: 'cell', name: 'Cell', description: 'Cell journal format', enabled: false },
  { id: 'grant', name: 'NIH Grant', description: 'NIH R01 grant application format', enabled: false },
  { id: 'conference', name: 'Conference', description: 'Conference abstract format', enabled: false }
];

const FORMAT_SECTIONS = {
  arxiv: [
    { key: 'title', label: 'Title', placeholder: 'Enter paper title...' },
    { key: 'abstract', label: 'Abstract', placeholder: 'Write abstract...', editor: true },
    { key: 'introduction', label: 'Introduction', placeholder: 'Write introduction...', editor: true },
    { key: 'methods', label: 'Methods', placeholder: 'Describe methods...', editor: true },
    { key: 'results', label: 'Results', placeholder: 'Present results...', editor: true },
    { key: 'discussion', label: 'Discussion', placeholder: 'Discuss findings...', editor: true },
    { key: 'conclusion', label: 'Conclusion', placeholder: 'Write conclusion...', editor: true },
    { key: 'references', label: 'References', placeholder: 'Add references...', editor: true }
  ],
  nature: [
    { key: 'title', label: 'Title', placeholder: 'Enter paper title (max 90 characters)...' },
    { key: 'abstract', label: 'Abstract', placeholder: 'Write abstract (max 200 words)...', editor: true },
    { key: 'introduction', label: 'Introduction', placeholder: 'Write introduction...', editor: true },
    { key: 'results', label: 'Results', placeholder: 'Present results...', editor: true },
    { key: 'discussion', label: 'Discussion', placeholder: 'Discuss findings...', editor: true },
    { key: 'methods', label: 'Methods', placeholder: 'Describe methods...', editor: true },
    { key: 'references', label: 'References', placeholder: 'Add references (numbered)...', editor: true }
  ],
  cell: [
    { key: 'title', label: 'Title', placeholder: 'Enter paper title...' },
    { key: 'summary', label: 'Summary', placeholder: 'Write summary (150 words)...', editor: true },
    { key: 'introduction', label: 'Introduction', placeholder: 'Write introduction...', editor: true },
    { key: 'results', label: 'Results', placeholder: 'Present results...', editor: true },
    { key: 'discussion', label: 'Discussion', placeholder: 'Discuss findings...', editor: true },
    { key: 'methods', label: 'Experimental Procedures', placeholder: 'Describe methods...', editor: true },
    { key: 'references', label: 'References', placeholder: 'Add references...', editor: true }
  ],
  grant: [
    { key: 'title', label: 'Project Title', placeholder: 'Enter project title...' },
    { key: 'summary', label: 'Project Summary', placeholder: 'Write project summary...', editor: true },
    { key: 'specific_aims', label: 'Specific Aims', placeholder: 'List specific aims...', editor: true },
    { key: 'significance', label: 'Significance', placeholder: 'Explain significance...', editor: true },
    { key: 'innovation', label: 'Innovation', placeholder: 'Describe innovation...', editor: true },
    { key: 'approach', label: 'Approach', placeholder: 'Describe approach...', editor: true },
    { key: 'budget_justification', label: 'Budget Justification', placeholder: 'Justify budget...', editor: true },
    { key: 'references', label: 'References', placeholder: 'Add references...', editor: true }
  ],
  conference: [
    { key: 'title', label: 'Abstract Title', placeholder: 'Enter abstract title...' },
    { key: 'authors', label: 'Authors', placeholder: 'List authors...' },
    { key: 'abstract', label: 'Abstract', placeholder: 'Write abstract (250-300 words)...', editor: true },
    { key: 'keywords', label: 'Keywords', placeholder: 'Add keywords...', editor: true }
  ]
};

export default function StageDraft({ project, onComplete }) {
  const { theme } = useTheme();
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentSection, setCurrentSection] = useState('title');
  const [selectedFormat, setSelectedFormat] = useState('arxiv');
  const [content, setContent] = useState({});
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const pdfPreviewRef = useRef(null);

  useEffect(() => {
    loadExistingDraft();
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadExistingDraft = async () => {
    try {
      const existing = await Draft.filter({ project_id: project.id });
      if (existing.length > 0) {
        const d = existing[0];
        setDraft(d);
        setSelectedFormat(d.format || 'arxiv');
        setContent({
          title: d.title || '',
          abstract: d.abstract || '',
          summary: d.summary || '',
          introduction: d.introduction || '',
          methods: d.methods || '',
          results: d.results || '',
          discussion: d.discussion || '',
          conclusion: d.conclusion || '',
          specific_aims: d.specific_aims || '',
          significance: d.significance || '',
          innovation: d.innovation || '',
          approach: d.approach || '',
          budget_justification: d.budget_justification || '',
          references: d.references || ''
        });
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const handleGenerate = async (isRegenerate = false) => {
    if (isRegenerate) {
      setRegenerating(true);
    } else {
      setGenerating(true);
    }
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 95 ? 95 : prev + 4);
    }, 500);

    try {
      const hypotheses = await Hypothesis.filter({
        project_id: project.id,
        status: 'approved'
      });

      if (hypotheses.length === 0) {
        throw new Error('No approved hypotheses found. Please complete previous stages first.');
      }

      const experiments = await Experiment.filter({ project_id: project.id });

      const context = `
Disease: ${project.disease_name}
Summary: ${project.ai_context_summary}
Hypotheses: ${hypotheses.map(h => h.title).join(', ')}
      `;

      // Determine what to generate based on selected format
      let promptText, schemaProperties, requiredFields;
      
      if (selectedFormat === 'grant') {
        // Grant proposal format
        promptText = `Generate a grant proposal for rare disease research. Be concise but thorough.

${context}

Hypotheses: ${hypotheses.map(h => h.title).join('; ')}

Generate JSON with these fields:
- title: project title
- summary: 150-word executive summary
- specific_aims: 3 numbered research aims (200 words)
- significance: why this matters (200 words)
- innovation: novel aspects (150 words)
- approach: research plan (300 words)
- budget_justification: budget reasoning (100 words)
- references: 8-10 formatted citations`;

        schemaProperties = {
          title: { type: "string" },
          summary: { type: "string" },
          specific_aims: { type: "string" },
          significance: { type: "string" },
          innovation: { type: "string" },
          approach: { type: "string" },
          budget_justification: { type: "string" },
          references: { type: "string" }
        };
        requiredFields = ["title", "summary", "specific_aims", "significance", "innovation", "approach", "budget_justification", "references"];
      } else if (selectedFormat === 'conference') {
        promptText = `Generate a conference abstract for rare disease research. This should be concise and high-impact.

${context}

Hypotheses: ${hypotheses.map(h => h.title).join('; ')}

Generate JSON with these fields:
- title: concise descriptive title (max 15 words)
- authors: author list with affiliations
- abstract: structured abstract with Background, Methods, Results, Conclusions sections (250-300 words)
- keywords: 5-8 relevant MeSH-style keywords, comma-separated`;

        schemaProperties = {
          title: { type: "string" },
          authors: { type: "string" },
          abstract: { type: "string" },
          keywords: { type: "string" }
        };
        requiredFields = ["title", "authors", "abstract", "keywords"];
      } else if (selectedFormat === 'nature') {
        promptText = `Generate a research article following Nature journal style. Title max 90 characters. Abstract max 200 words. Methods section at the end.

${context}

Hypotheses: ${hypotheses.map(h => h.title).join('; ')}

Generate JSON with these fields:
- title: concise title (max 90 characters)
- abstract: single paragraph (max 200 words) summarizing the key finding
- introduction: background leading to hypothesis (250 words)
- results: findings with subheadings (400 words)
- discussion: interpretation, limitations, and significance (300 words)
- methods: detailed experimental procedures (300 words)
- references: 10-15 numbered references in Nature style`;

        schemaProperties = {
          title: { type: "string" },
          abstract: { type: "string" },
          introduction: { type: "string" },
          results: { type: "string" },
          discussion: { type: "string" },
          methods: { type: "string" },
          references: { type: "string" }
        };
        requiredFields = ["title", "abstract", "introduction", "results", "discussion", "methods", "references"];
      } else if (selectedFormat === 'cell') {
        promptText = `Generate a research article following Cell journal style. Include a graphical summary concept. Use "Summary" instead of "Abstract".

${context}

Hypotheses: ${hypotheses.map(h => h.title).join('; ')}

Generate JSON with these fields:
- title: descriptive title
- summary: 150-word summary including "Highlights" bullet points at the start
- introduction: focused background (250 words)
- results: detailed findings with evidence (400 words)
- discussion: broader implications and future directions (300 words)
- methods: experimental procedures with key reagent details (300 words)
- references: 10-15 references in Cell style`;

        schemaProperties = {
          title: { type: "string" },
          summary: { type: "string" },
          introduction: { type: "string" },
          results: { type: "string" },
          discussion: { type: "string" },
          methods: { type: "string" },
          references: { type: "string" }
        };
        requiredFields = ["title", "summary", "introduction", "results", "discussion", "methods", "references"];
      } else {
        promptText = `Generate a scientific research paper in arXiv preprint format. Be concise but thorough.

${context}

Hypotheses: ${hypotheses.map(h => h.title).join('; ')}

Generate JSON with these fields:
- title: descriptive scientific title
- abstract: structured abstract (200 words)
- introduction: background and objectives (300 words)
- methods: methodology and approach (300 words)
- results: key findings (300 words)
- discussion: interpretation and implications (300 words)
- conclusion: summary of contributions (100 words)
- references: 8-10 formatted citations`;

        schemaProperties = {
          title: { type: "string" },
          abstract: { type: "string" },
          introduction: { type: "string" },
          methods: { type: "string" },
          results: { type: "string" },
          discussion: { type: "string" },
          conclusion: { type: "string" },
          references: { type: "string" }
        };
        requiredFields = ["title", "abstract", "introduction", "methods", "results", "discussion", "conclusion", "references"];
      }

      const result = await Core.InvokeLLM({
        prompt: promptText,
        response_json_schema: {
          type: "object",
          properties: schemaProperties,
          required: requiredFields
        }
      });

      const draftData = {
        project_id: project.id,
        ...result,
        format: selectedFormat,
        version: 1,
        figures: []
      };

      let created;
      if (draft) {
        // Update existing
        await Draft.update(draft.id, draftData);
        created = { ...draft, ...draftData };
      } else {
        // Create new
        created = await Draft.create(draftData);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setDraft(created);
      setContent(result);
      setRetryCount(0);
    } catch (error) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate draft. Please try again.');
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setRegenerating(false);
      }, 500);
    }
  };

  const handleSectionUpdate = async (section, value) => {
    const newContent = { ...content, [section]: value };
    setContent(newContent);

    if (draft) {
      await Draft.update(draft.id, { [section]: value });
    }
  };

  const handleFormatChange = async (formatId) => {
    const format = FORMATS.find(f => f.id === formatId);
    if (!format.enabled) return;
    setSelectedFormat(formatId);
    setCurrentSection('title');
    if (draft) {
      await Draft.update(draft.id, { format: formatId });
    }
  };

  const handleAISuggestion = async () => {
    setGeneratingSuggestion(true);
    try {
      const result = await Core.InvokeLLM({
        prompt: `Improve this ${currentSectionData?.label} section for a scientific paper about ${project.disease_name}:

Current text: ${content[currentSection] || 'Empty'}

Provide 3 specific suggestions for improvement focusing on clarity, scientific rigor, and impact.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: { 
              type: "array", 
              items: { type: "string" } 
            }
          }
        }
      });
      
      const suggestions = result?.suggestions ?? [];
      if (suggestions.length > 0) {
        alert(`AI Suggestions:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}`);
      } else {
        alert('No suggestions returned. Try again.');
      }
    } catch (error) {
      console.error('Suggestion error:', error);
    } finally {
      setGeneratingSuggestion(false);
    }
  };

  const handleAddImage = async () => {
    if (!imageUrl) return;
    
    const figures = draft.figures || [];
    figures.push({
      url: imageUrl,
      caption: imageCaption || 'Figure'
    });
    
    await Draft.update(draft.id, { figures });
    setDraft({ ...draft, figures });
    
    // Insert image into editor
    const imageHtml = `<img src="${imageUrl}" alt="${imageCaption}" style="max-width: 100%; margin: 20px 0;" /><p style="font-style: italic; text-align: center;">${imageCaption}</p>`;
    handleSectionUpdate(currentSection, (content[currentSection] || '') + imageHtml);
    
    setShowImageModal(false);
    setImageUrl('');
    setImageCaption('');
  };

  const handleExport = async (format) => {
    try {
      // Validate before export
      const errors = validateExport();
      if (errors.length > 0) {
        alert(`Cannot export - please fix these issues:\n\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
        return;
      }

      setShowExportMenu(false);
      
      if (format === 'docx') {
        const blob = new Blob([content.title + '\n\n' + Object.values(content).filter(v => typeof v === 'string').join('\n\n')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(content.title || 'paper').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (format === 'pdf') {
        // Generate arXiv-style PDF using LaTeX and convert
        await generateArxivPDF();
        return;
      }
      
      // Create text content
      const sections = FORMAT_SECTIONS[selectedFormat];
      let fullText = `${content.title || 'Untitled'}\n\n`;
      
      sections.forEach(section => {
        if (section.key !== 'title' && content[section.key]) {
          // Strip HTML tags for text export
          const text = content[section.key].replace(/<[^>]*>/g, '');
          fullText += `${section.label.toUpperCase()}\n${text}\n\n`;
        }
      });

      if (format === 'latex') {
        // Create LaTeX file with images
        let figuresLatex = '';
        if (draft.figures && draft.figures.length > 0) {
          figuresLatex = draft.figures.map((fig, idx) => 
            `\\begin{figure}[h]
\\centering
\\includegraphics[width=0.8\\textwidth]{${fig.url}}
\\caption{${fig.caption}}
\\label{fig:${idx + 1}}
\\end{figure}`
          ).join('\n\n');
        }

        const latexContent = `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\usepackage{cite}
\\usepackage{amsmath}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{${content.title || 'Untitled'}}
\\author{Research Team}
\\date{\\today}

\\begin{document}
\\maketitle

${sections.filter(s => s.key !== 'title' && content[s.key]).map(s => {
  const text = content[s.key].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  return `\\section{${s.label}}
${text}`;
}).join('\n\n')}

${figuresLatex}

\\end{document}`;
        
        const blob = new Blob([latexContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${content.title?.replace(/\s+/g, '_') || 'paper'}.tex`;
        a.click();
      } else if (format === 'txt') {
        const blob = new Blob([fullText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${content.title?.replace(/\s+/g, '_') || 'paper'}.txt`;
        a.click();
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const generateArxivPDF = async () => {
    try {
      // Strip HTML and escape LaTeX special characters
      const stripHtml = (html) => {
        if (!html) return '';
        return html
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&/g, '\\&')
          .replace(/%/g, '\\%')
          .replace(/\$/g, '\\$')
          .replace(/#/g, '\\#')
          .replace(/_/g, '\\_')
          .replace(/~/g, '\\textasciitilde{}')
          .replace(/\^/g, '\\textasciicircum{}');
      };
      
      const userName = user?.full_name || 'Researcher';
      const userEmail = user?.email || '';
      
      // Generate figures LaTeX
      let figuresLatex = '';
      if (draft?.figures && draft.figures.length > 0) {
        figuresLatex = draft.figures.map((fig, idx) => `
\\begin{figure}[htbp]
  \\centering
  \\includegraphics[width=0.7\\textwidth]{figure${idx + 1}}
  \\caption{${stripHtml(fig.caption)}}
  \\label{fig:${idx + 1}}
\\end{figure}

% Note: Save images as figure1.png, figure2.png, etc. in the same directory
% Image URL: ${fig.url}
`).join('\n');
      }
      
      // Create proper arXiv-style LaTeX document
      const latexContent = `\\documentclass[11pt]{article}

% arXiv preprint formatting
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{cite}
\\usepackage{hyperref}
\\usepackage{authblk}
\\usepackage{setspace}
\\usepackage{url}

% Page numbering
\\pagestyle{plain}

% Hyperref setup
\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    citecolor=blue,
    urlcolor=blue
}

\\title{\\textbf{${stripHtml(content.title || 'Untitled Research Paper')}}}

\\author[1]{${userName}\\thanks{Corresponding author: \\href{mailto:${userEmail}}{${userEmail}}}}
\\author[1]{NOVUS AI}
\\affil[1]{OrphaNova Research, New York City, NY, USA}

\\date{${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}}

\\begin{document}

\\maketitle

\\begin{abstract}
${stripHtml(content.abstract || 'No abstract provided.')}
\\end{abstract}

\\section{Introduction}
${stripHtml(content.introduction || 'No introduction provided.')}

\\section{Methods}
${stripHtml(content.methods || 'No methods provided.')}

${figuresLatex ? '\\section{Figures}\n' + figuresLatex : ''}

\\section{Results}
${stripHtml(content.results || 'No results provided.')}

\\section{Discussion}
${stripHtml(content.discussion || 'No discussion provided.')}

\\section{Conclusion}
${stripHtml(content.conclusion || 'No conclusion provided.')}

\\section*{References}
${stripHtml(content.references || 'No references provided.')}

\\end{document}`;

      // Download as .tex file
      const blob = new Blob([latexContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${content.title?.replace(/\s+/g, '_') || 'paper'}_arxiv.tex`;
      a.click();
      
      alert('✅ arXiv LaTeX downloaded!\n\n📝 To generate PDF:\n1. Upload to Overleaf.com (recommended)\n2. Download images and rename as figure1.png, figure2.png, etc.\n3. Compile with pdflatex\n\n✨ Output will have proper page numbers, formatting, and all sections including Conclusion!');
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const validateExport = () => {
    const errors = [];
    
    // Validate title
    if (!content.title || content.title.trim().length < 10) {
      errors.push('Title is too short (minimum 10 characters)');
    }
    
    // Validate required sections
    const requiredSections = ['abstract', 'introduction', 'methods', 'results', 'discussion'];
    requiredSections.forEach(section => {
      if (!content[section] || content[section].trim().length < 100) {
        errors.push(`${section.charAt(0).toUpperCase() + section.slice(1)} section is empty or too short`);
      }
    });
    
    return errors;
  };

  const generatePDFPreviewHTML = () => {
    // Comprehensive HTML and text sanitization
    const stripHtml = (html) => {
      if (!html) return '';
      return html
        .replace(/<img[^>]*>/gi, '') // Remove ALL image tags
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '') // Remove figure tags
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/#{1,6}\s+/g, '') // Remove markdown headings
        .replace(/Figure\s+\d+:.*$/gm, '') // Remove figure captions from text
        .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
        .replace(/[^\x20-\x7E\n\r]/g, '') // Remove non-printable characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Sanitize title - remove ALL contamination
    const sanitizeTitle = (title) => {
      if (!title) return 'Untitled Research Paper';
      
      let clean = title
        .replace(/<[^>]*>/g, '') // Remove HTML
        .replace(/Figure\s+\d+:.*$/gi, '') // Remove figure captions
        .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
        .replace(/#{1,6}\s+/g, '') // Remove markdown
        .replace(/[^\x20-\x7E]/g, '') // Remove special chars
        .replace(/\s+/g, ' ')
        .trim();
      
      // If title is too long, truncate intelligently
      if (clean.length > 120) {
        clean = clean.substring(0, 117) + '...';
      }
      
      return clean || 'Untitled Research Paper';
    };

    // Create safe filename
    const createSafeFilename = (title) => {
      return title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    };
    
    const cleanTitle = sanitizeTitle(content.title);
    const userName = user?.full_name || 'Researcher';
    const userEmail = user?.email || '';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Process sections - prevent duplication and ensure clean text
    const processSection = (sectionText) => {
      if (!sectionText) return '<p>Content not provided.</p>';
      
      const cleaned = stripHtml(sectionText);
      
      // Split into paragraphs intelligently
      const paragraphs = cleaned
        .split(/\n\n+/) // Split on double newlines
        .map(p => p.trim())
        .filter(p => p.length > 20) // Filter out very short fragments
        .filter((p, idx, arr) => arr.indexOf(p) === idx); // Remove duplicates
      
      if (paragraphs.length === 0) return '<p>Content not provided.</p>';
      
      return paragraphs
        .map(p => `<p>${p}</p>`)
        .join('\n        ');
    };

    // Generate figures HTML - only if explicitly added by user
    let figuresHTML = '';
    if (draft?.figures && draft.figures.length > 0) {
      figuresHTML = draft.figures.map((fig, idx) => `
        <div class="figure">
          <img src="${fig.url}" alt="Figure ${idx + 1}" crossorigin="anonymous" onerror="this.style.display='none'" />
          <p class="caption"><strong>Figure ${idx + 1}:</strong> ${stripHtml(fig.caption)}</p>
        </div>
      `).join('\n      ');
    }

    // Process references properly
    const processReferences = (refs) => {
      if (!refs) return '<div class="ref-item">No references provided.</div>';
      
      const cleaned = stripHtml(refs);
      const refList = cleaned
        .split(/\n+/)
        .map(r => r.trim())
        .filter(r => r.length > 10)
        .filter((r, idx, arr) => arr.indexOf(r) === idx); // Remove duplicates
      
      if (refList.length === 0) return '<div class="ref-item">No references provided.</div>';
      
      return refList
        .map((ref, idx) => `<div class="ref-item">[${idx + 1}] ${ref}</div>`)
        .join('\n        ');
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${cleanTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page { size: 8.5in 11in; margin: 0; }
    
    body {
      font-family: 'Computer Modern', 'Times New Roman', serif;
      font-size: 10pt;
      line-height: 1.3;
      background: #fff;
      color: #000;
    }
    
    .page {
      width: 8.5in;
      min-height: 11in;
      padding: 0.75in 0.75in 1in 0.75in;
      margin: 0 auto 20px;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      position: relative;
      page-break-after: always;
    }
    
    .page-number {
      position: absolute;
      bottom: 0.5in;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10pt;
      color: #000;
    }
    
    .header {
      text-align: center;
      margin-bottom: 18pt;
    }
    
    .title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10pt;
      line-height: 1.2;
    }
    
    .authors {
      font-size: 11pt;
      margin-bottom: 3pt;
    }
    
    .affiliation {
      font-size: 9.5pt;
      font-style: italic;
      margin-bottom: 2pt;
    }
    
    .email {
      font-size: 9pt;
      margin-bottom: 3pt;
      color: #0066cc;
    }
    
    .date {
      font-size: 9pt;
      margin-top: 4pt;
      color: #333;
    }
    
    .abstract {
      margin: 16pt 0.5in;
      padding: 10pt;
      background: #f5f5f5;
      border-left: 2px solid #000;
    }
    
    .abstract-title {
      font-weight: bold;
      font-size: 10pt;
      text-align: center;
      margin-bottom: 6pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    
    .abstract-content {
      font-size: 9pt;
      text-align: justify;
      line-height: 1.25;
    }
    
    .two-column {
      column-count: 2;
      column-gap: 0.25in;
      column-rule: 1px solid #ccc;
    }
    
    .section {
      margin-top: 10pt;
      break-inside: avoid;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5pt;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
    }
    
    .section-content {
      text-align: justify;
      font-size: 10pt;
      line-height: 1.4;
    }
    
    .section-content p {
      margin-bottom: 10pt;
      text-indent: 0;
    }
    
    .figure {
      margin: 16pt 0;
      text-align: center;
      break-inside: avoid;
      column-span: all;
      -webkit-column-span: all;
      padding: 10pt;
      background: #f8f8f8;
      border: 1px solid #ccc;
      page-break-inside: avoid;
    }
    
    .figure img {
      max-width: 85%;
      max-height: 350px;
      height: auto;
      display: block;
      margin: 0 auto 8pt;
      border: 1px solid #ddd;
    }
    
    .caption {
      font-size: 9pt;
      text-align: center;
      font-style: italic;
      color: #333;
      margin-top: 6pt;
    }
    
    .references {
      margin-top: 12pt;
      column-span: all;
    }
    
    .references-title {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 8pt;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 3pt;
    }
    
    .ref-item {
      font-size: 8.5pt;
      margin-bottom: 5pt;
      text-indent: -0.2in;
      padding-left: 0.2in;
      line-height: 1.2;
    }
    
    @media print {
      body { background: white; }
      .page { box-shadow: none; margin: 0; page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="page-number">1</div>
    <div class="header">
      <div class="title">${cleanTitle}</div>
      <div class="authors">${userName}<sup>1</sup>, NOVUS AI<sup>1</sup></div>
      <div class="affiliation"><sup>1</sup>OrphaNova Research, New York City, NY, USA</div>
      <div class="email">${userEmail}</div>
      <div class="date">${today}</div>
    </div>

    <div class="abstract">
      <div class="abstract-title">Abstract</div>
      <div class="abstract-content">${stripHtml(content.abstract || 'Abstract not provided.')}</div>
    </div>

    <div class="two-column">
      <div class="section">
        <div class="section-title">1. Introduction</div>
        <div class="section-content">
        ${processSection(content.introduction)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. Methods</div>
        <div class="section-content">
        ${processSection(content.methods)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">3. Results</div>
        <div class="section-content">
        ${processSection(content.results)}
        </div>
      </div>

      ${figuresHTML}

      <div class="section">
        <div class="section-title">4. Discussion</div>
        <div class="section-content">
        ${processSection(content.discussion)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">5. Conclusion</div>
        <div class="section-content">
        ${processSection(content.conclusion)}
        </div>
      </div>

      <div class="references">
        <div class="references-title">References</div>
        ${processReferences(content.references)}
      </div>
    </div>
  </div>

  <script>
    // Simple page numbering
    window.onload = function() {
      const pages = document.querySelectorAll('.page');
      pages.forEach((page, idx) => {
        const pageNum = page.querySelector('.page-number');
        if (pageNum) pageNum.textContent = idx + 1;
      });
    };
  </script>
</body>
</html>`;
  };

  const sections = FORMAT_SECTIONS[selectedFormat] || FORMAT_SECTIONS.arxiv;
  const currentSectionData = sections.find(s => s.key === currentSection);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Research Output
          </h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            Generate a complete visual research report or a structured paper draft for publication.
          </p>
        </div>

        {!draft && !generating && (
          <div className="space-y-6">
            {/* Primary: Full Report */}
            <Card className={`overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-800/80 border-cyan-500/30' : 'bg-gradient-to-br from-white to-slate-50 border-cyan-200 shadow-lg'}`}>
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <BarChart2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Full Research Report
                      </h3>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">Recommended</Badge>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Compiles everything from all 6 stages into one visual report — executive summary, validated targets, drug candidates, experiments, and full paper. Downloadable as PDF.
                    </p>
                    <Button
                      onClick={() => setShowReport(true)}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-base px-6 py-5"
                    >
                      <BarChart2 className="w-5 h-5 mr-2" />
                      Generate Full Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Secondary: arXiv Paper */}
            <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      arXiv Paper Draft
                    </h3>
                    <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Generate a structured research paper with abstract, introduction, methods, results, discussion. Editable with AI suggestions. Export as LaTeX.
                    </p>
                    <Button
                      onClick={() => { setSelectedFormat('arxiv'); handleGenerate(); }}
                      variant="outline"
                      className={theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}
                      disabled={generating}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate arXiv Draft
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other formats — Coming Soon */}
            <div className="grid grid-cols-2 gap-4">
              {FORMATS.filter(f => !f.enabled).map(fmt => (
                <Card key={fmt.id} className={`${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'} opacity-60`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{fmt.name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Coming Soon</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 max-w-md mx-auto text-center">
                <p className="text-red-300 text-sm mb-2">{error}</p>
                {retryCount < 3 && (
                  <Button
                    onClick={() => { setRetryCount(retryCount + 1); handleGenerate(); }}
                    variant="outline" size="sm"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    Retry ({retryCount + 1}/3)
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {(generating || regenerating) && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <div className="text-center max-w-md">
                  <p className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {regenerating ? 'Regenerating Paper Draft...' : 'Generating Paper Draft...'}
                  </p>
                  
                  <div className={`h-2 rounded-full overflow-hidden mb-4 ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                  }`}>
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className={`space-y-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <motion.p animate={{ opacity: progress > 10 ? 1 : 0.3 }}>
                      {progress > 10 ? '✓' : '→'} Structuring content...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 30 ? 1 : 0.3 }}>
                      {progress > 30 ? '✓' : '→'} Writing abstract...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 50 ? 1 : 0.3 }}>
                      {progress > 50 ? '✓' : '→'} Composing introduction...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 70 ? 1 : 0.3 }}>
                      {progress > 70 ? '✓' : '→'} Detailing methods and results...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 90 ? 1 : 0.3 }}>
                      {progress > 90 ? '✓' : '→'} Formatting for {FORMATS.find(f => f.id === selectedFormat)?.name}...
                    </motion.p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {draft && !generating && (
          <>
            {/* Format Selector */}
            <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Target Format
                    </p>
                    <div className="flex gap-2">
                      {FORMATS.map(fmt => (
                        <button
                          key={fmt.id}
                          onClick={() => handleFormatChange(fmt.id)}
                          disabled={!fmt.enabled}
                          className={`px-3 py-1.5 rounded text-sm transition-all ${
                            selectedFormat === fmt.id
                              ? 'bg-cyan-600 text-white'
                              : !fmt.enabled
                              ? 'opacity-50 cursor-not-allowed bg-slate-600 text-slate-400'
                              : theme === 'dark'
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {fmt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowReport(true)}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                    >
                      <BarChart2 className="w-4 h-4 mr-2" />
                      Full Report
                    </Button>
                    <Button 
                      onClick={() => setShowPDFPreview(true)} 
                      variant="outline" 
                      className={theme === 'dark' ? 'border-slate-700 text-cyan-400' : 'border-slate-300 text-cyan-600'}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      PDF Preview
                    </Button>
                    <Button 
                      onClick={() => handleGenerate(true)} 
                      variant="outline" 
                      className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}
                      disabled={regenerating}
                    >
                      {regenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                    <div className="relative">
                      <Button 
                        onClick={() => setShowExportMenu(!showExportMenu)} 
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      {showExportMenu && (
                        <div className={`absolute right-0 top-12 rounded-lg shadow-xl z-50 min-w-[200px] ${
                          theme === 'dark' 
                            ? 'bg-slate-800 border border-slate-700' 
                            : 'bg-white border border-slate-300'
                        }`}>
                          <button
                            onClick={() => handleExport('txt')}
                            className={`w-full text-left px-4 py-3 transition-colors rounded-t-lg ${
                              theme === 'dark'
                                ? 'hover:bg-slate-700 text-white'
                                : 'hover:bg-slate-100 text-slate-900'
                            }`}
                          >
                            📄 Plain Text (.txt)
                          </button>
                          <button
                            onClick={() => handleExport('pdf')}
                            className={`w-full text-left px-4 py-3 transition-colors rounded-b-lg ${
                              theme === 'dark'
                                ? 'hover:bg-slate-700 text-white'
                                : 'hover:bg-slate-100 text-slate-900'
                            }`}
                          >
                            📕 Download arXiv PDF (LaTeX)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-12 gap-6">
              {/* Section Navigator */}
              <div className="col-span-3">
                <Card className={`sticky top-6 ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <CardContent className="p-4">
                    <p className={`text-xs font-semibold uppercase mb-3 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Sections ({FORMATS.find(f => f.id === selectedFormat)?.name})
                    </p>
                    <div className="space-y-1">
                      {sections.map(section => (
                        <button
                          key={section.key}
                          onClick={() => setCurrentSection(section.key)}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                            currentSection === section.key
                              ? 'bg-cyan-600 text-white'
                              : theme === 'dark'
                              ? 'text-slate-300 hover:bg-slate-700'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {section.label}
                          {content[section.key] && (
                            <span className="ml-2 text-green-400">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Editor */}
              <div className="col-span-9">
                <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
                  <CardContent className="p-6">
                    <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {currentSectionData?.label}
                    </h3>

                    {currentSectionData?.key === 'title' ? (
                      <Input
                        value={content.title || ''}
                        onChange={(e) => handleSectionUpdate('title', e.target.value)}
                        className={`text-xl ${
                          theme === 'dark'
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder={currentSectionData.placeholder}
                      />
                    ) : (
                      <>
                        <div className={`rounded-lg overflow-hidden ${
                          theme === 'dark' ? 'bg-slate-900' : 'bg-white'
                        }`}>
                          <ReactQuill
                            value={content[currentSection] || ''}
                            onChange={(value) => handleSectionUpdate(currentSection, value)}
                            theme="snow"
                            placeholder={currentSectionData?.placeholder}
                            className={theme === 'dark' ? 'quill-dark' : 'quill-light'}
                            style={{
                              minHeight: '400px'
                            }}
                          />
                        </div>
                        <style>{`
                          .quill-dark .ql-toolbar {
                            background: #1e293b;
                            border-color: #334155 !important;
                          }
                          .quill-dark .ql-container {
                            background: #0f172a;
                            border-color: #334155 !important;
                          }
                          .quill-dark .ql-editor {
                            color: white;
                          }
                          .quill-dark .ql-stroke {
                            stroke: #94a3b8;
                          }
                          .quill-dark .ql-fill {
                            fill: #94a3b8;
                          }
                          .quill-dark .ql-picker-label {
                            color: #94a3b8;
                          }
                          .quill-light .ql-toolbar {
                            background: #f8fafc;
                            border-color: #e2e8f0 !important;
                          }
                          .quill-light .ql-container {
                            background: white;
                            border-color: #e2e8f0 !important;
                          }
                          .quill-light .ql-editor {
                            color: #1e293b;
                          }
                          .quill-light .ql-stroke {
                            stroke: #475569;
                          }
                          .quill-light .ql-fill {
                            fill: #475569;
                          }
                          .quill-light .ql-picker-label {
                            color: #475569;
                          }
                        `}</style>
                      </>
                    )}

                    <div className="mt-4 flex justify-between items-center">
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                        Auto-saved • Version {draft.version || 1}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400"
                          onClick={() => setShowImageModal(true)}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Add from URL
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-400"
                          onClick={() => setShowGalleryModal(true)}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          AI Gallery
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-cyan-400"
                          onClick={handleAISuggestion}
                          disabled={generatingSuggestion || !content[currentSection]}
                        >
                          {generatingSuggestion ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'AI Suggestions'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className={`flex justify-end pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
              <Button
                onClick={onComplete}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
              >
                Continue to Review & Scoring
              </Button>
            </div>

            {/* AI Gallery Modal */}
            {showGalleryModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className={`max-w-3xl w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        AI-Generated Research Visualizations
                      </h3>
                      <Button
                        onClick={() => setShowGalleryModal(false)}
                        variant="ghost"
                        size="sm"
                      >
                        Close
                      </Button>
                    </div>
                    <DiseaseImageGallery 
                      diseaseName={project.disease_name}
                      onAddToDraft={async (image) => {
                        const figures = draft.figures || [];
                        figures.push({
                          url: image.url,
                          caption: image.caption
                        });
                        
                        await Draft.update(draft.id, { figures });
                        setDraft({ ...draft, figures });
                        
                        // Insert image into editor
                        const imageHtml = `<img src="${image.url}" alt="${image.caption}" style="max-width: 100%; margin: 20px 0;" /><p style="font-style: italic; text-align: center;">${image.caption}</p>`;
                        handleSectionUpdate(currentSection, (content[currentSection] || '') + imageHtml);
                        
                        setShowGalleryModal(false);
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* PDF Preview Modal */}
            {showPDFPreview && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <Card className={`w-full max-w-5xl h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        arXiv-Style PDF Preview
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const errors = validateExport();
                            if (errors.length > 0) {
                              alert(`Cannot export - please fix these issues:\n\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
                              return;
                            }
                            
                            const htmlContent = generatePDFPreviewHTML();
                            const blob = new Blob([htmlContent], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            
                            // Create safe filename
                            const safeTitle = content.title
                              ?.replace(/[^a-zA-Z0-9\s-]/g, '')
                              .replace(/\s+/g, '_')
                              .substring(0, 50) || 'paper';
                            
                            a.href = url;
                            a.download = `${safeTitle}_preview.html`;
                            a.click();
                          }}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Preview
                        </Button>
                        <Button
                          onClick={generateArxivPDF}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download LaTeX
                        </Button>
                        <Button
                          onClick={() => setShowPDFPreview(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto border rounded-lg" style={{background: 'white'}}>
                      <iframe
                        ref={pdfPreviewRef}
                        srcDoc={generatePDFPreviewHTML()}
                        className="w-full h-full"
                        title="PDF Preview"
                      />
                    </div>
                    <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      This is a browser preview. Download the LaTeX file for professional PDF compilation with proper typesetting, equations, and citations.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Image Modal */}
            {showImageModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className={theme === 'dark' ? 'bg-slate-800 border-slate-700 max-w-md' : 'bg-white border-slate-300 max-w-md'}>
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Add Image from Web
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`text-sm mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          Image URL
                        </label>
                        <Input
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}
                        />
                      </div>
                      <div>
                        <label className={`text-sm mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          Caption
                        </label>
                        <Input
                          value={imageCaption}
                          onChange={(e) => setImageCaption(e.target.value)}
                          placeholder="Figure 1: Description..."
                          className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}
                        />
                      </div>
                      {imageUrl && (
                        <div className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                          <img src={imageUrl} alt="Preview" className="max-h-40 mx-auto" onError={(e) => e.target.style.display = 'none'} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                      <Button
                        onClick={() => {
                          setShowImageModal(false);
                          setImageUrl('');
                          setImageCaption('');
                        }}
                        variant="outline"
                        className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddImage}
                        disabled={!imageUrl}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Insert Image
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}


          </>
        )}
      </div>

      <FullResearchReport
        project={project}
        open={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  );
}