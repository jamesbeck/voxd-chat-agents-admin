"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ArrowDown, ArrowUp, Info } from "lucide-react";
import TableLink from "@/components/adminui/TableLink";
import {
  ServerActionReadResponse,
  ServerActionReadParams,
} from "@/types/types";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";
import { useDebounce } from "@uidotdev/usehooks";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type Column = {
  label: string;
  name: string;
  sort?: boolean;
  tooltip?: string;
  format?: (row: any) => string | React.ReactNode;
  linkTo?: (row: any) => string;
};
interface DataTableProps<TExtra extends object = object> {
  columns: Column[];
  actions?: (row: any) => React.ReactNode;
  headerActions?: React.ReactNode;
  getData: (
    params: ServerActionReadParams<TExtra>,
  ) => Promise<ServerActionReadResponse>;
  pageSize?: number;
  defaultSort?: { name: string; direction: "asc" | "desc" };
  // Extra params to forward to getData beyond the base ServerActionReadParams fields
  getDataParams?: TExtra;
  // Unique identifier for persisting sort preferences
  tableId?: string;
}

export default function DataTable<TExtra extends object = object>({
  columns,
  actions,
  headerActions,
  getData,
  pageSize = 100,
  defaultSort,
  getDataParams,
  tableId,
}: DataTableProps<TExtra>) {
  const [response, setResponse] = useState<ServerActionReadResponse | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchTerm = useDebounce(searchValue, 300);
  const [page, setPage] = useState(1);

  // Initialize sort with defaults (don't read localStorage during render to avoid hydration mismatch)
  const [sortField, setSortField] = useState<string | undefined>(
    defaultSort?.name || columns[0]?.name,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    defaultSort?.direction || "asc",
  );
  const sortableFields = columns
    .filter((column) => column.sort)
    .map((column) => column.name);
  const sortableFieldsKey = sortableFields.join("\0");

  // Load sort preferences from localStorage after hydration
  useEffect(() => {
    if (tableId) {
      try {
        const storageKey = `table-sort-${tableId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const isValidField = sortableFieldsKey
            .split("\0")
            .includes(parsed?.field);
          const isValidDirection =
            parsed?.direction === "asc" || parsed?.direction === "desc";

          if (isValidField && isValidDirection) {
            setSortField(parsed.field);
            setSortDirection(parsed.direction);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [sortableFieldsKey, tableId]);
  const [loading, setLoading] = useState(true);
  const currentRequestRef = useRef<symbol | null>(null);

  const totalPages = response?.success
    ? Math.max(1, Math.ceil(response?.totalAvailable / response.pageSize))
    : 1;

  // central fetch function so various state changes can reuse
  const fetchData = useCallback(async () => {
    setLoading(true);

    const requestId = Symbol();
    currentRequestRef.current = requestId;

    const params: ServerActionReadParams<TExtra> = {
      search: debouncedSearchTerm,
      page,
      pageSize,
      sortField: sortField || "id",
      sortDirection: sortDirection || "asc",
      ...(getDataParams || ({} as TExtra)),
    };

    const fetchedData = await getData(params);

    // only set response if this is the latest request
    if (currentRequestRef.current === requestId) {
      setResponse(fetchedData);
      setLoading(false);
    }
  }, [
    getData,
    debouncedSearchTerm,
    page,
    pageSize,
    sortField,
    sortDirection,
    getDataParams,
  ]);

  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // whenever search changes, reset to page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  const handleSortClick = (columnName: string) => {
    let newDirection: "asc" | "desc";
    let newField: string;

    if (sortField === columnName) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
      newField = columnName;
      setSortDirection(newDirection);
    } else {
      newField = columnName;
      newDirection = "asc";
      setSortField(newField);
      setSortDirection(newDirection);
    }

    // Persist sort preference if tableId is provided
    if (tableId) {
      try {
        localStorage.setItem(
          `table-sort-${tableId}`,
          JSON.stringify({ field: newField, direction: newDirection }),
        );
      } catch {
        // Ignore storage errors
      }
    }

    setPage(1); // reset page on sort change
  };

  // Rendered table component
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        {response?.success ? (
          <p className="text-sm text-muted-foreground">
            Showing {response.data.length} of {response.totalAvailable} records
          </p>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {headerActions}
          <Input
            type="text"
            placeholder="Search..."
            onChange={(e) => {
              setSearchValue(e.target.value);
            }}
            value={searchValue}
            className="w-64"
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border relative">
        {loading && (
          <Spinner className="h-8 w-8 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        )}
        <Table className={loading ? "opacity-20 pointer-events-none" : ""}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const isSorted = sortField === column.name;
                return (
                  <TableHead
                    key={column.name}
                    className={cn(
                      column.sort ? "cursor-pointer select-none" : "",
                    )}
                    onClick={() => column.sort && handleSortClick(column.name)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      {column.tooltip && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info
                              size={14}
                              className="text-muted-foreground cursor-help"
                            />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{column.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {column.sort &&
                        isSorted &&
                        (sortDirection === "asc" ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        ))}
                    </span>
                  </TableHead>
                );
              })}
              {actions && (
                <TableHead className="sticky right-0 bg-background shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && !response?.success && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-6 text-sm text-red-500"
                >
                  {response?.error || "An error occurred while fetching data."}
                </TableCell>
              </TableRow>
            )}
            {!loading && response?.success && response.data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-6 text-sm text-gray-500"
                >
                  No results
                </TableCell>
              </TableRow>
            )}
            {response?.success &&
              response.data.map((datum) => (
                <TableRow key={datum.id}>
                  {columns.map((column) => {
                    const formattedValue = column.format
                      ? column.format(datum)
                      : datum[column.name]?.toString() || "";
                    return (
                      <TableCell key={column.name}>
                        {column.linkTo ? (
                          <TableLink href={column.linkTo(datum)}>
                            {formattedValue}
                          </TableLink>
                        ) : (
                          formattedValue
                        )}
                      </TableCell>
                    );
                  })}
                  {actions && (
                    <TableCell className="sticky right-0 bg-background shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                      {actions(datum)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div
          className={cn(
            "w-full flex justify-end",
            loading ? "pointer-events-none opacity-20" : "",
          )}
        >
          <div>
            <Pagination>
              <PaginationContent className="rounded-md border p-1 shadow-xs">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>

                {page > 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(1)}>
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}

                {page > 4 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {page > 3 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(page - 2)}>
                      {page - 2}
                    </PaginationLink>
                  </PaginationItem>
                )}

                {page > 2 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(page - 1)}>
                      {page - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationLink isActive>{page}</PaginationLink>
                </PaginationItem>

                {page < totalPages - 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(page + 1)}>
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>
                )}

                {page < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(page + 2)}>
                      {page + 2}
                    </PaginationLink>
                  </PaginationItem>
                )}

                {page < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {totalPages > 1 && page !== totalPages && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(totalPages)}>
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
