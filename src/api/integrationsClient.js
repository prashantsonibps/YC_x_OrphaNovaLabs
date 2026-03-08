import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebase_app } from '../main.jsx';

const functions = getFunctions(firebase_app, 'us-central1');
const invokeLLMCallable = httpsCallable(functions, 'invokeLLM');

export const Core = {
  InvokeLLM: async (params) => {
    try {
      const { data } = await invokeLLMCallable(params || {});
      return data;
    } catch (error) {
      const message = error?.message || 'InvokeLLM failed';
      console.error('Core.InvokeLLM() error:', message);
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