import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BrainCircuit, ArrowRight, Users, Building, GraduationCap, Stethoscope, FlaskConical } from 'lucide-react';

export default function QuestionnaireModal({ open, onOpenChange }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    user_role: '',
    employment_type: '',
    current_work: ''
  });

  const roles = [
    { value: 'Researcher', label: 'Researcher', icon: FlaskConical, description: 'Academic or industry researcher' },
    { value: 'Student', label: 'Student', icon: GraduationCap, description: 'Graduate or undergraduate student' },
    { value: 'Clinician', label: 'Clinician', icon: Stethoscope, description: 'Medical doctor or healthcare provider' },
    { value: 'Other', label: 'Other', icon: Users, description: 'Other professional role' }
  ];

  const employmentTypes = [
    { value: 'Organization', label: 'With an Organization', icon: Building, description: 'University, hospital, or company' },
    { value: 'Self-employed', label: 'Self-employed', icon: Users, description: 'Independent researcher or consultant' }
  ];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.user_role || !formData.employment_type || !formData.current_work.trim()) {
      return;
    }

    // Close the modal
    onOpenChange(false);
    
    // Reset the form and step for next time
    setFormData({
      user_role: '',
      employment_type: '',
      current_work: ''
    });
    setStep(1);
    
    // Open the calendar in a new tab
    window.open('https://calendar.notion.so/meet/prashantsonibps/choose-the-date-and-time--thanks', '_blank');
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.user_role;
      case 2:
        return formData.employment_type;
      case 3:
        return formData.current_work.trim();
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BrainCircuit className="w-8 h-8 text-blue-600" />
            <DialogTitle className="text-2xl font-bold">Welcome to OrphaNova</DialogTitle>
          </div>
          <p className="text-slate-600">Let's personalize your demo experience</p>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i === step
                    ? 'bg-blue-600 text-white'
                    : i < step
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {i < step ? '✓' : i}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="py-6">
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">What best describes your role?</h3>
                <p className="text-slate-600">This helps us customize your demo</p>
              </div>
              
              <RadioGroup
                value={formData.user_role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, user_role: value }))}
                className="grid grid-cols-1 gap-4"
              >
                {roles.map((role) => (
                  <div key={role.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={role.value} id={role.value} />
                    <Label
                      htmlFor={role.value}
                      className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 flex-1"
                    >
                      <role.icon className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-sm text-slate-600">{role.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 2: Employment Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Employment Status</h3>
                <p className="text-slate-600">Are you affiliated with an organization?</p>
              </div>
              
              <RadioGroup
                value={formData.employment_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, employment_type: value }))}
                className="grid grid-cols-1 gap-4"
              >
                {employmentTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Label
                      htmlFor={type.value}
                      className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 flex-1"
                    >
                      <type.icon className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-slate-600">{type.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Current Work */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">What are you working on?</h3>
                <p className="text-slate-600">Tell us about your current research or interests</p>
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="current_work" className="text-base font-medium">
                  Current Research or Project Focus
                </Label>
                <Textarea
                  id="current_work"
                  placeholder="e.g., Investigating novel therapeutic targets for rare genetic disorders, studying biomarkers for early disease detection, developing treatments for orphan diseases..."
                  value={formData.current_work}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_work: e.target.value }))}
                  className="h-32 resize-none"
                />
                <p className="text-sm text-slate-500">
                  This helps us tailor the demo to show you the most relevant features for your work.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className={step === 1 ? 'invisible' : ''}
          >
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid()}
                className="bg-green-600 hover:bg-green-700"
              >
                Book Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}