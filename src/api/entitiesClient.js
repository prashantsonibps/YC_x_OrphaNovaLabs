let _projects = JSON.parse(localStorage.getItem('mock_projects') || '[]');

const _saveProjects = () => {
  localStorage.setItem('mock_projects', JSON.stringify(_projects));
};

export const entities = {
  WaitlistEntry: {
    list: async (...args) => { console.log("WaitlistEntry.list called with", args); return []; },
    filter: async (...args) => { console.log("WaitlistEntry.filter called with", args); return []; },
    get: async (...args) => { console.log("WaitlistEntry.get called with", args); return null; },
    create: async (...args) => { console.log("WaitlistEntry.create called with", args); return {}; },
    update: async (...args) => { console.log("WaitlistEntry.update called with", args); return {}; },
    delete: async (...args) => { console.log("WaitlistEntry.delete called with", args); return {}; },
  },
  ResearchQuery: {
    list: async (...args) => { console.log("ResearchQuery.list called with", args); return []; },
    filter: async (...args) => { console.log("ResearchQuery.filter called with", args); return []; },
    get: async (...args) => { console.log("ResearchQuery.get called with", args); return null; },
    create: async (...args) => { console.log("ResearchQuery.create called with", args); return {}; },
    update: async (...args) => { console.log("ResearchQuery.update called with", args); return {}; },
    delete: async (...args) => { console.log("ResearchQuery.delete called with", args); return {}; },
  },
  CollaborationPost: {
    list: async (...args) => { console.log("CollaborationPost.list called with", args); return []; },
    filter: async (...args) => { console.log("CollaborationPost.filter called with", args); return []; },
    get: async (...args) => { console.log("CollaborationPost.get called with", args); return null; },
    create: async (...args) => { console.log("CollaborationPost.create called with", args); return {}; },
    update: async (...args) => { console.log("CollaborationPost.update called with", args); return {}; },
    delete: async (...args) => { console.log("CollaborationPost.delete called with", args); return {}; },
  },
  ConnectionRequest: {
    list: async (...args) => { console.log("ConnectionRequest.list called with", args); return []; },
    filter: async (...args) => { console.log("ConnectionRequest.filter called with", args); return []; },
    get: async (...args) => { console.log("ConnectionRequest.get called with", args); return null; },
    create: async (...args) => { console.log("ConnectionRequest.create called with", args); return {}; },
    update: async (...args) => { console.log("ConnectionRequest.update called with", args); return {}; },
    delete: async (...args) => { console.log("ConnectionRequest.delete called with", args); return {}; },
  },
  IntegrationSuggestion: {
    list: async (...args) => { console.log("IntegrationSuggestion.list called with", args); return []; },
    filter: async (...args) => { console.log("IntegrationSuggestion.filter called with", args); return []; },
    get: async (...args) => { console.log("IntegrationSuggestion.get called with", args); return null; },
    create: async (...args) => { console.log("IntegrationSuggestion.create called with", args); return {}; },
    update: async (...args) => { console.log("IntegrationSuggestion.update called with", args); return {}; },
    delete: async (...args) => { console.log("IntegrationSuggestion.delete called with", args); return {}; },
  },
  Project: {
    list: async () => {
      console.log('Project.list() called');
      return _projects;
    },
    filter: async (query = {}, orderBy = '-created_date', limit = 100) => {
      console.log('Project.filter() called with query:', query);
      let filtered = _projects.filter(p => {
        for (const key in query) {
          if (p[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
      // Simple sorting (only for created_date for now)
      if (orderBy === '-created_date') {
        filtered.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      }
      return filtered.slice(0, limit);
    },
    get: async (id) => {
      console.log('Project.get() called for id:', id);
      return _projects.find(p => p.id === id) || null;
    },
    create: async (data) => {
      const newProject = {
        id: Math.random().toString(36).substring(2, 15),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data
      };
      _projects.push(newProject);
      _saveProjects();
      console.log('Project.create() called, new project:', newProject);
      return newProject;
    },
    update: async (id, data) => {
      const index = _projects.findIndex(p => p.id === id);
      if (index > -1) {
        _projects[index] = { ..._projects[index], ...data, updated_date: new Date().toISOString() };
        _saveProjects();
        console.log('Project.update() called, updated project:', _projects[index]);
        return _projects[index];
      }
      return null;
    },
    delete: async (id) => {
      _projects = _projects.filter(p => p.id !== id);
      _saveProjects();
      console.log('Project.delete() called for id:', id);
      return { id };
    },
  },
  Literature: {
    list: async (...args) => { console.log("Literature.list called with", args); return []; },
    filter: async (...args) => { console.log("Literature.filter called with", args); return []; },
    get: async (...args) => { console.log("Literature.get called with", args); return null; },
    create: async (...args) => { console.log("Literature.create called with", args); return {}; },
    update: async (...args) => { console.log("Literature.update called with", args); return {}; },
    delete: async (...args) => { console.log("Literature.delete called with", args); return {}; },
  },
  Relation: {
    list: async (...args) => { console.log("Relation.list called with", args); return []; },
    filter: async (...args) => { console.log("Relation.filter called with", args); return []; },
    get: async (...args) => { console.log("Relation.get called with", args); return null; },
    create: async (...args) => { console.log("Relation.create called with", args); return {}; },
    update: async (...args) => { console.log("Relation.update called with", args); return {}; },
    delete: async (...args) => { console.log("Relation.delete called with", args); return {}; },
  },
  Hypothesis: {
    list: async (...args) => { console.log("Hypothesis.list called with", args); return []; },
    filter: async (...args) => { console.log("Hypothesis.filter called with", args); return []; },
    get: async (...args) => { console.log("Hypothesis.get called with", args); return null; },
    create: async (...args) => { console.log("Hypothesis.create called with", args); return {}; },
    update: async (...args) => { console.log("Hypothesis.update called with", args); return {}; },
    delete: async (...args) => { console.log("Hypothesis.delete called with", args); return {}; },
  },
  Experiment: {
    list: async (...args) => { console.log("Experiment.list called with", args); return []; },
    filter: async (...args) => { console.log("Experiment.filter called with", args); return []; },
    get: async (...args) => { console.log("Experiment.get called with", args); return null; },
    create: async (...args) => { console.log("Experiment.create called with", args); return {}; },
    update: async (...args) => { console.log("Experiment.update called with", args); return {}; },
    delete: async (...args) => { console.log("Experiment.delete called with", args); return {}; },
  },
  Review: {
    list: async (...args) => { console.log("Review.list called with", args); return []; },
    filter: async (...args) => { console.log("Review.filter called with", args); return []; },
    get: async (...args) => { console.log("Review.get called with", args); return null; },
    create: async (...args) => { console.log("Review.create called with", args); return {}; },
    update: async (...args) => { console.log("Review.update called with", args); return {}; },
    delete: async (...args) => { console.log("Review.delete called with", args); return {}; },
  },
  Draft: {
    list: async (...args) => { console.log("Draft.list called with", args); return []; },
    filter: async (...args) => { console.log("Draft.filter called with", args); return []; },
    get: async (...args) => { console.log("Draft.get called with", args); return null; },
    create: async (...args) => { console.log("Draft.create called with", args); return {}; },
    update: async (...args) => { console.log("Draft.update called with", args); return {}; },
    delete: async (...args) => { console.log("Draft.delete called with", args); return {}; },
  },
  StageNote: {
    list: async (...args) => { console.log("StageNote.list called with", args); return []; },
    filter: async (...args) => { console.log("StageNote.filter called with", args); return []; },
    get: async (...args) => { console.log("StageNote.get called with", args); return null; },
    create: async (...args) => { console.log("StageNote.create called with", args); return {}; },
    update: async (...args) => { console.log("StageNote.update called with", args); return {}; },
    delete: async (...args) => { console.log("StageNote.delete called with", args); return {}; },
  },
  Note: {
    list: async (...args) => { console.log("Note.list called with", args); return []; },
    filter: async (...args) => { console.log("Note.filter called with", args); return []; },
    get: async (...args) => { console.log("Note.get called with", args); return null; },
    create: async (...args) => { console.log("Note.create called with", args); return {}; },
    update: async (...args) => { console.log("Note.update called with", args); return {}; },
    delete: async (...args) => { console.log("Note.delete called with", args); return {}; },
  },
  Notification: {
    list: async (...args) => { console.log("Notification.list called with", args); return []; },
    filter: async (...args) => { console.log("Notification.filter called with", args); return []; },
    get: async (...args) => { console.log("Notification.get called with", args); return null; },
    create: async (...args) => { console.log("Notification.create called with", args); return {}; },
    update: async (...args) => { console.log("Notification.update called with", args); return {}; },
    delete: async (...args) => { console.log("Notification.delete called with", args); return {}; },
  },
  NotificationRead: {
    list: async (...args) => { console.log("NotificationRead.list called with", args); return []; },
    filter: async (...args) => { console.log("NotificationRead.filter called with", args); return []; },
    get: async (...args) => { console.log("NotificationRead.get called with", args); return null; },
    create: async (...args) => { console.log("NotificationRead.create called with", args); return {}; },
    update: async (...args) => { console.log("NotificationRead.update called with", args); return {}; },
    delete: async (...args) => { console.log("NotificationRead.delete called with", args); return {}; },
  },
   User: {
    list: async (...args) => { console.log("User.list called with", args); return []; },
    filter: async (...args) => { console.log("User.filter called with", args); return []; },
    get: async (...args) => { console.log("User.get called with", args); return null; },
    create: async (...args) => { console.log("User.create called with", args); return {}; },
    update: async (...args) => { console.log("User.update called with", args); return {}; },
    delete: async (...args) => { console.log("User.delete called with", args); return {}; },
  },
};
