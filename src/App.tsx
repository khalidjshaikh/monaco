import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { javaFiles } from './javaFiles';

export default function App() {
  const [fileIndex, setFileIndex] = useState(0);
  const [currentLine, setCurrentLine] = useState(0); // 0 = none (pause)
  const [phase, setPhase] = useState<'pauseStart' | 'running' | 'pauseEnd'>('pauseStart');
  const editorRef = useRef<any>(null);

  const file = javaFiles[fileIndex];
  const lines = file.content.split('\n');

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
    let cancelled = false;

    if (phase === 'pauseStart') {
      // Show full code for 2s before starting.
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
      // Finished all lines -> pause at end.
      setPhase('pauseEnd');
      return;
    }

    if (phase === 'pauseEnd') {
      const t = setTimeout(() => {
        if (cancelled) return;
        setFileIndex((i) => (i + 1) % javaFiles.length);
      }, 4000);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
  }, [phase, currentLine, lines.length, fileIndex]);

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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
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
        }}
      >
        <span>
          {file.name} &nbsp;|&nbsp; file {fileIndex + 1} / {javaFiles.length}
        </span>
        <span>
          line {currentLine || '-'} / {lines.length} &nbsp; (200ms/line) &nbsp;
          {phase === 'pauseStart' && 'start pause 2s'}
          {phase === 'pauseEnd' && 'end pause 4s'}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language="java"
          theme="vs-dark"
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
  );
}
