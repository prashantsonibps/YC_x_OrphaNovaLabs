
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WaitlistEntry } from '@/api/entities';
import { Mail, CheckCircle, Sparkles } from 'lucide-react';

export default function WaitlistModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    organization: '',
    research_focus: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await WaitlistEntry.create(formData);
      setIsSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setIsSubmitted(false);
        setFormData({ email: '', full_name: '', organization: '', research_focus: '' });
      }, 3000);
    } catch (error) {
      console.error('Error submitting waitlist:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Welcome to the Future!</h3>
            <p className="text-slate-600 mb-4">
              You're now on the OrphaNova waitlist. We'll notify you when early access becomes available.
            </p>
            <div className="text-sm text-slate-500">
              This dialog will close automatically...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Join the OrphaNova Waitlist
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Dr. Jane Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="jane@university.edu"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="organization">Institution/Organization</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
              placeholder="Harvard Medical School"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="research_focus">Research Focus</Label>
            <Textarea
              id="research_focus"
              value={formData.research_focus}
              onChange={(e) => setFormData(prev => ({ ...prev, research_focus: e.target.value }))}
              placeholder="Describe your primary areas of research interest..."
              rows={3}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Joining Waitlist...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-3" />
                Join Waitlist
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
