'use client';

import { useEffect, useRef } from 'react';

// Add proper TypeScript declarations for Kekule
declare global {
  interface Window {
    Kekule?: any;
  }
}

interface KekuleWrapperProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean) => void;
  height?: number;
  readonly?: boolean;
}

export function KekuleWrapper({ 
  initialSmiles = '', 
  onSmilesChange, 
  height = 400,
  readonly = false 
}: KekuleWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kekuleLoadedRef = useRef(false);
  const composerRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Load Kekule CSS globally once - NO CLEANUP
  useEffect(() => {
    const existingCSS = document.querySelector('link[href*="kekule.css"]');
    if (!existingCSS) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/kekule/themes/default/kekule.css';
      document.head.appendChild(link);
      console.log('✅ Kekule CSS loaded');
    }
    // No cleanup - let stylesheet persist
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const initializeKekule = async () => {
      if (!containerRef.current) return;

      try {
        // Load Kekule if not already loaded
        if (!window.Kekule && !kekuleLoadedRef.current) {
          console.log('🔄 Loading Kekule.js...');
          await import('kekule');
          kekuleLoadedRef.current = true;
          console.log('✅ Kekule.js loaded');
        }

        if (!window.Kekule || !containerRef.current) {
          console.error('❌ Kekule not available');
          return;
        }

        const Kekule = window.Kekule;
        
        // Clear container safely with mount check
        if (containerRef.current && isMountedRef.current) {
          containerRef.current.innerHTML = '';
        }
        
        // Create editor container
        const editorDiv = document.createElement('div');
        editorDiv.style.width = '100%';
        editorDiv.style.height = '100%';
        editorDiv.className = 'kekule-editor-instance';
        
        if (containerRef.current && isMountedRef.current) {
          containerRef.current.appendChild(editorDiv);
        }

        // Initialize editor
        const composer = new Kekule.Editor.Composer(editorDiv);
        composer.setDimension('100%', '100%');
        composer.setEnableToolbar(true);
        composer.setEnableContextMenu(true);
        
        if (readonly) {
          composer.setReadOnly(true);
        }

        composerRef.current = composer;

        // Set up change handler with mount check
        composer.setApplyChangeCallback(() => {
          if (!isMountedRef.current) return;
          
          try {
            const mol = composer.getChemObject();
            if (mol) {
              const smiles = mol.toFormat('smiles');
              console.log('🎨 Structure drawn, SMILES:', smiles);
              onSmilesChange(smiles, smiles.length > 0);
            }
          } catch (error) {
            console.error('Error getting SMILES from Kekule:', error);
            if (isMountedRef.current) {
              onSmilesChange('', false);
            }
          }
        });

        // Load initial SMILES if provided - FIXED VERSION
        if (initialSmiles && initialSmiles.trim() && isMountedRef.current) {
          console.log('🔄 Loading initial SMILES into canvas:', initialSmiles);
          setTimeout(() => {
            if (composerRef.current && isMountedRef.current) {
              try {
                const mol = Kekule.Molecule.readFromFormatData('smiles', initialSmiles);
                if (mol) {
                  composerRef.current.setChemObject(mol);
                  console.log('✅ SMILES loaded into canvas:', initialSmiles);
                }
              } catch (error) {
                console.warn('Could not load initial SMILES into canvas:', error);
              }
            }
          }, 1000);
        }

        console.log('🎉 Kekule editor initialized successfully');

      } catch (error) {
        console.error('❌ Failed to initialize Kekule:', error);
      }
    };

    initializeKekule();

    // Safe cleanup - minimal DOM manipulation
    return () => {
      isMountedRef.current = false;
      composerRef.current = null;
      // Don't clear container - let React handle DOM cleanup
    };
  }, [initialSmiles, onSmilesChange, readonly, height]);

  return (
    <div 
      ref={containerRef} 
      className="border rounded-lg bg-white kekule-editor-container"
      style={{ height: `${height}px`, minHeight: '300px' }}
    />
  );
}