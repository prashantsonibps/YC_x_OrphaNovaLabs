import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '@/firebase';

export const Core = {
  InvokeLLM: async (params) => {
    try {
      const invokeLLMCallable = httpsCallable(functions, 'invokeLLM');
      const { data } = await invokeLLMCallable(params || {});
      return data;
    } catch (error) {
      const rawMessage = error?.message || '';
      const code = error?.code || '';
      const detailsRaw = error?.details;
      const details = typeof detailsRaw === 'string'
        ? detailsRaw
        : (detailsRaw?.providerMessage || '');
      const combined = `${code} ${rawMessage} ${details}`.toLowerCase();

      let message = rawMessage || 'InvokeLLM failed';
      if (combined.includes('not-found') || combined.includes('404')) {
        message = 'LLM backend not found. Deploy Firebase function "invokeLLM" to project orphanovalabs.';
      } else if (combined.includes('failed-precondition') || combined.includes('gemini_api_key')) {
        message = 'LLM backend missing GEMINI_API_KEY. Set it in functions/.env and redeploy.';
      } else if (combined.includes('internal')) {
        message = 'LLM backend internal error. Check Firebase Functions logs for invokeLLM.';
      }

      console.error('Core.InvokeLLM() error:', { code, rawMessage, details });
      throw new Error(message);
    }
  },
  SendEmail: async (params) => {
    throw new Error('Email sending requires a configured email provider (SendGrid, Resend, etc.).');
  },
  UploadFile: async (params) => {
    const { file } = params || {};
    if (!file) throw new Error('No file provided to UploadFile.');
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `uploads/${timestamp}_${safeName}`);
      await uploadBytes(storageRef, file);
      const file_url = await getDownloadURL(storageRef);
      return { file_url };
    } catch (error) {
      console.error('Core.UploadFile() error:', error);
      throw new Error('File upload failed: ' + (error.message || 'Unknown error'));
    }
  },
  GenerateImage: async (params) => {
    throw new Error('Image generation requires a configured provider (DALL-E, Stability AI, etc.).');
  },
  ExtractDataFromUploadedFile: async (params) => {
    throw new Error('File data extraction requires a configured document parsing service.');
  },
  CreateFileSignedUrl: async (params) => {
    throw new Error('Signed URL generation requires Firebase Storage or equivalent configured.');
  },
  UploadPrivateFile: async (params) => {
    throw new Error('Private file upload requires Firebase Storage or equivalent configured.');
  },
  RunAlphaFold: async (params) => {
    try {
      const callable = httpsCallable(functions, 'runAlphaFold', { timeout: 540000 });
      const { data } = await callable(params || {});
      return data;
    } catch (error) {
      const rawMessage = error?.message || '';
      const code = error?.code || '';
      console.error('Core.RunAlphaFold() error:', { code, rawMessage });
      throw new Error(rawMessage || 'AlphaFold prediction failed');
    }
  },
  ScreenDrugs: async (params) => {
    try {
      const callable = httpsCallable(functions, 'screenDrugsModal', { timeout: 300000 });
      const { data } = await callable(params || {});
      return data;
    } catch (error) {
      const rawMessage = error?.message || '';
      const code = error?.code || '';
      console.error('Core.ScreenDrugs() error:', { code, rawMessage });
      throw new Error(rawMessage || 'Drug screening failed');
    }
  },
  RunExperiment: async (params) => {
    try {
      const callable = httpsCallable(functions, 'runExperiment', { timeout: 540000 });
      const { data } = await callable(params || {});
      return data;
    } catch (error) {
      const rawMessage = error?.message || '';
      const code = error?.code || '';
      console.error('Core.RunExperiment() error:', { code, rawMessage });
      throw new Error(rawMessage || 'RunExperiment failed');
    }
  },
  GetAdminProjects: async () => {
    try {
      const callable = httpsCallable(functions, 'getAdminProjects', { timeout: 120000 });
      const { data } = await callable({});
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server.');
      }
      return {
        users: Array.isArray(data.users) ? data.users : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
      };
    } catch (error) {
      const rawMessage = error?.message || '';
      const code = error?.code || '';
      const combined = `${code} ${rawMessage}`.toLowerCase();
      let message = rawMessage || 'Failed to load admin data.';
      if (combined.includes('permission-denied') || combined.includes('admin only')) {
        message = 'Admin only. You do not have permission to view all projects.';
      } else if (combined.includes('unauthenticated')) {
        message = 'Please sign in to view admin data.';
      } else if (combined.includes('internal') || combined.includes('timeout')) {
        message = 'Server error or timeout. Try again in a moment.';
      }
      console.error('Core.GetAdminProjects() error:', { code, rawMessage });
      throw new Error(message);
    }
  },
  AdminUpdateProject: async (params) => {
    try {
      const { uid, projectId, data } = params || {};
      if (!uid || !projectId || !data) {
        throw new Error('uid, projectId, and data are required.');
      }
      const callable = httpsCallable(functions, 'adminUpdateProject');
      const res = await callable({ uid, projectId, data });
      return res?.data ?? { ok: true };
    } catch (error) {
      const rawMessage = error?.message || '';
      const code = error?.code || '';
      const combined = `${code} ${rawMessage}`.toLowerCase();
      let message = rawMessage || 'Failed to update project.';
      if (combined.includes('permission-denied') || combined.includes('admin only')) {
        message = 'Admin only. You cannot update this project.';
      } else if (combined.includes('not-found')) {
        message = 'Project not found. It may have been deleted.';
      } else if (combined.includes('unauthenticated')) {
        message = 'Please sign in to perform this action.';
      }
      console.error('Core.AdminUpdateProject() error:', { code, rawMessage });
      throw new Error(message);
    }
  },
};
