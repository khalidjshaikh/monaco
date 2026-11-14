import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { javaFiles } from './javaFiles';
import FileTree, { ancestorsOf } from './FileTree';
import { registerRazorLanguage } from './razorLanguage';

function languageFor(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  const map: Record<string, string> = {
    java: 'java', kt: 'kotlin', kts: 'kotlin', scala: 'scala',
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', xml: 'xml', html: 'html', htm: 'html', css: 'css', scss: 'scss',
    md: 'markdown', yml: 'yaml', yaml: 'yaml', properties: 'properties',
    sh: 'shell', bash: 'shell', py: 'python', rb: 'ruby', go: 'go',
    c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp',
    razor: 'razor', cshtml: 'razor',
    sql: 'sql', txt: 'plaintext', gradle: 'groovy', groovy: 'groovy',
    pom: 'xml',
  };
  return map[ext] || 'plaintext';
}

const SIDEBAR_KEY = 'monaco.sidebarWidth';
const COLLAPSED_KEY = 'monaco.collapsedFolders';

export default function App() {
  const [fileIndex, setFileIndex] = useState(0);
  const [currentLine, setCurrentLine] = useState(0);
  const [phase, setPhase] = useState<'pauseStart' | 'running' | 'pauseEnd'>('pauseStart');
  const [isPlaying, setIsPlaying] = useState(true);
  const editorRef = useRef<any>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem(SIDEBAR_KEY));
    return Number.isFinite(v) && v > 0 ? v : 280;
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const [search, setSearch] = useState('');
  const [resizing, setResizing] = useState(false);

  const file = javaFiles[fileIndex] ?? { name: '(no files)', content: '' };
  const lines = (file.content || '').split('\n');
  const currentPath = file.name;

  // Persist sidebar width.
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  // Persist collapsed folders.
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(collapsed)));
  }, [collapsed]);

  // Resize handling.
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      setSidebarWidth(Math.min(500, Math.max(180, e.clientX)));
    };
    const onUp = () => setResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  // Auto-expand ancestors of current file.
  useEffect(() => {
    const anc = ancestorsOf(currentPath);
    if (anc.length === 0) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const a of anc) {
        if (next.has(a)) {
          next.delete(a);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentPath]);

  // Reset on file change.
  useEffect(() => {
    setCurrentLine(0);
    setPhase('pauseStart');
  }, [fileIndex]);

  // Load file content into editor when file changes.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const model = ed.getModel();
      if (model && model.getValue() !== file.content) {
        ed.setValue(file.content);
      }
    } catch {
      // ignore
    }
  }, [fileIndex, file.content]);

  // Main animation state machine.
  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;

    if (phase === 'pauseStart') {
      const t = setTimeout(() => {
        if (cancelled) return;
        setCurrentLine(1);
        setPhase('running');
      }, 2000);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    if (phase === 'running') {
      if (currentLine === 0) return;
      if (currentLine < lines.length) {
        const t = setTimeout(() => {
          if (cancelled) return;
          setCurrentLine((l) => l + 1);
        }, 200);
        return () => {
          cancelled = true;
          clearTimeout(t);
        };
      }
      setPhase('pauseEnd');
      return;
    }

    if (phase === 'pauseEnd') {
      const t = setTimeout(() => {
        if (cancelled) return;
        setFileIndex((i) => (javaFiles.length ? (i + 1) % javaFiles.length : 0));
      }, 4000);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
  }, [phase, currentLine, lines.length, fileIndex, isPlaying]);

  // Highlight / scroll to current line.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || currentLine <= 0) return;
    try {
      ed.setPosition({ lineNumber: currentLine, column: 1 });
      ed.focus();
      setTimeout(() => {
        try {
          ed.revealLineInCenterIfOutsideViewport(currentLine);
          ed.revealLine(currentLine);
          ed.revealLineInCenter(currentLine);
        } catch {
          // ignore
        }
      }, 0);
    } catch {
      // ignore
    }
  }, [currentLine]);

  const handleToggle = (folderPath: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const handleSelect = (idx: number) => {
    if (idx < 0 || idx >= javaFiles.length) return;
    setFileIndex(idx);
  };

  if (javaFiles.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace' }}>
        No files found. Run with a directory containing files.
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'row', background: '#1e1e1e', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div
        style={{
          width: sidebarWidth,
          minWidth: 180,
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          background: '#252526',
          borderRight: '1px solid #3c3c3c',
          color: '#d4d4d4',
          fontFamily: 'monospace',
          fontSize: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #3c3c3c', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#9cdcfe' }}>Files</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>{javaFiles.length}</span>
        </div>
        <div style={{ padding: '6px 8px', borderBottom: '1px solid #3c3c3c' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '4px 6px',
              background: '#1e1e1e',
              color: '#d4d4d4',
              border: '1px solid #3c3c3c',
              borderRadius: 3,
              fontFamily: 'monospace',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <FileTree
            files={javaFiles}
            currentPath={currentPath}
            collapsed={collapsed}
            onToggle={handleToggle}
            onSelect={handleSelect}
            search={search}
          />
        </div>
      </div>

      {/* Resizer */}
      <div
        onMouseDown={() => setResizing(true)}
        style={{
          width: 4,
          cursor: 'col-resize',
          background: resizing ? '#007acc' : 'transparent',
          flexShrink: 0,
        }}
        title="Drag to resize"
      />

      {/* Editor area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '8px 16px',
            color: '#d4d4d4',
            background: '#252526',
            borderBottom: '1px solid #3c3c3c',
            fontFamily: 'monospace',
            fontSize: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name} &nbsp;|&nbsp; file {fileIndex + 1} / {javaFiles.length}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span>
              line {currentLine || '-'} / {lines.length} &nbsp; (200ms/line) &nbsp;
              {phase === 'pauseStart' && 'start pause 2s'}
              {phase === 'pauseEnd' && 'end pause 4s'}
            </span>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              style={{
                background: '#3c3c3c',
                color: '#d4d4d4',
                border: '1px solid #555',
                borderRadius: 3,
                padding: '2px 8px',
                fontFamily: 'monospace',
                fontSize: 12,
                cursor: 'pointer',
              }}
              title={isPlaying ? 'Pause cycling' : 'Resume cycling'}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            language={languageFor(file.name)}
            theme="vs-dark"
            beforeMount={registerRazorLanguage}
            onMount={(editor) => {
              editorRef.current = editor;
              try {
                editor.setValue(file.content);
              } catch {
                // ignore
              }
            }}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'off',
            }}
          />
        </div>
      </div>
    </div>
  );
}
