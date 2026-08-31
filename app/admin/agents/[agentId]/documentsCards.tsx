"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import saGetDocumentTableData from "@/actions/saGetDocumentTableData";
import saSearchKnowledgeByEmbedding, {
  KnowledgeBlockSearchResult,
} from "@/actions/saSearchKnowledgeByEmbedding";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import {
  FileText,
  Layers,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { getKnowledgeDocumentSourceLabel } from "@/lib/knowledgeDocumentSource";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Document {
  id: string;
  title: string;
  description: string;
  sourceType: string;
  blockCount: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const DocumentsCards = ({ agentId }: { agentId: string }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchResults, setSearchResults] = useState<
    KnowledgeBlockSearchResult[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Actual query sent to search
  const [sortField, setSortField] = useState("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      const result = await saGetDocumentTableData({
        agentId,
        search: "",
        sortField,
        sortDirection,
        page: 1,
        pageSize: 100,
      });

      if (result.success && result.data) {
        setDocuments(result.data as Document[]);
      }
      setLoading(false);
    };

    fetchDocuments();
  }, [agentId, sortField, sortDirection]);

  // Semantic search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      const result = await saSearchKnowledgeByEmbedding({
        agentId,
        query: searchQuery,
        similarityThreshold,
      });

      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    };

    performSearch();
  }, [agentId, searchQuery, similarityThreshold]);

  const handleSearch = () => {
    setSearchQuery(search);
  };

  const handleClearSearch = () => {
    setSearch("");
    setSearchQuery("");
  };

  const displayDocuments = searchQuery ? searchResults : null;

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge using AI embeddings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={!search.trim()}>
            <Sparkles className="h-4 w-4 mr-2" />
            Search
          </Button>
          {searchQuery && (
            <Button variant="outline" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </div>

        {/* Advanced Search Options */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              {advancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Advanced Search
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="similarity">
                  Similarity Threshold: {similarityThreshold.toFixed(2)}
                </Label>
                <span className="text-sm text-muted-foreground">
                  Higher = stricter matches
                </span>
              </div>
              <Slider
                id="similarity"
                min={0}
                max={1}
                step={0.05}
                value={[similarityThreshold]}
                onValueChange={(value: number[]) =>
                  setSimilarityThreshold(value[0])
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.0 (Loose)</span>
                <span>1.0 (Exact)</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Sort controls - only show when not searching */}
        {!searchQuery && (
          <Select
            value={`${sortField}-${sortDirection}`}
            onValueChange={(value) => {
              const [field, direction] = value.split("-");
              setSortField(field);
              setSortDirection(direction as "asc" | "desc");
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
              <SelectItem value="blockCount-desc">Most Blocks</SelectItem>
              <SelectItem value="blockCount-asc">Least Blocks</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading State */}
      {(loading || isSearching) && (
        <div className="text-center py-8 text-muted-foreground">
          {isSearching ? "Searching knowledge base..." : "Loading documents..."}
        </div>
      )}

      {/* Empty State */}
      {!loading && !isSearching && !searchQuery && documents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No documents yet. Create one to get started.
        </div>
      )}

      {/* Search Results with Individual Block Cards */}
      {!isSearching && searchQuery && (
        <>
          {displayDocuments && displayDocuments.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Found {displayDocuments.length} matching blocks</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayDocuments.map((block) => (
                  <Card
                    key={block.blockId}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {(block.similarity * 100).toFixed(1)}% match
                            </Badge>
                            <Badge
                              className={
                                block.documentEnabled
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500 hover:bg-gray-600"
                              }
                            >
                              {block.documentEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <CardTitle className="text-base mb-1">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 flex-shrink-0" />
                              Block {block.blockIndex}
                              {block.title && (
                                <span className="text-sm font-normal text-muted-foreground line-clamp-1">
                                  - {block.title}
                                </span>
                              )}
                            </div>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            From: {block.documentTitle}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-4 mb-4">
                        {block.content}
                      </p>
                    </CardContent>

                    <CardFooter className="border-t flex gap-2">
                      <Button
                        asChild
                        className="flex-1"
                        variant="outline"
                        size="sm"
                      >
                        <Link
                          href={`/agents/${agentId}/documents/${block.documentId}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Document
                        </Link>
                      </Button>
                      <Button asChild className="flex-1" size="sm">
                        <Link
                          href={`/agents/${agentId}/documents/${block.documentId}/knowledge-blocks/${block.blockId}`}
                        >
                          <Layers className="h-3 w-3 mr-1" />
                          Block
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No matching blocks found. Try lowering the similarity threshold or
              using different search terms.
            </div>
          )}
        </>
      )}

      {/* Regular Document Cards - only show when not searching */}
      {!loading && !isSearching && !searchQuery && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="hover:shadow-lg transition-shadow flex flex-col"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="line-clamp-2 mb-1">
                      {doc.title}
                    </CardTitle>
                    {doc.description && (
                      <CardDescription className="line-clamp-2">
                        {doc.description}
                      </CardDescription>
                    )}
                  </div>
                  <CardAction>
                    <Badge
                      className={
                        doc.enabled
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-500 hover:bg-gray-600"
                      }
                    >
                      {doc.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {doc.blockCount}{" "}
                      {doc.blockCount === 1 ? "block" : "blocks"}
                    </span>
                  </div>

                  {doc.sourceType && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {getKnowledgeDocumentSourceLabel(doc.sourceType)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Created {format(new Date(doc.createdAt), "dd/MM/yyyy")}
                    </span>
                  </div>

                  {doc.updatedAt !== doc.createdAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Updated {format(new Date(doc.updatedAt), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="border-t mt-auto">
                <Button asChild className="w-full" variant="outline">
                  <Link
                    href={`/agents/${agentId}/documents/${doc.id}`}
                    className="flex items-center justify-center gap-2"
                  >
                    View Document
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsCards;
