import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link as LinkIcon, FileText, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { Note, StageNote } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '../ThemeContext';

export default function NotesPanel({ projectId, stageId, onClose }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('text');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);

  useEffect(() => {
    loadNotes();
  }, [projectId, stageId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const allNotes = await StageNote.filter({
        project_id: projectId,
        stage_id: stageId
      }, '-created_date');
      setNotes(allNotes);
    } catch (error) {
      console.error('Load notes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddText = async () => {
    if (!textContent.trim()) return;
    
    setSaving(true);
    try {
      await StageNote.create({
        project_id: projectId,
        stage_id: stageId,
        note_type: 'text',
        content: textContent
      });
      setTextContent('');
      await loadNotes();
    } catch (error) {
      console.error('Add text note error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlContent.trim()) return;
    
    setSaving(true);
    try {
      await StageNote.create({
        project_id: projectId,
        stage_id: stageId,
        note_type: 'url',
        content: urlContent
      });
      setUrlContent('');
      await loadNotes();
    } catch (error) {
      console.error('Add URL note error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadProgress(0);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadProgress(100);

      await StageNote.create({
        project_id: projectId,
        stage_id: stageId,
        note_type: type,
        content: `Uploaded: ${file.name}`,
        file_url,
        file_name: file.name
      });

      setTimeout(() => setUploadProgress(null), 1000);
      await loadNotes();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(null);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await StageNote.delete(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Delete note error:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        <Card className={`${
          theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        } shadow-2xl`}>
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
          }`}>
            <h2 className={`text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              📎 Add Notes & Attachments
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-slate-800 text-slate-400' 
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'text', label: 'Text', icon: FileText },
                { id: 'file', label: 'File', icon: Upload },
                { id: 'image', label: 'Image', icon: ImageIcon },
                { id: 'url', label: 'URL', icon: LinkIcon }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === id
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark'
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'text' && (
                <div>
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Add your notes, observations, or comments..."
                    className={`h-32 mb-3 ${
                      theme === 'dark' 
                        ? 'bg-slate-800 border-slate-700 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <Button
                    onClick={handleAddText}
                    disabled={!textContent.trim() || saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Add Note
                  </Button>
                </div>
              )}

              {activeTab === 'file' && (
                <div>
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
                  }`}>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'file')}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.txt,.csv"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className={`w-12 h-12 mx-auto mb-3 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                      }`} />
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                        Click to upload PDF, DOC, TXT, CSV
                      </p>
                    </label>
                  </div>
                  {uploadProgress !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>Uploading...</span>
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>{uploadProgress}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${
                        theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                      }`}>
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'image' && (
                <div>
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
                  }`}>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'image')}
                      className="hidden"
                      id="image-upload"
                      accept="image/*"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <ImageIcon className={`w-12 h-12 mx-auto mb-3 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                      }`} />
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                        Click to upload image (PNG, JPG, SVG)
                      </p>
                    </label>
                  </div>
                  {uploadProgress !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>Uploading...</span>
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>{uploadProgress}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${
                        theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                      }`}>
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'url' && (
                <div>
                  <Input
                    value={urlContent}
                    onChange={(e) => setUrlContent(e.target.value)}
                    placeholder="https://example.com/resource"
                    className={`mb-3 ${
                      theme === 'dark' 
                        ? 'bg-slate-800 border-slate-700 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <Button
                    onClick={handleAddUrl}
                    disabled={!urlContent.trim() || saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Add URL
                  </Button>
                </div>
              )}
            </div>

            {/* Existing Notes */}
            {notes.length > 0 && (
              <div className="mt-8">
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Your Notes ({notes.length})
                </h3>
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {note.note_type === 'text' && <FileText className="w-4 h-4 text-blue-400" />}
                            {note.note_type === 'file' && <Upload className="w-4 h-4 text-green-400" />}
                            {note.note_type === 'image' && <ImageIcon className="w-4 h-4 text-purple-400" />}
                            {note.note_type === 'url' && <LinkIcon className="w-4 h-4 text-cyan-400" />}
                            <span className={`text-xs ${
                              theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                            }`}>
                              {new Date(note.created_date).toLocaleString()}
                            </span>
                          </div>
                          <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                            {note.content}
                          </p>
                          {note.file_url && (
                            <a
                              href={note.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                            >
                              View Attachment →
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' 
                              ? 'hover:bg-slate-700 text-slate-500' 
                              : 'hover:bg-slate-200 text-slate-400'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}