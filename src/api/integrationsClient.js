import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Keep Firebase initialization local to avoid circular import timing with main.jsx.
const firebaseConfig = {
  apiKey: 'AIzaSyCFkpcxebXpT6idu74dUvypf6GQFaauX_Q',
  authDomain: 'orphanovalabs.firebaseapp.com',
  projectId: 'orphanovalabs',
  storageBucket: 'orphanovalabs.firebasestorage.app',
  messagingSenderId: '788467784982',
  appId: '1:788467784982:web:e25b51a9dbaf49d1424437',
  measurementId: 'G-6BBTX7FY52',
};

function getFunctionsInstance() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFunctions(app, 'us-central1');
}

export const Core = {
  InvokeLLM: async (params) => {
    try {
      const functions = getFunctionsInstance();
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
      } else if (combined.includes('failed-precondition') || combined.includes('anthropic_api_key')) {
        message = 'LLM backend missing ANTHROPIC_API_KEY secret. Set the secret and redeploy functions.';
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
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      const storage = getStorage(app);
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
      const functions = getFunctionsInstance();
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
      const functions = getFunctionsInstance();
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
      const functions = getFunctionsInstance();
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
};