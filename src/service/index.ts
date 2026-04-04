import 'dotenv/config';
import { createWorkbenchApiServer } from './server.js';
import { WorkbenchServiceManager } from './manager.js';

const port = Number(process.env.WORKBENCH_API_PORT ?? 4317);
const manager = new WorkbenchServiceManager(process.env);
const server = createWorkbenchApiServer(manager, port);

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`[workbench-api] listening on http://127.0.0.1:${port}\n`);
});

