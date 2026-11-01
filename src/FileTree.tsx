import React from 'react';
import { useEffect, useMemo, useRef } from 'react';

export interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
  fileIndex?: number;
}

export function buildTree(files: { name: string }[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isFile: false, children: [] };
  files.forEach((f, idx) => {
    const parts = f.name.split('/').filter(Boolean);
    let cur = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');
      let child = cur.children.find((c) => c.name === part && c.path === path);
      if (!child) {
        child = { name: part, path, isFile: isLast, children: [], fileIndex: isLast ? idx : undefined };
        cur.children.push(child);
      } else if (isLast) {
        child.isFile = true;
        child.fileIndex = idx;
      }
      cur = child;
    });
  });
  const sort = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sort);
  };
  sort(root);
  return root.children;
}

export function ancestorsOf(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    out.push(parts.slice(0, i).join('/'));
  }
  return out;
}

interface Props {
  files: { name: string }[];
  currentPath: string;
  collapsed: Set<string>;
  onToggle: (folderPath: string) => void;
  onSelect: (fileIndex: number) => void;
  search: string;
}

export default function FileTree({ files, currentPath, collapsed, onToggle, onSelect, search }: Props) {
  const tree = useMemo(() => buildTree(files), [files]);
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentPath, search, collapsed]);

  const q = search.trim().toLowerCase();
  if (q) {
    const matches = files
      .map((f, idx) => ({ f, idx }))
      .filter(({ f }) => f.name.toLowerCase().includes(q));
    return (
      <div style={{ padding: '4px 0' }}>
        {matches.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#888', fontSize: 12 }}>No matches</div>
        )}
        {matches.map(({ f, idx }) => (
          <div
            ref={f.name === currentPath ? (el) => { activeRef.current = el; } : undefined}
            key={f.name}
            onClick={() => onSelect(idx)}
            title={f.name}
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'monospace',
              color: f.name === currentPath ? '#fff' : '#d4d4d4',
              background: f.name === currentPath ? '#094771' : 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {f.name}
          </div>
        ))}
      </div>
    );
  }

  const renderNode = (node: TreeNode, depth: number): React.ReactElement => {
    const isCollapsed = collapsed.has(node.path);
    if (node.isFile) {
      const active = node.path === currentPath;
      return (
        <div
          ref={active ? (el) => { activeRef.current = el; } : undefined}
          key={node.path}
          onClick={() => node.fileIndex !== undefined && onSelect(node.fileIndex)}
          title={node.path}
          style={{
            padding: `3px 8px 3px ${8 + depth * 14}px`,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'monospace',
            color: active ? '#fff' : '#d4d4d4',
            background: active ? '#094771' : 'transparent',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ opacity: 0.7 }}>{iconFor(node.name)}</span>
          <span>{node.name}</span>
        </div>
      );
    }
    return (
      <div key={node.path}>
        <div
          onClick={() => onToggle(node.path)}
          style={{
            padding: `3px 8px 3px ${8 + depth * 14}px`,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#9cdcfe',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            userSelect: 'none',
          }}
        >
          <span style={{ width: 10, display: 'inline-block' }}>{isCollapsed ? '▸' : '▾'}</span>
          <span style={{ opacity: 0.8 }}>📁</span>
          <span>{node.name}</span>
        </div>
        {!isCollapsed && node.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return <div style={{ padding: '4px 0' }}>{tree.map((n) => renderNode(n, 0))}</div>;
}

function iconFor(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  if (ext === 'java') return '☕';
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) return '📜';
  if (['json', 'xml', 'yml', 'yaml', 'properties'].includes(ext)) return '⚙';
  if (['md', 'txt'].includes(ext)) return '📝';
  if (['sh', 'bash'].includes(ext)) return '🔧';
  return '📄';
}
