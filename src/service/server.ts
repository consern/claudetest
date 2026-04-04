import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { WorkbenchServiceManager } from './manager.js';
import type { ServiceStreamEvent } from './types.js';

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    return {};
  }
}

function writeSseHeaders(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
}

function writeSseEvent(res: ServerResponse, event: ServiceStreamEvent): void {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function createWorkbenchApiServer(
  manager: WorkbenchServiceManager,
  port = 4317
): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendJson(res, 400, { error: 'Invalid request' });
      return;
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? `127.0.0.1:${port}`}`);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && path === '/api/projects') {
      sendJson(res, 200, { projects: manager.listProjects() });
      return;
    }
    if (req.method === 'POST' && path === '/api/projects/open') {
      const body = (await readBody(req)) as Record<string, unknown>;
      if (typeof body.rootPath !== 'string') {
        sendJson(res, 400, { error: 'rootPath is required' });
        return;
      }
      const project = manager.openProject({
        rootPath: body.rootPath,
        name: typeof body.name === 'string' ? body.name : undefined
      });
      sendJson(res, 200, { project });
      return;
    }

    if (req.method === 'GET' && path === '/api/tasks') {
      sendJson(res, 200, { tasks: manager.listTasks() });
      return;
    }
    if (req.method === 'POST' && path === '/api/tasks/start') {
      const body = (await readBody(req)) as Record<string, unknown>;
      if (typeof body.title !== 'string' || !body.title.trim()) {
        sendJson(res, 400, { error: 'title is required' });
        return;
      }
      const task = await manager.startTask({
        title: body.title,
        mode: typeof body.mode === 'string' ? (body.mode as never) : undefined,
        projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined
      });
      sendJson(res, 200, { task });
      return;
    }

    const taskIdMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === 'GET' && taskIdMatch) {
      const task = manager.getTask(taskIdMatch[1]);
      if (!task) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }
      sendJson(res, 200, { task: task.task, runtime: task });
      return;
    }

    const taskEventsStreamMatch = path.match(/^\/api\/tasks\/([^/]+)\/events$/);
    if (req.method === 'GET' && taskEventsStreamMatch) {
      const taskId = taskEventsStreamMatch[1];
      writeSseHeaders(res);
      const dispose = manager.subscribeStream((event) => {
        if (event.taskId !== taskId) {
          return;
        }
        writeSseEvent(res, event);
      });
      const ping = setInterval(() => {
        res.write(': ping\n\n');
      }, 15000);
      req.on('close', () => {
        clearInterval(ping);
        dispose();
      });
      return;
    }

    const taskCancelMatch = path.match(/^\/api\/tasks\/([^/]+)\/cancel$/);
    if (req.method === 'POST' && taskCancelMatch) {
      const task = await manager.cancelTask(taskCancelMatch[1]);
      if (!task) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }
      sendJson(res, 200, { task });
      return;
    }

    const taskApprovalsStreamMatch = path.match(/^\/api\/tasks\/([^/]+)\/approvals\/stream$/);
    if (req.method === 'GET' && taskApprovalsStreamMatch) {
      const taskId = taskApprovalsStreamMatch[1];
      writeSseHeaders(res);
      const dispose = manager.subscribeStream((event) => {
        if (event.taskId !== taskId) {
          return;
        }
        if (event.type !== 'approval_added' && event.type !== 'approval_resolved') {
          return;
        }
        writeSseEvent(res, event);
      });
      const ping = setInterval(() => {
        res.write(': ping\n\n');
      }, 15000);
      req.on('close', () => {
        clearInterval(ping);
        dispose();
      });
      return;
    }

    const taskResumeMatch = path.match(/^\/api\/tasks\/([^/]+)\/resume$/);
    if (req.method === 'POST' && taskResumeMatch) {
      const task = await manager.resumeTask(taskResumeMatch[1]);
      if (!task) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }
      sendJson(res, 200, { task });
      return;
    }

    if (req.method === 'GET' && path === '/api/sessions') {
      sendJson(res, 200, { sessions: await manager.listSessions() });
      return;
    }
    const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)$/);
    if (req.method === 'GET' && sessionMatch) {
      const session = await manager.getSession(sessionMatch[1]);
      if (!session) {
        sendJson(res, 404, { error: 'Session not found' });
        return;
      }
      sendJson(res, 200, { session });
      return;
    }

    if (req.method === 'GET' && path === '/api/reviews') {
      sendJson(res, 200, { reviews: manager.listReviews() });
      return;
    }
    const reviewMatch = path.match(/^\/api\/reviews\/([^/]+)$/);
    if (req.method === 'GET' && reviewMatch) {
      const review = manager.getReview(reviewMatch[1]);
      if (!review) {
        sendJson(res, 404, { error: 'Review not found' });
        return;
      }
      sendJson(res, 200, { review });
      return;
    }
    const reviewReworkMatch = path.match(/^\/api\/reviews\/([^/]+)\/rework$/);
    if (req.method === 'POST' && reviewReworkMatch) {
      const ok = manager.markReviewRework(reviewReworkMatch[1]);
      if (!ok) {
        sendJson(res, 404, { error: 'Review not found' });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && path === '/api/approvals') {
      sendJson(res, 200, { approvals: manager.listApprovals() });
      return;
    }
    const approvalApproveMatch = path.match(/^\/api\/approvals\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approvalApproveMatch) {
      const ok = manager.approve(approvalApproveMatch[1]);
      if (!ok) {
        sendJson(res, 404, { error: 'Approval not found' });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }
    const approvalRejectMatch = path.match(/^\/api\/approvals\/([^/]+)\/reject$/);
    if (req.method === 'POST' && approvalRejectMatch) {
      const ok = manager.reject(approvalRejectMatch[1]);
      if (!ok) {
        sendJson(res, 404, { error: 'Approval not found' });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    const stateMatch = path.match(/^\/api\/tasks\/([^/]+)\/state$/);
    if (req.method === 'GET' && stateMatch) {
      const state = manager.getTaskState(stateMatch[1]);
      if (!state) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }
      sendJson(res, 200, { state });
      return;
    }

    const telemetryMatch = path.match(/^\/api\/tasks\/([^/]+)\/telemetry$/);
    if (req.method === 'GET' && telemetryMatch) {
      const telemetry = manager.getTelemetry(telemetryMatch[1]);
      if (!telemetry) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }
      sendJson(res, 200, { telemetry });
      return;
    }

    const auditMatch = path.match(/^\/api\/tasks\/([^/]+)\/audit$/);
    if (req.method === 'GET' && auditMatch) {
      const audit = manager.getAudit(auditMatch[1]);
      if (!audit) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }
      sendJson(res, 200, { audit });
      return;
    }

    const auditStreamMatch = path.match(/^\/api\/tasks\/([^/]+)\/audit\/stream$/);
    if (req.method === 'GET' && auditStreamMatch) {
      const taskId = auditStreamMatch[1];
      writeSseHeaders(res);
      const dispose = manager.subscribeStream((event) => {
        if (event.taskId !== taskId) {
          return;
        }
        if (event.type !== 'audit_event' && event.type !== 'review_rework') {
          return;
        }
        writeSseEvent(res, event);
      });
      const ping = setInterval(() => {
        res.write(': ping\n\n');
      }, 15000);
      req.on('close', () => {
        clearInterval(ping);
        dispose();
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  return server;
}
