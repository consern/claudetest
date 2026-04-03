import 'dotenv/config';
import React, { useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { envSchema } from '../config/env.js';
import { createProvider } from '../providers/factory.js';
import type { ChatMessage } from '../types/message.js';
import type { ToolApprovalRequest } from '../types/tool.js';
import type { AgentTelemetry } from '../types/agent.js';
import type { FeatureDevState } from '../types/workflow.js';
import { ChatView } from '../ui/ChatView.js';
import { InputBox } from '../ui/InputBox.js';
import { StatusBar } from '../ui/StatusBar.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { ToolEventView } from '../ui/ToolEventView.js';
import { ReviewPanel } from '../ui/ReviewPanel.js';
import { PhaseTracker } from '../ui/PhaseTracker.js';
import { SubagentPanel } from '../ui/SubagentPanel.js';
import { CurrentActionView } from '../ui/CurrentActionView.js';
import { DecisionBucketsView } from '../ui/DecisionBucketsView.js';
import { runAgentLoop } from '../agent/loop.js';
import { saveSession } from '../session/store.js';
import { appendHistory } from '../session/history.js';
import { ApprovalService } from '../agent/approval.js';
import { runCommand } from './commands.js';

const env = envSchema.parse(process.env);
const cwd = resolve(env.WORKSPACE_ROOT);

function makeMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

interface PendingApproval {
  request: ToolApprovalRequest;
  resolve: (value: boolean) => void;
}

export function App(): React.JSX.Element {
  const { exit } = useApp();
  const provider = useMemo(() => createProvider(env), []);
  const sessionId = useMemo(() => randomUUID(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolEvents, setToolEvents] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingAssistant, setPendingAssistant] = useState('');
  const [telemetry, setTelemetry] = useState<AgentTelemetry>({
    mode: 'chat',
    loopRound: 0,
    maxIterations: 0
  });
  const [workflowState, setWorkflowState] = useState<FeatureDevState | undefined>(undefined);

  const approval = useMemo(
    () =>
      new ApprovalService((request) =>
        new Promise<boolean>((resolveApproval) => {
          setPendingApproval({ request, resolve: resolveApproval });
        })
      ),
    []
  );

  const toolContext = useMemo(
    () => ({
      approval,
      workspaceRoot: cwd,
      readMaxBytes: env.READ_MAX_BYTES,
      shellEnabled: env.SHELL_ENABLED,
      writeEnabled: env.WRITE_ENABLED
    }),
    [approval]
  );

  async function persist(nextMessages: ChatMessage[]): Promise<void> {
    await saveSession(env.SESSION_DIR, {
      id: sessionId,
      cwd,
      providerName: provider.name,
      modelName: env.MODEL_NAME,
      messages: nextMessages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  useInput((key, raw) => {
    void (async () => {
      if (raw.ctrl && key === 'c') {
        exit();
        return;
      }

      if (pendingApproval) {
        if (key.toLowerCase() === 'y') {
          pendingApproval.resolve(true);
          setPendingApproval(null);
        }
        if (key.toLowerCase() === 'n') {
          pendingApproval.resolve(false);
          setPendingApproval(null);
        }
        return;
      }

      if (key === 'return') {
        const text = input.trim();
        setInput('');
        if (!text) {
          return;
        }

        const userMsg = makeMessage('user', text);
        const nextHistory = appendHistory(messages, userMsg);
        setMessages(nextHistory);
        setStreaming(true);
        setPendingAssistant('');
        setToolEvents([]);
        setWorkflowState(undefined);

        try {
          const commandOut = await runCommand(text, toolContext);
          if (commandOut !== null) {
            const assistant = makeMessage('assistant', commandOut);
            const withAssistant = appendHistory(nextHistory, assistant);
            setMessages(withAssistant);
            await persist(withAssistant);
            return;
          }

          const result = await runAgentLoop({
            userText: text,
            history: nextHistory,
            provider,
            model: env.MODEL_NAME,
            toolContext,
            cwd,
            maxIterations: 8,
            onTextChunk: (chunk) => {
              setPendingAssistant((prev) => prev + chunk);
            },
            onToolEvent: (event) => {
              setToolEvents((prev) => [...prev, event]);
            },
            onTelemetry: (nextTelemetry) => {
              setTelemetry(nextTelemetry);
            }
          });

          const assistant = makeMessage('assistant', result.text);
          const withAssistant = appendHistory(nextHistory, assistant);
          setMessages(withAssistant);
          setToolEvents((prev) => [...prev, ...result.toolEvents]);
          setWorkflowState(result.workflowState);
          if (result.telemetry) {
            setTelemetry(result.telemetry);
          }
          await persist(withAssistant);
        } catch (error) {
          const errText = error instanceof Error ? error.message : String(error);
          const assistant = makeMessage('assistant', `Execution failed: ${errText}`);
          const withAssistant = appendHistory(nextHistory, assistant);
          setMessages(withAssistant);
          await persist(withAssistant);
        } finally {
          setPendingAssistant('');
          setStreaming(false);
        }

        return;
      }

      if (key === 'backspace' || key === 'delete') {
        setInput((v) => v.slice(0, -1));
        return;
      }

      if (!raw.ctrl && !raw.meta && key.length === 1) {
        setInput((v) => v + key);
      }
    })();
  });

  const displayMessages =
    streaming && pendingAssistant
      ? [
          ...messages,
          {
            id: 'pending',
            role: 'assistant' as const,
            content: pendingAssistant,
            createdAt: new Date().toISOString()
          }
        ]
      : messages;

  return (
    <Box flexDirection='column'>
      <Text color='cyan'>Terminal Coding Client</Text>
      <StatusBar
        provider={provider.name}
        model={env.MODEL_NAME}
        cwd={cwd}
        sessionId={sessionId}
        streaming={streaming}
      />
      <PhaseTracker currentPhase={telemetry.currentPhase} />
      <SubagentPanel activeSubagent={telemetry.activeSubagent} />
      <CurrentActionView
        currentToolCall={telemetry.currentToolCall}
        loopRound={telemetry.loopRound}
        maxIterations={telemetry.maxIterations}
      />
      <DecisionBucketsView workflowState={workflowState} />
      <ChatView messages={displayMessages} />
      <ToolEventView events={toolEvents} />
      {pendingApproval ? <ConfirmDialog request={pendingApproval.request} /> : null}
      <ReviewPanel lines={['Prioritize high-signal findings.', 'Prefer minimal, reviewable diffs.']} />
      <InputBox value={input} disabled={streaming || pendingApproval !== null} />
      <Text dimColor>
        Commands: /read &lt;path&gt; | /search &lt;query&gt; | /write &lt;path&gt;::&lt;content&gt; | /shell &lt;cmd&gt; | /feature &lt;task&gt;
      </Text>
    </Box>
  );
}

