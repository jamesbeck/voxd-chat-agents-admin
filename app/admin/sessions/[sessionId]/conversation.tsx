"use client";

import {
  differenceInMilliseconds,
  differenceInSeconds,
  format,
} from "date-fns";
import SendMessageForm from "./sendMessageForm";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Clock, Cog, Coins, Type, Wrench } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MessageActions from "./MessageActions";
import ReactMarkdown from "react-markdown";
import MessageAttachments from "./MessageAttachments";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSessionSSE from "@/hooks/useSessionSSE";

type Ticket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  createdByName: string | null;
  createdAt: Date;
};

type TicketsByMessage = {
  [messageId: string]: Ticket[];
};

type TranslationMap = Record<string, string>;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
};

export default function Conversation({
  initialMessages,
  sessionId,
  agentId,
  ticketsByMessage,
  paused,
  deletedByUser,
  coreBaseUrl,
}: {
  initialMessages: any[];
  sessionId: string;
  agentId: string;
  ticketsByMessage: TicketsByMessage;
  paused: boolean;
  deletedByUser: boolean;
  coreBaseUrl: string;
}) {
  const router = useRouter();
  const messages = useSessionSSE(sessionId, coreBaseUrl, initialMessages);
  const [selectedLanguage, setSelectedLanguage] = useState("original");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitiallyScrolled = useRef(false);

  // Scroll to bottom on initial load
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || hasInitiallyScrolled.current) return;
    hasInitiallyScrolled.current = true;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-scroll on new SSE messages if user is near bottom
  useEffect(() => {
    if (!hasInitiallyScrolled.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Listen for SSE refresh events to pick up full metadata
  useEffect(() => {
    const handler = () => router.refresh();
    window.addEventListener("sse-refresh-needed", handler);
    return () => window.removeEventListener("sse-refresh-needed", handler);
  }, [router]);

  const lastMessageFromUser = messages
    .slice()
    .reverse()
    .find((message) => message.role === "user");

  const lastMessageFromUserSecondsAgo = lastMessageFromUser
    ? differenceInSeconds(new Date(), lastMessageFromUser.createdAt)
    : null;

  const availableLanguages = Array.from(
    new Set(
      messages.flatMap((message) =>
        Object.keys((message.translations as TranslationMap | null) ?? {}),
      ),
    ),
  ).sort();

  const showLanguageSelector = availableLanguages.length > 0;

  const getDisplayText = (message: any) => {
    if (selectedLanguage === "original") {
      return message.text;
    }

    return message.translations?.[selectedLanguage] ?? message.text;
  };

  return (
    <>
      {deletedByUser ? (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">
            This session was deleted by the user. It is treated as closed and
            can no longer be manually replied to.
          </p>
        </div>
      ) : paused ? (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">
            This session is paused, the agent will not respond to messages. You
            can resume the session using the button above, or reply manually
            using the form below.
          </p>
        </div>
      ) : null}
      {showLanguageSelector ? (
        <div className="mb-4 flex items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">Show language</span>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Original" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">Original</SelectItem>
              {availableLanguages.map((language) => (
                <SelectItem key={language} value={language}>
                  {LANGUAGE_LABELS[language] || language.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="h-[600px] rounded-xl border bg-muted/30 shadow-sm overflow-y-auto p-4 space-y-3"
      >
        {messages.map((message: any, index: number) => {
          // Calculate time since previous message
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const timeSincePreviousMessage = previousMessage
            ? differenceInMilliseconds(
                message.createdAt,
                previousMessage.createdAt,
              )
            : null;

          return (
            <div
              className={`flex ${message.role != "user" ? "justify-end" : ""}`}
              key={message.id}
            >
              <div
                className={`max-w-[80%] ${
                  message.role != "user"
                    ? "bg-white dark:bg-zinc-800 rounded-2xl rounded-tr-sm"
                    : "bg-primary text-primary-foreground rounded-2xl rounded-tl-sm"
                } shadow-sm`}
              >
                <div className="px-4 py-2">
                  <div className="text-[11px] opacity-60 mb-1">
                    {format(message.createdAt, "dd/MM/yyyy HH:mm")}
                    {message.role === "manual" &&
                      (message.apiKeyName
                        ? ` • API: ${message.apiKeyName}`
                        : message.userName
                          ? ` • ${message.userName}`
                          : "")}
                  </div>

                  {message.files?.length > 0 && (
                    <MessageAttachments
                      files={message.files}
                      variant={message.role === "user" ? "primary" : "muted"}
                    />
                  )}

                  <div className="text-sm">
                    {message._streaming && !getDisplayText(message) ? (
                      <div className="flex items-center gap-1 py-2 px-1">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="my-1 leading-relaxed">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 my-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 my-1">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="my-0.5">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold">
                              {children}
                            </strong>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-lg font-bold mt-2 mb-1">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-base font-bold mt-2 mb-1">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-bold mt-2 mb-1">
                              {children}
                            </h3>
                          ),
                          code: ({ children }) => (
                            <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs">
                              {children}
                            </code>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {getDisplayText(message)}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>

                {message.role === "assistant" && !message._streaming && (
                  <div className="px-4 py-2 border-t border-border/30 flex items-center gap-3">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-default">
                            <Bot className="h-3.5 w-3.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Model</p>
                          <p className="text-xs opacity-70">{message.model}</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-default">
                            <Coins className="h-3.5 w-3.5" />
                            <span className="text-[11px]">
                              {(message?.inputTokens ?? 0) +
                                (message?.outputTokens ?? 0)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Token Usage</p>
                          <p className="text-xs opacity-70">
                            Input: {message?.inputTokens} tokens
                          </p>
                          <p className="text-xs opacity-70">
                            Output: {message?.outputTokens} tokens
                          </p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-default">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-[11px]">
                              {(
                                differenceInMilliseconds(
                                  message.responseReceivedAt,
                                  message.responseRequestedAt,
                                ) / 1000
                              ).toFixed(2)}
                              s
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Response Time</p>
                          <p className="text-xs opacity-70">
                            Total time to generate response
                          </p>
                        </TooltipContent>
                      </Tooltip>

                      {message.toolCalls?.length > 0 &&
                        (() => {
                          const hasErrorLogs = message.toolCalls.some(
                            (toolCall: any) =>
                              toolCall.logs?.some(
                                (log: any) => log.error === true,
                              ),
                          );
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`flex items-center gap-1 transition-colors cursor-default ${
                                    hasErrorLogs
                                      ? "text-red-500 hover:text-red-600"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <Wrench className="h-3.5 w-3.5" />
                                  <span className="text-[11px]">
                                    {message.toolCalls.length}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="font-medium">
                                  Tools Used
                                  {hasErrorLogs ? " (Contains Errors)" : ""}
                                </p>
                                {message.toolCalls.map(
                                  (toolCall: any, idx: number) => (
                                    <p key={idx} className="text-xs opacity-70">
                                      {toolCall.toolName} (
                                      {(
                                        differenceInMilliseconds(
                                          toolCall.finishedAt,
                                          toolCall.startedAt,
                                        ) / 1000
                                      ).toFixed(2)}
                                      s)
                                    </p>
                                  ),
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })()}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-default">
                            <Type className="h-3.5 w-3.5" />
                            <span className="text-[11px]">
                              {message.text?.length ?? 0}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Character Count</p>
                          <p className="text-xs opacity-70">
                            {message.text?.length ?? 0} characters
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="ml-auto flex items-center gap-2">
                      <MessageActions
                        messageId={message.id}
                        messageType={message.role}
                        agentId={agentId}
                        variant="outline"
                        tickets={ticketsByMessage[message.id] || []}
                      />
                    </div>
                  </div>
                )}

                {message.role === "manual" && (
                  <div className="px-4 py-2 border-t border-border/30 flex items-center gap-3">
                    <TooltipProvider delayDuration={0}>
                      {(message.apiKeyName || message.userName) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-default">
                              <Cog className="h-3.5 w-3.5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="font-medium">Manually Sent</p>
                            <p className="text-xs opacity-70">
                              {message.apiKeyName || message.userName}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-default">
                            <Type className="h-3.5 w-3.5" />
                            <span className="text-[11px]">
                              {message.text?.length ?? 0}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Character Count</p>
                          <p className="text-xs opacity-70">
                            {message.text?.length ?? 0} characters
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="ml-auto">
                      <MessageActions
                        messageId={message.id}
                        messageType={message.role}
                        agentId={agentId}
                        variant="outline"
                      />
                    </div>
                  </div>
                )}

                {message.role === "user" && (
                  <div className="px-4 py-2 border-t border-white/10 flex items-center gap-3">
                    <TooltipProvider delayDuration={0}>
                      {timeSincePreviousMessage !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors cursor-default">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-[11px]">
                                {timeSincePreviousMessage < 60000
                                  ? `${(
                                      timeSincePreviousMessage / 1000
                                    ).toFixed(0)}s`
                                  : timeSincePreviousMessage < 3600000
                                    ? `${Math.floor(
                                        timeSincePreviousMessage / 60000,
                                      )}m`
                                    : `${Math.floor(
                                        timeSincePreviousMessage / 3600000,
                                      )}h`}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="font-medium">Response Time</p>
                            <p className="text-xs opacity-70">
                              Time since previous message
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors cursor-default">
                            <Type className="h-3.5 w-3.5" />
                            <span className="text-[11px]">
                              {message.text?.length ?? 0}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Character Count</p>
                          <p className="text-xs opacity-70">
                            {message.text?.length ?? 0} characters
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="ml-auto flex items-center gap-2">
                      <MessageActions
                        messageId={message.id}
                        messageType={message.role}
                        agentId={agentId}
                        variant="secondary"
                        tickets={ticketsByMessage[message.id] || []}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SendMessageForm
        sessionId={sessionId}
        lastMessageFromUserSecondsAgo={lastMessageFromUserSecondsAgo}
        paused={paused}
        deletedByUser={deletedByUser}
      />
    </>
  );
}
