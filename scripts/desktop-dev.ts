import { spawn } from 'node:child_process';

interface ProcHandle {
  name: string;
  proc: ReturnType<typeof spawn>;
}

function run(name: string, command: string, args: string[]): ProcHandle {
  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true
  });
  return { name, proc };
}

const processes: ProcHandle[] = [
  run('service', 'pnpm', ['dev:service']),
  run('desktop-app', 'pnpm', ['--dir', 'desktop/app', 'exec', 'vite'])
];

if (process.env.DESKTOP_WITH_TAURI === '1') {
  processes.push(
    run('tauri-shell', 'pnpm', ['--dir', 'desktop/tauri/src-tauri', 'exec', 'cargo', 'tauri', 'dev'])
  );
}

const shutdown = (): void => {
  for (const handle of processes) {
    handle.proc.kill();
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

for (const handle of processes) {
  handle.proc.on('exit', (code) => {
    if (code && code !== 0) {
      process.stderr.write(`[desktop-dev] ${handle.name} exited with code ${code}\n`);
      shutdown();
    }
  });
}

