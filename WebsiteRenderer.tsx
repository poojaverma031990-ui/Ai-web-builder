import React, { useEffect, useState } from 'react';
import { GeneratedFile } from '../types';
import * as Icons from 'lucide-react';

export default function WebsiteRenderer({ files }: { files: GeneratedFile[] }) {
  const [srcDoc, setSrcDoc] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!files || files.length === 0) {
      setSrcDoc('');
      return;
    }

    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    files.forEach(f => {
      if (f.name.endsWith('.html')) htmlContent += f.content;
      else if (f.name.endsWith('.css')) cssContent += f.content;
      else if (f.name.endsWith('.js') || f.name.endsWith('.ts')) jsContent += f.content;
    });

    if (!htmlContent) {
      // Fallback if no HTML file but there are other files
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Preview</title>
        </head>
        <body>
          <div id="root"></div>
        </body>
        </html>
      `;
    }

    const injectedHtml = htmlContent
      .replace(/<\/head>/i, `<style>${cssContent}</style></head>`)
      .replace(/<\/body>/i, `<script>${jsContent}</script></body>`);

    setSrcDoc(injectedHtml);
  }, [files]);

  if (!files || files.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-500">
        <div className="text-center p-6">
          <Icons.LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-20 text-zinc-400" />
          <p className="text-lg font-medium text-zinc-300">Your preview will appear here.</p>
          <p className="text-sm mt-2 opacity-60">Generate a website from the Chat tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white flex flex-col">
      <div className="absolute bottom-4 right-4 z-50">
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-2 bg-zinc-900 text-zinc-100 px-3 py-2 rounded-lg shadow-lg hover:bg-zinc-800 transition-colors border border-zinc-700 text-sm font-medium"
        >
          <Icons.RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
      <iframe
        key={refreshKey}
        title="Preview"
        srcDoc={srcDoc}
        className="flex-1 w-full h-full border-0"
        sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
