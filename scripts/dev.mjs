import { spawn } from 'node:child_process';
import path from 'node:path';

const srcPath = process.argv[2] || process.env.JAVA_SRC_DIR || process.env.SRC_DIR;
const genArgs = srcPath ? [path.resolve(srcPath)] : [];

const gen = spawn('node', ['scripts/gen-java-files.mjs', ...genArgs], { stdio: 'inherit', shell: true });
gen.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });
  vite.on('exit', (c) => process.exit(c ?? 0));
});