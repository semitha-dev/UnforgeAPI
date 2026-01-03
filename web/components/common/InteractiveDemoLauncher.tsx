'use client';

import { useState } from 'react';
import { Play, X } from 'lucide-react';

interface InteractiveDemoLauncherProps {
  className?: string;
}

const InteractiveDemoLauncher = ({ className = '' }: InteractiveDemoLauncherProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          group inline-flex items-center space-x-2
          px-6 py-3 text-base
          bg-card text-primary font-semibold font-cta
          rounded-full border-2 border-border
          hover:border-accent hover:bg-accent/5
          transition-all duration-300
          ${className}
        `}
      >
        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
          <Play className="w-4 h-4 text-accent fill-current" />
        </div>
        <span>Watch Demo</span>
      </button>

      {/* Demo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl mx-4 bg-card rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                  <Play className="w-10 h-10 text-accent fill-current" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-headline text-primary">
                    Demo Coming Soon
                  </h3>
                  <p className="text-text-secondary font-body mt-2">
                    See how UnforgeAPI powers your AI applications
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InteractiveDemoLauncher;
