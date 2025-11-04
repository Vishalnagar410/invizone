'use client';

import { useState, useRef } from 'react';
// @ts-ignore - qrcode.react has no type declarations in this project
import { QRCodeSVG } from 'qrcode.react';
import { Download, X, Printer, Copy } from 'lucide-react';

interface QRGeneratorProps {
  qrData: string;
  chemicalName: string;
  onClose: () => void;
}

export function QRGenerator({ qrData, chemicalName, onClose }: QRGeneratorProps) {
  const [qrSize, setQrSize] = useState(256);
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chemicalName.replace(/\s+/g, '_')}_qr.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      alert('QR data copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy QR data:', error);
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${chemicalName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
            }
            .chemical-info { 
              margin-bottom: 20px; 
            }
            .qr-code { 
              margin: 20px auto; 
            }
          </style>
        </head>
        <body>
          <div class="chemical-info">
            <h1>${chemicalName}</h1>
            <p>Chemical QR Code</p>
          </div>
          <div class="qr-code">
            ${qrRef.current?.innerHTML || ''}
          </div>
          <p>Scan to view chemical details</p>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            QR Code - ${chemicalName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div ref={qrRef} className="mb-4">
              <QRCodeSVG
                value={qrData}
                size={qrSize}
                level="M"
                includeMargin
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center max-w-md">
              Scan this QR code to view complete chemical information including structure, 
              location, and stock details.
            </p>
          </div>

          {/* Size Controls */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              QR Code Size: {qrSize}px
            </label>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={qrSize}
              onChange={(e) => setQrSize(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* QR Data Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              QR Code Data
            </label>
            <div className="relative">
              <pre className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs overflow-x-auto max-h-32">
                {qrData}
              </pre>
              <button
                onClick={copyQRData}
                className="absolute top-2 right-2 p-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                title="Copy QR data"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={downloadQR}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download SVG
            </button>
            
            <button
              onClick={printQR}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}