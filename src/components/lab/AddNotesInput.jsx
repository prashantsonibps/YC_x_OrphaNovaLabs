import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, X, Paperclip, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '../ThemeContext';

/**
 * ChatGPT-style floating notes input
 * Fixed to bottom of stage with expandable input
 */
export default function AddNotesInput({ projectId, stageId, onNoteSaved }) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setAttachments(prev => [...prev, { 
          name: file.name, 
          url: file_url,
          type: file.type.startsWith('image/') ? 'image' : 'file'
        }]);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!noteText.trim() && attachments.length === 0) return;

    try {
      // Save as a note entity (we'll create this)
      await base44.entities.Note?.create({
        project_id: projectId,
        stage_id: stageId,
        content: noteText,
        attachments: attachments,
        created_at: new Date().toISOString()
      });

      setNoteText('');
      setAttachments([]);
      setIsExpanded(false);
      
      if (onNoteSaved) onNoteSaved();
    } catch (error) {
      console.error('Save error:', error);
      // Fallback: just clear and notify
      setNoteText('');
      setAttachments([]);
      setIsExpanded(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30" style={{ width: 'calc(100% - 400px)', maxWidth: '800px' }}>
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`rounded-2xl shadow-2xl backdrop-blur-xl border ${
              theme === 'dark'
                ? 'bg-slate-900/95 border-slate-700'
                : 'bg-white/95 border-slate-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Add Note
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className={`p-1 rounded hover:bg-slate-700 transition-colors ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Area */}
            <div className="p-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add your thoughts, observations, or questions..."
                className={`w-full h-24 px-3 py-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                autoFocus
              />

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                        theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {att.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                      <span className="max-w-[120px] truncate">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <label className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                      : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}>
                    <Paperclip className="w-4 h-4" />
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                  </label>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!noteText.trim() && attachments.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  Save Note
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setIsExpanded(true)}
            className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border transition-all hover:scale-105 ${
              theme === 'dark'
                ? 'bg-slate-900/95 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-white/95 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Wanna add something?</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}