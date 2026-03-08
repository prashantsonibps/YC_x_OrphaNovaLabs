import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Link as LinkIcon, Loader2, Check, Paperclip, Plus, Send } from 'lucide-react';
import { Project } from '@/api/entities';
import { Core } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '../../ThemeContext';
import { FormattedAIText } from '../utils/formatAIResponse';


export default function StageUpload({ project, onComplete, onUpdate }) {
  const { theme } = useTheme();
  const fileInputRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState(project.ai_context_summary || '');
  const [estimatedTime] = useState({ min: 8, max: 10 });
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const { file_url } = await Core.UploadFile({ file });
        setUploadedFiles(prev => [...prev, { name: file.name, url: file_url }]);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  };

  // Real-time countdown
  useEffect(() => {
    if (timeRemaining > 0 && analyzing) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, analyzing]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please enter disease information');
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    setTimeRemaining(estimatedTime.max);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 400);

    try {
      const context = `
Input: ${inputText}
Files: ${uploadedFiles.map(f => f.name).join(', ')}
      `;

      const summary = await Core.InvokeLLM({
        prompt: `Analyze this rare disease research context and provide a comprehensive summary with clear sections:

${context}

Format your response with markdown:
- Use **bold** for key terms
- Use ## for section headings
- Provide: 
  1) Disease Overview
  2) Key Symptoms & Phenotypes
  3) Research Focus Areas
  4) Potential Data Sources

Be detailed and scientific.`,
        add_context_from_internet: true
      });

      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);
      setAiSummary(summary);

      // Extract disease name from first part of input
      const diseaseName = inputText.split(/[,\n]/)[0].trim();

      await Project.update(project.id, {
        disease_name: diseaseName,
        symptoms: inputText,
        context_data: {
          files: uploadedFiles
        },
        ai_context_summary: summary
      });

      onUpdate({
        disease_name: diseaseName,
        symptoms: inputText,
        ai_context_summary: summary
      });

      setRetryCount(0);
    } catch (error) {
      console.error('Analysis error:', error);
      clearInterval(progressInterval);
      setError(error.message || 'Failed to analyze context. Please try again.');
    } finally {
      setTimeout(() => setAnalyzing(false), 500);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 pb-32">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Title */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Upload & Context Setup
          </h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            Provide information about your research focus. NOVUS will analyze and extract key insights.
          </p>
        </div>

        {/* ChatGPT-Style Input */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className={`flex items-center gap-3 p-3 rounded-full shadow-lg ${
            theme === 'dark' ? 'bg-slate-800/90 border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.txt,.doc,.docx,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                theme === 'dark'
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>

            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && inputText.trim() && !analyzing) {
                  handleAnalyze();
                }
              }}
              placeholder="Enter disease name, phenotypes, or links..."
              className={`flex-1 border-0 focus-visible:ring-0 text-base ${
                theme === 'dark' 
                  ? 'bg-transparent text-white placeholder:text-slate-500' 
                  : 'bg-transparent text-slate-900 placeholder:text-slate-400'
              }`}
            />

            <Button
              onClick={handleAnalyze}
              disabled={!inputText.trim() || analyzing}
              size="icon"
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 ml-14">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                  theme === 'dark' ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-slate-100 border border-slate-200 text-slate-700'
                }`}>
                  <Paperclip className="w-3 h-3" />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 ml-14 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm">
              <p className="text-red-300 mb-2">{error}</p>
              {retryCount < 3 && (
                <Button
                  onClick={() => {
                    setRetryCount(retryCount + 1);
                    handleAnalyze();
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
        </div>

        {/* Divider */}
        <div className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`} />

        {/* Bottom Half: AI Analysis Results */}
        <div>
          <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            AI Context Analysis
          </h3>
          
          <Card className={theme === 'dark' 
            ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-500/30' 
            : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'}>
            <CardContent className="p-6">
              {!aiSummary && !analyzing && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className={`text-lg mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Ready to analyze your research context
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Fill in the disease information above and click "Analyze Context"
                  </p>
                </div>
              )}

              {analyzing && (
                <div className="py-16">
                  <div className="flex flex-col items-center gap-6">
                    <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                    <div className="text-center w-full max-w-md">
                      <p className={`font-medium mb-4 text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        NOVUS Analyzing Context...
                      </p>
                      <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        <span className="opacity-60"> ({estimatedTime.min}-{estimatedTime.max}s)</span>
                      </p>
                      
                      {/* Progress Bar */}
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
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: progress > 10 ? 1 : 0.3 }}
                        >
                          {progress > 10 ? '✓' : '→'} Extracting disease entities...
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: progress > 40 ? 1 : 0.3 }}
                        >
                          {progress > 40 ? '✓' : '→'} Analyzing symptom patterns...
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: progress > 70 ? 1 : 0.3 }}
                        >
                          {progress > 70 ? '✓' : '→'} Searching external databases...
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: progress > 90 ? 1 : 0.3 }}
                        >
                          {progress > 90 ? '✓' : '→'} Generating research summary...
                        </motion.p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {aiSummary && !analyzing && (
                <div>
                  <div className={`rounded-lg p-6 mb-4 ${
                    theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'
                  }`}>
                    <FormattedAIText className={`leading-relaxed ${
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                      {aiSummary}
                    </FormattedAIText>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <Check className="w-4 h-4" />
                    Context analyzed successfully
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center justify-end pt-6 border-t ${
          theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
        }`}>
          <Button
            onClick={onComplete}
            disabled={!aiSummary}
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6"
          >
            Approve & Continue to Literature
          </Button>
        </div>
      </div>

    </div>
  );
}