# NOVUS AI Assistant - Complete Guide

## 🚀 Overview

NOVUS is now your **Central Command Hub** for the entire research workflow. It replaces the floating "Wanna add something?" buttons and provides intelligent control over all stages.

---

## ✅ What Was Changed

### **Removed:**
- ❌ `AddNotesInput` floating buttons from all stages
- ❌ Manual "Generate" / "Search" / "Extract" buttons (controlled via NOVUS now)

### **Added:**
- ✅ **Enhanced NOVUS Assistant** (`NovusAssistantEnhanced.jsx`)
- ✅ File/image upload directly in NOVUS chat
- ✅ Natural language command detection
- ✅ Stage action triggers
- ✅ Smart stage transition validation
- ✅ Automatic requirement checking

---

## 💡 How Users Interact with NOVUS

### **Upload Files & Notes**
```
User: "Upload a research paper"
NOVUS: [Opens file picker, uploads, saves to project]

User: "Add a note about this finding"
NOVUS: [Saves note with context to current stage]
```

### **Search & Refine Literature**
```
User: "Search for papers about progeria treatment"
NOVUS: 🔍 Starting literature search...
       ✅ Found 10 papers! Review and select.

User: "Show only papers after 2020"
NOVUS: 🔄 Refining search...
       ✅ Filtered results ready!
```

### **Extract Evidence**
```
User: "Extract relationships"
NOVUS: 🧬 Extracting from selected papers...
       ✅ Found 15 relationships! Validate each one.
```

### **Generate Hypotheses**
```
User: "Generate hypotheses"
NOVUS: 💡 Generating research hypotheses...
       ✅ Created 6 hypotheses! Review and approve.
```

### **Design Experiments**
```
User: "Design experiments"
NOVUS: 🔬 Designing validation protocols...
       ✅ 5 experiments ready! Run AI simulations or add results.
```

### **Move to Next Stage**
```
User: "Next stage"
NOVUS: ⚠️ Cannot move yet. You need to validate at least 1 relationship.

[After validation]
User: "Move forward"
NOVUS: ✅ Stage 2 Complete! Validated 12 relationships.
       Ready to move to Hypothesis Generation?
       🚀 Moving to Hypothesis Generation...
```

---

## 🧠 Smart Features

### **1. Intent Detection**
NOVUS automatically understands:
- "search for papers" → Triggers literature search
- "extract evidence" → Runs evidence extraction
- "upload file" → Opens file picker
- "next stage" → Validates & transitions

### **2. Context Awareness**
- Knows current stage and project state
- Provides stage-specific suggestions
- Remembers conversation history

### **3. Validation & Safety**
Before moving stages, NOVUS checks:
- Upload: Has context been analyzed?
- Literature: Are papers selected?
- Evidence: Are relationships validated?
- Hypothesis: Are hypotheses approved?
- Experiments: Are all experiments rated?
- Review: Has review been run?

### **4. Two Modes**
- **Chat Mode**: Active Q&A and commands
- **Watch Mode**: Proactive suggestions when idle (30s)

---

## 🔧 Technical Implementation

### **File Structure**
```
components/lab/
├── NovusAssistantEnhanced.jsx  ← Main NOVUS component
├── NovusAssistant.jsx          ← Old version (kept for reference)
└── AddNotesInput.jsx           ← Deprecated (removed from stages)
```

### **Key Functions**

#### `detectIntent(message)`
Analyzes user input and returns action type:
- `upload` - File upload request
- `search_literature` - Search for papers
- `refine_search` - Filter existing results
- `extract_evidence` - Extract relationships
- `generate_hypotheses` - Create hypotheses
- `design_experiments` - Design protocols
- `run_review` - Run comprehensive review
- `generate_draft` - Create paper draft
- `next_stage` - Move to next stage
- `question` - General Q&A

#### `handleActionCommand(intent, message)`
Executes the detected action:
1. Shows progress message
2. Triggers stage action via `onStageAction`
3. Shows completion message

#### `checkStageRequirements()`
Validates if user can proceed:
```javascript
{
  canProceed: true/false,
  reason: "Why user cannot proceed",
  suggestion: "What they should do",
  summary: "What they've accomplished"
}
```

### **Props**
```javascript
<NovusAssistant
  project={currentProject}
  currentStage={0-6}
  isOpen={boolean}
  onToggle={(open) => {}}
  width={384}
  onWidthChange={(width) => {}}
  onStageAction={(action, params) => {}}
  onStageTransition={(newStage) => {}}
/>
```

---

## 📋 Supported Commands

### **General**
- "Help" / "What can you do?"
- "Explain this stage"
- "What's next?"

### **File Management**
- "Upload file"
- "Upload image"
- "Add note"
- "Attach document"

### **Stage Actions**
- "Search for papers about X"
- "Find literature"
- "Refine search"
- "Extract evidence"
- "Generate hypotheses"
- "Design experiments"
- "Run AI experiment"
- "Run review"
- "Generate draft"

### **Navigation**
- "Next stage"
- "Move forward"
- "Continue"
- "Go to next step"

---

## 🎯 User Experience Flow

1. **User opens NOVUS** → Welcome message with capabilities
2. **User types command** → Intent detected automatically
3. **NOVUS executes** → Shows progress in chat
4. **Action completes** → Updates main stage UI
5. **NOVUS confirms** → Provides next steps
6. **User validates** → Reviews generated content
7. **User asks to continue** → NOVUS checks requirements
8. **Stage transition** → Automatic with summary

---

## 🔮 Future Enhancements

### **Planned:**
- Voice commands
- Multi-file batch upload with drag & drop in chat
- Conversation export
- Suggested actions based on stage progress
- Integration with external tools (Zotero, Mendeley)

### **Possible:**
- Real-time collaboration (multiple users)
- Custom workflows
- API integrations (PubMed, ClinicalTrials.gov)

---

## 🐛 Debugging

### **If NOVUS doesn't respond:**
1. Check browser console for errors
2. Verify `onStageAction` is passed as prop
3. Ensure LLM integration is working

### **If actions don't trigger:**
1. Check `window.dispatchEvent` in `handleStageAction`
2. Verify stage components listen to `novus-action` events
3. Test with simple commands first

### **If transitions fail:**
1. Check `checkStageRequirements` logic
2. Verify entity data is saved correctly
3. Look for validation errors in console

---

## 📊 Metrics & Analytics

Track:
- Commands used per session
- Most common intents
- Stage completion time
- User satisfaction (thumbs up/down)
- Error rate per command type

---

## ✨ Best Practices

### **For Users:**
- Be specific: "Search for papers about X" vs "Search"
- Ask for help: "What should I do now?"
- Use natural language: "Can you find more papers?"

### **For Developers:**
- Keep intent detection simple and robust
- Provide clear error messages
- Always validate before state changes
- Test edge cases (empty data, API failures)

---

## 🎉 Summary

NOVUS is now a **true AI co-pilot** that:
- ✅ Handles all file uploads
- ✅ Controls stage actions
- ✅ Validates transitions
- ✅ Provides intelligent guidance
- ✅ Learns from context

**No more manual buttons - just chat with NOVUS!** 🚀