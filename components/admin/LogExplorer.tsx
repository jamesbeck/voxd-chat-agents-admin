"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Key,
  Globe,
  Database,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useDebounce } from "@uidotdev/usehooks";
import saGetLogTableData, { LogFilters } from "@/actions/saGetLogTableData";
import Link from "next/link";

interface LogEntry {
  id: string;
  event: string;
  description: string;
  data: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  adminUserId: string | null;
  apiKeyId: string | null;
  organisationId: string | null;
  partnerId: string | null;
  sessionId: string | null;
  agentId: string | null;
  chatUserId: string | null;
  adminUserName: string | null;
  adminUserEmail: string | null;
  apiKeyName: string | null;
}

interface LogExplorerProps {
  filters?: LogFilters;
  title?: string;
  showSearch?: boolean;
  pageSize?: number;
}

const eventColors: Record<string, string> = {
  "User Login":
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "User Logout":
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Agent Created":
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Agent Updated":
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Session Started":
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Message Sent":
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "API Key Created":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

function LogEntryCard({ log }: { log: LogEntry }) {
  const [isOpen, setIsOpen] = useState(false);

  const eventColorClass =
    eventColors[log.event] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  const createdAt = new Date(log.createdAt);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
  const fullDate = format(createdAt, "PPpp");

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card hover:bg-accent/50 transition-colors">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 cursor-pointer">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Badge className={`${eventColorClass} shrink-0`}>
                {log.event}
              </Badge>
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium truncate w-full text-left">
                  {log.description || "No description"}
                </span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo}
                  </span>
                  {log.adminUserName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {log.adminUserName}
                    </span>
                  )}
                  {log.apiKeyName && (
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      {log.apiKeyName}
                    </span>
                  )}
                  {log.ipAddress && (
                    <span className="items-center gap-1 hidden sm:flex">
                      <Globe className="h-3 w-3" />
                      {log.ipAddress}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 ml-4">
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-4 space-y-4 bg-muted/30">
            {/* Timestamp */}
            <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span className="text-muted-foreground font-medium">
                Timestamp
              </span>
              <span>{fullDate}</span>
            </div>

            {/* Actor */}
            {(log.adminUserName || log.apiKeyName) && (
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Actor</span>
                <span>
                  {log.adminUserName && (
                    <Link
                      href={`/adminUsers/${log.adminUserId}`}
                      className="text-primary hover:underline"
                    >
                      {log.adminUserName}{" "}
                      {log.adminUserEmail && `(${log.adminUserEmail})`}
                    </Link>
                  )}
                  {log.apiKeyName && (
                    <span>
                      API Key:{" "}
                      <code className="bg-muted px-1 rounded">
                        {log.apiKeyName}
                      </code>
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* IP Address */}
            {log.ipAddress && (
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground font-medium">
                  IP Address
                </span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs w-fit">
                  {log.ipAddress}
                </code>
              </div>
            )}

            {/* Related Entities */}
            {(log.organisationId ||
              log.partnerId ||
              log.sessionId ||
              log.agentId ||
              log.chatUserId) && (
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground font-medium">
                  Related
                </span>
                <div className="flex flex-wrap gap-2">
                  {log.organisationId && (
                    <Link href={`/organisations/${log.organisationId}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        Organisation
                      </Badge>
                    </Link>
                  )}
                  {log.partnerId && (
                    <Link href={`/organisations/${log.partnerId}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        Partner
                      </Badge>
                    </Link>
                  )}
                  {log.sessionId && (
                    <Link href={`/sessions/${log.sessionId}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        Session
                      </Badge>
                    </Link>
                  )}
                  {log.agentId && (
                    <Link href={`/agents/${log.agentId}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        Agent
                      </Badge>
                    </Link>
                  )}
                  {log.chatUserId && (
                    <Link href={`/chatUsers/${log.chatUserId}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        Chat User
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Data */}
            {log.data && Object.keys(log.data).length > 0 && (
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Data</span>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            )}

            {/* Log ID */}
            <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span className="text-muted-foreground font-medium">Log ID</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs w-fit">
                {log.id}
              </code>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function LogExplorer({
  filters,
  title = "Activity Log",
  showSearch = true,
  pageSize = 20,
}: LogExplorerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const debouncedSearchTerm = useDebounce(searchValue, 300);
  const currentRequestRef = useRef<symbol | null>(null);

  // Memoize filters to prevent infinite re-renders
  const stableFilters = useMemo(
    () => filters ?? {},
    [
      filters?.adminUserId,
      filters?.apiKeyId,
      filters?.organisationId,
      filters?.partnerId,
      filters?.sessionId,
      filters?.agentId,
      filters?.chatUserId,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(totalAvailable / pageSize));
  const hasMore = page < totalPages;

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    const requestId = Symbol();
    currentRequestRef.current = requestId;

    const response = await saGetLogTableData({
      search: debouncedSearchTerm,
      page,
      pageSize,
      sortField: "createdAt",
      sortDirection: "desc",
      ...stableFilters,
    });

    if (currentRequestRef.current === requestId) {
      if (response.success) {
        setLogs(response.data as LogEntry[]);
        setTotalAvailable(response.totalAvailable);
      }
      setLoading(false);
    }
  }, [debouncedSearchTerm, page, pageSize, stableFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {showSearch && (
            <Input
              placeholder="Search logs..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-64"
            />
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Database className="h-12 w-12 mb-4 opacity-50" />
            <p>No log entries found</p>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <LogEntryCard key={log.id} log={log} />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, totalAvailable)} of {totalAvailable}{" "}
            entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
