import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Download, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../ThemeContext';

export default function DiseaseImageGallery({ diseaseName, onAddToDraft }) {
  const { theme } = useTheme();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, [diseaseName]);

  const fetchImages = () => {
    setLoading(true);
    
    // Use specific Unsplash image IDs for scientific/medical content
    const scientificImages = [
      { 
        url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop',
        caption: `Cellular microscopy analysis for ${diseaseName}`
      },
      { 
        url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=600&fit=crop',
        caption: `Laboratory research methodology for ${diseaseName}`
      },
      { 
        url: 'https://images.unsplash.com/photo-1582719471137-c3967ffb1c42?w=800&h=600&fit=crop',
        caption: `Molecular biology visualization of ${diseaseName}`
      },
      { 
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop',
        caption: `Clinical research data for ${diseaseName}`
      }
    ];

    setImages(scientificImages.map((img, idx) => ({
      ...img,
      caption: `Figure ${idx + 1}: ${img.caption}`,
      type: 'web'
    })));
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Loading visualizations for {diseaseName}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
        Scientific visualizations for {diseaseName}
      </p>
      
      <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {images.map((image, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`rounded-lg overflow-hidden border ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-50'
            }`}
          >
            <img 
              src={image.url} 
              alt={image.caption}
              className="w-full h-40 object-cover"
            />
            <div className="p-3">
              <p className={`text-xs mb-3 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {image.caption}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onAddToDraft(image)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add to Draft
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <Button
        onClick={fetchImages}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Reload Images
      </Button>
    </div>
  );
}