import H2 from "@/components/adminui/H2";
import saGetAllModels from "@/actions/saGetAllModels";
import saGetAgentUsageStats from "@/actions/saGetAgentUsageStats";
import db from "@/database/db";
import { TrendingUp, MessageSquare, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AgentModelSettingsEditor from "./AgentModelSettingsEditor";

interface ModelTabProps {
  agentId: string;
  organisationId?: string;
  currentModelId?: string;
  currentEmbeddingModelId?: string;
  currentProviderApiKeyId?: string;
  currentEmbeddingProviderApiKeyId?: string;
}

interface Model {
  id: string;
  providerId: string;
  provider: string;
  model: string;
  inputTokenCost: string | null;
  outputTokenCost: string | null;
  embeddings: boolean;
}

interface ProviderApiKeyOption {
  id: string;
  providerId: string;
  providerName: string;
  label: string;
}

export default async function ModelTab({
  agentId,
  organisationId,
  currentModelId,
  currentEmbeddingModelId,
  currentProviderApiKeyId,
  currentEmbeddingProviderApiKeyId,
}: ModelTabProps) {
  const modelsResponse = await saGetAllModels();
  const allModels = modelsResponse.success ? modelsResponse.data : [];

  const usageStatsResponse = await saGetAgentUsageStats(agentId);
  const usageStats = usageStatsResponse.success
    ? usageStatsResponse.data
    : null;

  const providerApiKeys: ProviderApiKeyOption[] = organisationId
    ? await db("providerApiKey")
        .leftJoin("provider", "providerApiKey.providerId", "provider.id")
        .where("providerApiKey.organisationId", organisationId)
        .select(
          "providerApiKey.id",
          "providerApiKey.providerId",
          "providerApiKey.key",
          "provider.name as providerName",
        )
        .orderBy("provider.name", "asc")
        .orderBy("providerApiKey.createdAt", "desc")
        .then((records) =>
          records.map((record) => ({
            id: record.id,
            providerId: record.providerId,
            providerName: record.providerName,
            label: `${record.providerName} — ${
              record.key && record.key.length > 12
                ? `${record.key.slice(0, 6)}...${record.key.slice(-4)}`
                : "***"
            }`,
          })),
        )
    : [];

  const formatTokens = (tokens: number) => {
    if (tokens === 0) return "0";
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(2)}K`;
    return tokens.toFixed(0);
  };

  return (
    <div className="space-y-8">
      {/* Usage Statistics */}
      <div>
        <H2 className="mb-4">Usage Statistics</H2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {/* Average Token Usage Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Avg. Token Usage Per Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {usageStats && usageStats.totalSessions > 0 ? (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        Input Tokens
                      </p>
                      <p className="text-2xl font-bold">
                        {formatTokens(usageStats.avgInputTokens)}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        Output Tokens
                      </p>
                      <p className="text-2xl font-bold">
                        {formatTokens(usageStats.avgOutputTokens)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>Based on {usageStats.totalSessions} sessions</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No usage data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cost Overview Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cost Per Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {usageStats && usageStats.totalSessions > 0 ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Average Cost
                    </p>
                    <p className="text-2xl font-bold">
                      ${usageStats.avgCostPerSession.toFixed(4)}
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>Based on {usageStats.totalSessions} sessions</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No cost data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cost Breakdown by Model */}
      {usageStats &&
        usageStats.modelBreakdown &&
        usageStats.modelBreakdown.length > 0 && (
          <div>
            <H2 className="mb-4">Cost Breakdown by Model</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usageStats.modelBreakdown.map((modelData) => (
                <Card key={modelData.modelId || modelData.modelName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {modelData.modelName}
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {modelData.provider}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Avg. Cost Per Session
                      </p>
                      <p className="text-2xl font-bold">
                        ${modelData.avgCostPerSession.toFixed(4)}
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {modelData.sessionCount} session
                        {modelData.sessionCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      {/* All Models by Provider */}
      <div>
        <H2 className="mb-4">All Available Models</H2>
        <AgentModelSettingsEditor
          agentId={agentId}
          models={allModels as Model[]}
          providerApiKeys={providerApiKeys}
          currentModelId={currentModelId}
          currentEmbeddingModelId={currentEmbeddingModelId}
          currentProviderApiKeyId={currentProviderApiKeyId}
          currentEmbeddingProviderApiKeyId={
            currentEmbeddingProviderApiKeyId
          }
          avgInputTokens={usageStats?.avgInputTokens}
          avgOutputTokens={usageStats?.avgOutputTokens}
          totalSessions={usageStats?.totalSessions}
        />
      </div>
    </div>
  );
}
