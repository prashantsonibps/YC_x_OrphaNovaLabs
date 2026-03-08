function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function safeSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// Migrate legacy storage key
(function migrateProjectsKey() {
  const OLD = 'mock_projects', NEW = 'orphanova_projects';
  const old = safeGet(OLD);
  if (old.length > 0 && safeGet(NEW).length === 0) {
    safeSet(NEW, old);
    try { localStorage.removeItem(OLD); } catch {}
  }
})();

function makeEntity(storageKey) {
  let _items = safeGet(storageKey);

  const save = () => safeSet(storageKey, _items);

  return {
    list: async () => _items,

    filter: async (query = {}, orderBy = '-created_date', limit = 100) => {
      let filtered = _items.filter(item => {
        for (const key in query) {
          if (item[key] !== query[key]) return false;
        }
        return true;
      });
      if (orderBy === '-created_date') {
        filtered.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      } else if (orderBy === '-updated_date') {
        filtered.sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));
      }
      return filtered.slice(0, limit);
    },

    get: async (id) => _items.find(item => item.id === id) || null,

    create: async (data) => {
      const newItem = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data,
      };
      _items.push(newItem);
      save();
      return newItem;
    },

    update: async (id, data) => {
      const idx = _items.findIndex(item => item.id === id);
      if (idx > -1) {
        _items[idx] = { ..._items[idx], ...data, updated_date: new Date().toISOString() };
        save();
        return _items[idx];
      }
      return null;
    },

    delete: async (id) => {
      _items = _items.filter(item => item.id !== id);
      save();
      return { id };
    },
  };
}

export const entities = {
  WaitlistEntry:         makeEntity('orphanova_waitlist_entries'),
  ResearchQuery:         makeEntity('orphanova_research_queries'),
  CollaborationPost:     makeEntity('orphanova_collaboration_posts'),
  ConnectionRequest:     makeEntity('orphanova_connection_requests'),
  IntegrationSuggestion: makeEntity('orphanova_integration_suggestions'),
  Project:               makeEntity('orphanova_projects'),
  Literature:            makeEntity('orphanova_literature'),
  Relation:              makeEntity('orphanova_relations'),
  Hypothesis:            makeEntity('orphanova_hypotheses'),
  Experiment:            makeEntity('orphanova_experiments'),
  Review:                makeEntity('orphanova_reviews'),
  Draft:                 makeEntity('orphanova_drafts'),
  StageNote:             makeEntity('orphanova_stage_notes'),
  Note:                  makeEntity('orphanova_notes'),
  Notification:          makeEntity('orphanova_notifications'),
  NotificationRead:      makeEntity('orphanova_notification_reads'),
  User:                  makeEntity('orphanova_users'),
};
