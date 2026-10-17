// Renderer for BB's experimental_codeFenceRenderer slot. BB hands over each
// ```ui and ```app fence of an assistant reply with the closing-fence state,
// so no DOM scraping or settle heuristic is needed. The published SDK does
// not declare these props yet.
import type { ComponentType } from "react";
import type { PluginMessageDirectiveProps } from "@get-bb/plugin-sdk/app";
import { Fence, useThreadActions, type FenceLanguage } from "./Fence";
import { fenceComplete, type FenceStatus } from "./fenceStatus";

export interface CodeFenceRendererProps {
  code: string;
  language: string;
  /** BB ≥ 0.46: "streaming" until the closing fence; "closed", or "unclosed" when the reply ended without one. */
  status?: FenceStatus;
  /** The early slot proposal's flag, kept for BB builds that still send it. */
  complete?: boolean;
  /** Zero-based position among this message's fences of the same language. */
  index: number;
  message: PluginMessageDirectiveProps["message"];
  Original: ComponentType;
}

export interface CodeFenceRendererRegistration {
  id: string;
  languages: readonly string[];
  component: ComponentType<CodeFenceRendererProps>;
}

export const FENCE_LANGUAGES: readonly FenceLanguage[] = ["ui", "app"];

export function SlotFence({ code, language, status, complete, index, message, Original }: CodeFenceRendererProps) {
  const actions = useThreadActions();
  if (language !== "ui" && language !== "app") return <Original />;
  return (
    <Fence
      language={language}
      code={code}
      complete={fenceComplete({ status, complete })}
      stateKey={`bb.genui.state:${message.id}#${language}#${index}`}
      threadId={message.threadId}
      messageId={message.id}
      actions={actions}
    />
  );
}
