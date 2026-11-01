import { spawn } from 'node:child_process';
import path from 'node:path';

const HELP = `Usage: npm run dev [-- <path>|--path=<path>|--src=<path>|--dir=<path>]

Starts the Java Code Viewer dev server. Optionally generates javaFiles.ts from a
source directory containing .java files before launching Vite.

Options:
  <path>            Positional source directory
  --path, --src, --dir <path>   Source directory (flag form)
  --path=<path> etc.            Source directory (equals form)
  -h, --help                    Show this help

Environment variables:
  JAVA_SRC_DIR, SRC_DIR, SOURCE_DIR   Source directory (used if no CLI arg)

Default source directory:
  (current working directory)
`;

function resolveSrcPath(argv) {
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      process.stdout.write(HELP);
      process.exit(0);
    }
    if (a.startsWith('--path=') || a.startsWith('--src=') || a.startsWith('--dir=')) {
      return a.split('=').slice(1).join('=');
    }
    if (a === '--path' || a === '--src' || a === '--dir') {
      return argv[++i];
    }
    if (!a.startsWith('--') && !a.startsWith('-')) {
      return a;
    }
  }
  return process.env.JAVA_SRC_DIR || process.env.SRC_DIR || process.env.SOURCE_DIR;
}

const raw = resolveSrcPath(process.argv);
const srcPath = raw ? path.resolve(raw) : null;
const genArgs = srcPath ? [srcPath] : [];

const gen = spawn('node', ['scripts/gen-java-files.mjs', ...genArgs], { stdio: 'inherit', shell: true });
gen.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });
  vite.on('exit', (c) => process.exit(c ?? 0));
});
