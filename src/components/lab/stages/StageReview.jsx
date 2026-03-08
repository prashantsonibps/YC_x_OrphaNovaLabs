import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, RefreshCw, Users, Sparkles } from 'lucide-react';
import { Review, Draft, Hypothesis, Relation } from '@/api/entities';
import { Core } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '../../ThemeContext';

export default function StageReview({ project, onComplete }) {
  const { theme } = useTheme();
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [suggestedReviewers, setSuggestedReviewers] = useState([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);

  useEffect(() => {
    loadExistingReview();
  }, []);

  const loadExistingReview = async () => {
    try {
      const existing = await Review.filter({ project_id: project.id });
      if (existing.length > 0) {
        setReview(existing[0]);
      }
    } catch (error) {
      console.error('Error loading review:', error);
    }
  };

  const suggestReviewers = async () => {
    setLoadingReviewers(true);
    try {
      const drafts = await Draft.filter({ project_id: project.id });
      const hypotheses = await Hypothesis.filter({
        project_id: project.id,
        status: 'approved'
      });

      const paperContent = drafts.length > 0 ? `
Title: ${drafts[0].title}
Abstract: ${drafts[0].abstract?.substring(0, 500)}
Methods: ${drafts[0].methods?.substring(0, 300)}
      ` : `
Hypotheses: ${hypotheses.map(h => h.title).join(', ')}
Disease Focus: ${project.disease_name}
      `;

      const result = await Core.InvokeLLM({
        prompt: `You are an expert academic editor suggesting peer reviewers for a scientific paper on rare diseases.

PAPER DETAILS:
${paperContent}

Disease: ${project.disease_name}

Suggest 5 REAL expert researchers who would be ideal peer reviewers based on:
1. Expertise in ${project.disease_name} or related rare diseases
2. Strong publication record in relevant fields
3. Active in recent years (2018-2025)
4. Experience in neurology, genetics, or immunology as relevant

For each reviewer, provide:
- Full name (real researcher)
- Institution
- Expertise areas (specific)
- Why they're a good fit (1-2 sentences)
- Recent relevant work (paper title or research area)

Be specific and realistic. Only suggest established researchers with verifiable credentials.`,
        response_json_schema: {
          type: "object",
          properties: {
            reviewers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  institution: { type: "string" },
                  expertise: { type: "array", items: { type: "string" } },
                  rationale: { type: "string" },
                  recent_work: { type: "string" }
                },
                required: ["name", "institution", "expertise", "rationale", "recent_work"]
              }
            }
          },
          required: ["reviewers"]
        }
      });

      setSuggestedReviewers(result.reviewers);
    } catch (error) {
      console.error('Error suggesting reviewers:', error);
    } finally {
      setLoadingReviewers(false);
    }
  };

  const handleReview = async () => {
    setReviewing(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 95 ? 95 : prev + 4);
    }, 400);

    try {
      const hypotheses = await Hypothesis.filter({
        project_id: project.id,
        status: 'approved'
      });
      const relations = await Relation.filter({
        project_id: project.id,
        status: 'valid'
      });
      const drafts = await Draft.filter({ project_id: project.id });

      const context = `
Disease: ${project.disease_name}
Hypotheses: ${hypotheses.length}
Validated Relations: ${relations.length}
Draft Exists: ${drafts.length > 0}
      `;

      // Calculate data completeness scores
      const dataQualityFactors = {
        hypothesisCount: hypotheses.length,
        relationCount: relations.length,
        hasDraft: drafts.length > 0,
        draftCompleteness: drafts.length > 0 ? (drafts[0].title && drafts[0].abstract && drafts[0].methods && drafts[0].results ? 4 : 
                                                  drafts[0].title && drafts[0].abstract ? 2 : 1) : 0
      };

      // Compute realistic base score
      let baseScore = 40; // Start at 40%
      
      // Add points for hypotheses (up to +15)
      baseScore += Math.min(hypotheses.length * 5, 15);
      
      // Add points for validated relations (up to +20)
      baseScore += Math.min(relations.length * 4, 20);
      
      // Add points for draft completeness (up to +15)
      baseScore += Math.min(dataQualityFactors.draftCompleteness * 4, 15);
      
      // Cap realistic maximum based on actual data
      const realisticMax = baseScore + 10; // Allow some optimism but cap it

      const draftContent = drafts.length > 0 ? `
Draft Title: ${drafts[0].title}
Abstract: ${drafts[0].abstract?.substring(0, 500)}
Methods: ${drafts[0].methods?.substring(0, 400)}
Results: ${drafts[0].results?.substring(0, 400)}
Discussion: ${drafts[0].discussion?.substring(0, 400)}
      ` : 'No draft available';

      const result = await Core.InvokeLLM({
        prompt: `You are a senior scientific reviewer evaluating a rare disease research project for publication/funding.

PROJECT DATA:
${context}

DRAFT CONTENT:
${draftContent}

Hypothesis Count: ${hypotheses.length}
Validated Evidence Relations: ${relations.length}
Draft Exists: ${drafts.length > 0 ? 'Yes' : 'No'}

EVALUATION CRITERIA - Provide objective, detailed feedback:

1. **Scientific Rigor** (0-100): Assess methodology, controls, statistical power
   - Experimental design quality
   - Data validation approaches
   - Reproducibility considerations
   - ${relations.length} validated relations: ${relations.length < 3 ? 'WEAK methodology (30-50)' : relations.length < 10 ? 'ADEQUATE rigor (50-70)' : 'STRONG evidence (70-90)'}

2. **Clarity** (0-100): Writing quality and presentation
   - If draft exists: Evaluate abstract clarity, methods description, results presentation, logical flow
   - Language precision and scientific terminology
   - Figure/table quality (if present)
   - ${drafts.length === 0 ? 'Score: 40 (no draft to evaluate)' : 'Evaluate actual content quality'}

3. **Impact** (0-100): Potential contribution to the field
   - Addresses critical gap in ${project.disease_name} research?
   - Clinical/translational potential
   - Innovation level: ${hypotheses.length < 2 ? 'LIMITED (30-50)' : hypotheses.length < 5 ? 'MODERATE (50-70)' : 'HIGH (70-90)'}
   - Potential to advance understanding or treatment

4. **Novelty** (0-100): Uniqueness and innovation
   - Under-researched disease: +20-40
   - Novel hypothesis: +10-30
   - Incremental vs breakthrough: 30-95

5. **Evidence Strength** (0-100): Quality and quantity of supporting data
   - CRITICAL: With ${relations.length} relations, realistic max: ${Math.min(relations.length * 10, 85)}
   - Evidence diversity and quality
   - Contradictory evidence addressed?

6. **Publication Readiness** (0-100): Completeness for submission
   - Draft completeness: ${drafts.length === 0 ? 'None (max 40)' : 'Evaluate sections'}
   - References, figures, tables adequate?
   - Meets journal standards?

7. **Acceptance Likelihood** (0-100): Overall publication probability
   - **REALISTIC RANGE: ${baseScore}-${realisticMax}%**
   - Consider all factors: rigor, clarity, impact, novelty
   - ${hypotheses.length < 2 ? '⚠️ Weak hypothesis base' : ''}
   - ${relations.length < 5 ? '⚠️ Limited evidence' : ''}

Provide specific, actionable feedback with severity ratings. Identify strengths AND weaknesses honestly.`,
        response_json_schema: {
          type: "object",
          properties: {
            scientific_rigor: { type: "number", minimum: 0, maximum: 100 },
            clarity: { type: "number", minimum: 0, maximum: 100 },
            impact: { type: "number", minimum: 0, maximum: 100 },
            novelty_score: { type: "number", minimum: 0, maximum: 100 },
            evidence_strength: { type: "number", minimum: 0, maximum: 100 },
            publication_readiness: { type: "number", minimum: 0, maximum: 100 },
            acceptance_likelihood: { type: "number", minimum: 0, maximum: 100 },
            comments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  comment: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "moderate", "low"] }
                },
                required: ["section", "comment", "severity"]
              }
            },
            ai_suggestions: { type: "string" }
          },
          required: ["scientific_rigor", "clarity", "impact", "novelty_score", "evidence_strength", "publication_readiness", "acceptance_likelihood", "comments", "ai_suggestions"]
        }
      });

      const created = await Review.create({
        project_id: project.id,
        ...result,
        review_date: new Date().toISOString()
      });

      clearInterval(progressInterval);
      setProgress(100);
      setReview(created);
      setRetryCount(0);
    } catch (error) {
      console.error('Review error:', error);
      setError(error.message || 'Failed to generate review. Please try again.');
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => setReviewing(false), 500);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-600/30 text-red-200 border border-red-500/50',
      high: 'bg-red-500/20 text-red-300 border border-red-500/30',
      moderate: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    };
    return colors[severity.toLowerCase()] || colors.low;
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Review & Scoring
          </h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            NOVUS performs a comprehensive review and provides acceptance likelihood scores.
          </p>
        </div>

        {!review && !reviewing && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-cyan-400" />
              </div>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Generate comprehensive research review
              </p>
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4 max-w-md mx-auto">
                  <p className="text-red-300 text-sm mb-2">{error}</p>
                  {retryCount < 3 && (
                    <Button
                      onClick={() => {
                        setRetryCount(retryCount + 1);
                        handleReview();
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                    >
                      Retry ({retryCount + 1}/3)
                    </Button>
                  )}
                </div>
              )}
              <Button
                onClick={handleReview}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={reviewing}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Run Review
              </Button>
            </CardContent>
          </Card>
        )}

        {reviewing && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-6">
                <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                <div className="text-center max-w-md">
                  <p className={`font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    NOVUS Reviewing Research...
                  </p>
                  
                  <div className={`h-2 rounded-full overflow-hidden mb-6 ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                  }`}>
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className={`space-y-2 text-sm text-left ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <motion.p animate={{ opacity: progress > 15 ? 1 : 0.3 }}>
                      {progress > 15 ? '✓' : '→'} Evaluating novelty...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 40 ? 1 : 0.3 }}>
                      {progress > 40 ? '✓' : '→'} Assessing evidence strength...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 65 ? 1 : 0.3 }}>
                      {progress > 65 ? '✓' : '→'} Checking plausibility...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 85 ? 1 : 0.3 }}>
                      {progress > 85 ? '✓' : '→'} Computing acceptance likelihood...
                    </motion.p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {review && !reviewing && (
          <>
            {/* Acceptance Gauge */}
            <Card className={theme === 'dark' 
              ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-500/30' 
              : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'}>
              <CardContent className="p-8 text-center">
                <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Overall Assessment
                </h3>
                <div className="relative w-48 h-48 mx-auto mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="#1e293b" strokeWidth="12" fill="none" />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(review.acceptance_likelihood / 100) * 553} 553`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {review.acceptance_likelihood}%
                    </span>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Acceptance Likelihood
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Scientific Rigor', value: review.scientific_rigor },
                { label: 'Clarity', value: review.clarity },
                { label: 'Impact', value: review.impact },
                { label: 'Novelty', value: review.novelty_score },
                { label: 'Evidence Strength', value: review.evidence_strength },
                { label: 'Publication Readiness', value: review.publication_readiness }
              ].map((metric) => (
                <Card key={metric.label} className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
                  <CardContent className="p-6 text-center">
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {metric.label}
                    </p>
                    <p className={`text-4xl font-bold ${getScoreColor(metric.value)}`}>
                      {metric.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comments */}
            <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
              <CardContent className="p-6">
                <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Review Comments
                </h3>
                <div className="space-y-3">
                  {review.comments?.map((comment, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'
                      }`}
                    >
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(comment.severity)}`}>
                        {comment.severity}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {comment.section}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Suggestions */}
            <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
              <CardContent className="p-6">
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  AI Improvement Suggestions
                </h3>
                <p className={`leading-relaxed whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {review.ai_suggestions}
                </p>
              </CardContent>
            </Card>

            {/* Suggested Reviewers */}
            <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <Users className="w-5 h-5 text-blue-400" />
                    Suggested Peer Reviewers
                  </h3>
                  <Button
                    onClick={suggestReviewers}
                    disabled={loadingReviewers}
                    size="sm"
                    variant="outline"
                    className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}
                  >
                    {loadingReviewers ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finding Experts...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        {suggestedReviewers.length > 0 ? 'Refresh' : 'Find Reviewers'}
                      </>
                    )}
                  </Button>
                </div>

                {suggestedReviewers.length > 0 ? (
                  <div className="space-y-4">
                    {suggestedReviewers.map((reviewer, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-slate-900/50 border-slate-700' 
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {reviewer.name}
                            </h4>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {reviewer.institution}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(reviewer.expertise ?? []).map((exp, i) => (
                            <span
                              key={i}
                              className={`px-2 py-1 rounded text-xs ${
                                theme === 'dark'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                        <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          <strong>Why suitable:</strong> {reviewer.rationale}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          <strong>Recent work:</strong> {reviewer.recent_work}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Click "Find Reviewers" to get AI-suggested peer reviewers based on your paper content and expertise area.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className={`flex justify-between pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
              <Button
                onClick={handleReview}
                variant="outline"
                className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-run Review
              </Button>
              <Button
                onClick={onComplete}
                className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
              >
                Mark Project Complete
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}