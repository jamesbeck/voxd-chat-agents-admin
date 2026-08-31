import { format, formatDistance, differenceInMilliseconds } from "date-fns";
import getMessageById from "@/lib/getMessageById";
import getSessionById from "@/lib/getSessionById";
import getAgentById from "@/lib/getAgentById";
import getMessages from "@/lib/getMessagesBySession";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import H2 from "@/components/adminui/H2";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { Card, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs, { RecordTab } from "@/components/admin/RecordTabs";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Hash,
  MessageSquare,
  Calendar,
  Link as LinkIcon,
  Bot,
  Coins,
  Clock,
  Wrench,
  User,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default async function Page({
  searchParams,
  params,
}: {
  params: Promise<{ messageId: string }>;
  searchParams: Promise<{ tab?: string; type?: string }>;
}) {
  const awaitedSearchParams = await searchParams;
  const activeTab = awaitedSearchParams.tab || "details";
  const messageType = awaitedSearchParams.type as
    | "user"
    | "assistant"
    | "manual"
    | undefined;

  await verifyAccessToken();

  const awaitedParams = await params;
  const messageId = awaitedParams.messageId;

  if (!messageType || !["user", "assistant", "manual"].includes(messageType)) {
    notFound();
  }

  const message = await getMessageById({ messageId, messageType });

  if (!message) notFound();

  const session = await getSessionById({ sessionId: message.sessionId });
  if (!session) notFound();

  const agent = await getAgentById({ agentId: session.agentId });

  // Get all messages for navigation
  const allMessages = await getMessages({ sessionId: session.id });
  const currentIndex = allMessages.findIndex(
    (m) => m.id === messageId && m.role === messageType,
  );
  const previousMessage =
    currentIndex > 0 ? allMessages[currentIndex - 1] : null;
  const nextMessage =
    currentIndex < allMessages.length - 1
      ? allMessages[currentIndex + 1]
      : null;

  const roleLabels: Record<string, string> = {
    user: "User Message",
    assistant: "AI Response",
    manual: "Manual Message",
  };

  const roleBadgeColors: Record<string, string> = {
    user: "bg-primary",
    assistant: "bg-gray-500",
    manual: "bg-blue-500",
  };

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Agents", href: "/agents" },
          { label: agent.niceName, href: `/agents/${agent.id}` },
          {
            label: session.id,
            href: `/sessions/${session.id}?tab=conversation`,
          },
          { label: "Message" },
        ]}
      />

      <H1 className="text-2xl font-semibold mb-4">Message Details</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "details",
            label: "Details",
            href: `/messages/${messageId}?type=${messageType}&tab=details`,
          },
          {
            value: "text",
            label: "Text",
            href: `/messages/${messageId}?type=${messageType}&tab=text`,
          },
          ...(messageType === "assistant"
            ? ([
                {
                  value: "system-prompt",
                  label: "System Prompt",
                  href: `/messages/${messageId}?type=${messageType}&tab=system-prompt`,
                },
                {
                  value: "tool-calls",
                  label: (
                    <>
                      <span>Tool Calls</span>
                      <Badge variant="secondary" className="ml-1.5">
                        {message.role === "assistant"
                          ? message.toolCalls.length
                          : 0}
                      </Badge>
                    </>
                  ),
                  href: `/messages/${messageId}?type=${messageType}&tab=tool-calls`,
                },
                {
                  value: "output-data",
                  label: "Output Data",
                  href: `/messages/${messageId}?type=${messageType}&tab=output-data`,
                },
              ] satisfies RecordTab[])
            : []),
        ]}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/sessions/${session.id}?tab=conversation`}>
                <ChevronLeft className="h-4 w-4" />
                Back to Session
              </Link>
            </Button>

            <ButtonGroup>
              {previousMessage ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/messages/${previousMessage.id}?type=${previousMessage.role}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
              {nextMessage ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/messages/${nextMessage.id}?type=${nextMessage.role}`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </ButtonGroup>
          </>
        }
      >
        <TabsContent value="details">
          <Container>
            <DataCard
              items={[
                {
                  label: "Message ID",
                  value: (
                    <span className="font-mono text-xs">{message.id}</span>
                  ),
                  icon: <Hash className="h-4 w-4" />,
                },
                {
                  label: "Type",
                  value: <span className="capitalize">{message.role}</span>,
                  icon: <MessageSquare className="h-4 w-4" />,
                  variant:
                    message.role === "user"
                      ? "info"
                      : message.role === "assistant"
                        ? "default"
                        : "warning",
                },
                {
                  label: "Created At",
                  value: format(message.createdAt, "dd/MM/yyyy HH:mm:ss"),
                  description: formatDistance(message.createdAt, new Date(), {
                    addSuffix: true,
                  }),
                  icon: <Calendar className="h-4 w-4" />,
                },
                {
                  label: "WhatsApp Message ID",
                  value: (
                    <span className="font-mono text-xs">
                      {message.whatsappMessageId || "-"}
                    </span>
                  ),
                  icon: <Hash className="h-4 w-4" />,
                },
                {
                  label: "Session",
                  value: (
                    <Link
                      href={`/sessions/${session.id}`}
                      className="text-blue-500 hover:underline"
                    >
                      {session.id}
                    </Link>
                  ),
                  icon: <LinkIcon className="h-4 w-4" />,
                },
                // User message specific fields
                ...(message.role === "user"
                  ? [
                      {
                        label: "Response Status",
                        value: (
                          <span className="capitalize">
                            {message.responseStatus}
                          </span>
                        ),
                        icon: <CheckCircle className="h-4 w-4" />,
                        variant:
                          message.responseStatus === "complete"
                            ? ("success" as const)
                            : message.responseStatus === "error"
                              ? ("danger" as const)
                              : ("warning" as const),
                      },
                      ...(message.error
                        ? [
                            {
                              label: "Error",
                              value: message.error,
                              icon: <AlertCircle className="h-4 w-4" />,
                              variant: "danger" as const,
                            },
                          ]
                        : []),
                      ...(message.assistantResponseId
                        ? [
                            {
                              label: "Assistant Response",
                              value: (
                                <Link
                                  href={`/messages/${message.assistantResponseId}?type=assistant`}
                                  className="text-blue-500 hover:underline"
                                >
                                  View Response
                                </Link>
                              ),
                              icon: <ExternalLink className="h-4 w-4" />,
                            },
                          ]
                        : []),
                    ]
                  : []),
                // Assistant message specific fields
                ...(message.role === "assistant"
                  ? [
                      {
                        label: "Model",
                        value: message.model || "-",
                        icon: <Bot className="h-4 w-4" />,
                      },
                      {
                        label: "Prompt Tokens",
                        value: message.inputTokens?.toLocaleString() ?? "-",
                        icon: <Coins className="h-4 w-4" />,
                      },
                      {
                        label: "Completion Tokens",
                        value: message.outputTokens?.toLocaleString() ?? "-",
                        icon: <Coins className="h-4 w-4" />,
                      },
                      {
                        label: "Total Tokens",
                        value:
                          message.inputTokens && message.outputTokens
                            ? (
                                message.inputTokens + message.outputTokens
                              ).toLocaleString()
                            : "-",
                        icon: <Coins className="h-4 w-4" />,
                        variant: "info" as const,
                      },
                      ...(message.responseRequestedAt &&
                      message.responseReceivedAt
                        ? [
                            {
                              label: "Response Time",
                              value: `${(
                                differenceInMilliseconds(
                                  message.responseReceivedAt,
                                  message.responseRequestedAt,
                                ) / 1000
                              ).toFixed(2)}s`,
                              icon: <Clock className="h-4 w-4" />,
                            },
                          ]
                        : []),
                      {
                        label: "Tool Calls",
                        value:
                          message.toolCalls.length > 0
                            ? `${message.toolCalls.length} tool${
                                message.toolCalls.length > 1 ? "s" : ""
                              }`
                            : "None",
                        icon: <Wrench className="h-4 w-4" />,
                        variant:
                          message.toolCalls.length > 0
                            ? ("info" as const)
                            : ("default" as const),
                      },
                    ]
                  : []),
                // Manual message specific fields
                ...(message.role === "manual"
                  ? [
                      {
                        label: "Sent By",
                        value: message.apiKeyName
                          ? `API: ${message.apiKeyName}`
                          : message.userName || "Unknown",
                        icon: <User className="h-4 w-4" />,
                      },
                    ]
                  : []),
              ]}
            />
          </Container>
        </TabsContent>

        <TabsContent value="text">
          <Card>
            <CardContent className="p-4">
              <pre className="overflow-auto text-sm whitespace-pre-wrap">
                {message.text}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {message.role === "assistant" && (
          <>
            <TabsContent value="system-prompt">
              <Card>
                <CardContent className="p-4">
                  <pre className="overflow-auto text-sm whitespace-pre-wrap">
                    {message.systemPrompt || "No system prompt"}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tool-calls">
              {message.toolCalls.length > 0 ? (
                <div className="space-y-4">
                  {message.toolCalls.map((toolCall: any) => {
                    return (
                      <Card key={toolCall.id} className="py-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">
                              {toolCall.toolName}
                            </h3>
                            {toolCall.startedAt && toolCall.finishedAt && (
                              <span className="text-sm text-muted-foreground">
                                {(
                                  differenceInMilliseconds(
                                    toolCall.finishedAt,
                                    toolCall.startedAt,
                                  ) / 1000
                                ).toFixed(2)}
                                s
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-mono">
                              {toolCall.id}
                            </span>
                          </div>

                          {toolCall.errorMessage && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md space-y-3">
                              <div>
                                <div className="text-red-600 dark:text-red-400 font-semibold mb-1">
                                  Error Message
                                </div>
                                <div className="text-red-600 dark:text-red-400 text-sm">
                                  {toolCall.errorMessage}
                                </div>
                              </div>
                              {toolCall.errorCause && (
                                <div>
                                  <div className="text-red-600 dark:text-red-400 font-semibold mb-1">
                                    Cause
                                  </div>
                                  <div className="text-red-600 dark:text-red-400 text-sm">
                                    {toolCall.errorCause}
                                  </div>
                                </div>
                              )}
                              {toolCall.errorStack && (
                                <div>
                                  <div className="text-red-600 dark:text-red-400 font-semibold mb-1">
                                    Stack Trace
                                  </div>
                                  <pre className="text-red-600 dark:text-red-400 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                                    {toolCall.errorStack}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-sm font-semibold mb-1">
                                Input
                              </div>
                              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                {toolCall.input
                                  ? JSON.stringify(toolCall.input, null, 2)
                                  : "No input"}
                              </pre>
                            </div>
                            <div>
                              <div className="text-sm font-semibold mb-1">
                                Output
                              </div>
                              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                {toolCall.output
                                  ? JSON.stringify(toolCall.output, null, 2)
                                  : "No output"}
                              </pre>
                            </div>
                          </div>

                          {toolCall.logs && toolCall.logs.length > 0 && (
                            <div>
                              <div className="text-sm font-semibold mb-2">
                                Logs
                              </div>
                              <div className="space-y-2">
                                {toolCall.logs.map((log: any) => (
                                  <div
                                    key={log.id}
                                    className={cn(
                                      "border rounded-lg p-3",
                                      log.error &&
                                        "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800",
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <div
                                        className={cn(
                                          "text-xs whitespace-nowrap font-mono",
                                          log.error
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        {format(log.createdAt, "HH:mm:ss.SSS")}
                                      </div>
                                      {log.error && (
                                        <Badge
                                          variant="destructive"
                                          className="text-xs"
                                        >
                                          Error
                                        </Badge>
                                      )}
                                    </div>
                                    <div
                                      className={cn(
                                        "text-sm mb-2",
                                        log.error &&
                                          "text-red-600 dark:text-red-400 font-semibold",
                                      )}
                                    >
                                      {log.message}
                                    </div>
                                    {log.data && (
                                      <div className="mt-2">
                                        <pre
                                          className={cn(
                                            "bg-muted p-2 rounded text-xs overflow-auto",
                                            log.error &&
                                              "text-red-600 dark:text-red-400",
                                          )}
                                        >
                                          {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-muted-foreground">No tool calls</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="output-data">
              <div className="space-y-6">
                <div>
                  <H2 className="mb-2">Session Data</H2>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="overflow-auto text-sm">
                        {message.outputSessionData
                          ? JSON.stringify(message.outputSessionData, null, 2)
                          : "No output session data"}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <H2 className="mb-2">User Data</H2>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="overflow-auto text-sm">
                        {message.outputUserData
                          ? JSON.stringify(message.outputUserData, null, 2)
                          : "No output user data"}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </>
        )}
      </RecordTabs>
    </Container>
  );
}
