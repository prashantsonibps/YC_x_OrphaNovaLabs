import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
    console.log('Core.SendEmail() called with params:', params, ' - implement custom logic');
    return { success: true }; // Placeholder
  },
  UploadFile: async (params) => {
    console.log('Core.UploadFile() called with params:', params, ' - implement custom logic');
    return { file_url: 'https://placeholder.com/file.jpg' }; // Placeholder
  },
  GenerateImage: async (params) => {
    console.log('Core.GenerateImage() called with params:', params, ' - implement custom logic');
    return { image_url: 'https://placeholder.com/image.jpg' }; // Placeholder
  },
  ExtractDataFromUploadedFile: async (params) => {
    console.log('Core.ExtractDataFromUploadedFile() called with params:', params, ' - implement custom logic');
    return { extracted_data: 'Placeholder extracted data.' }; // Placeholder
  },
  CreateFileSignedUrl: async (params) => {
    console.log('Core.CreateFileSignedUrl() called with params:', params, ' - implement custom logic');
    return { signed_url: 'https://placeholder.com/signed_url' }; // Placeholder
  },
  UploadPrivateFile: async (params) => {
    console.log('Core.UploadPrivateFile() called with params:', params, ' - implement custom logic');
    return { file_url: 'https://placeholder.com/private_file.jpg' }; // Placeholder
  },
};