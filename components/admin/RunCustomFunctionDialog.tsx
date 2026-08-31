"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import saGetAvailableCustomFunctions from "@/actions/saGetAvailableCustomFunctions";
import saRunCustomFunction from "@/actions/saRunCustomFunction";
import Alert from "@/components/admin/Alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type TargetScope = "agent" | "user" | "session";

type JsonSchemaProperty = {
  type?: string;
  title?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
};

type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

type CustomFunctionRecord = {
  id: string;
  agentId: string;
  key: string;
  name: string;
  niceName: string;
  description: string;
  humanReadableDescription: string;
  targetScopes: string[];
  inputSchema: JsonSchemaObject | null;
};

type RunState = {
  status: "success" | "error";
  message: string;
  error?: string;
  runId?: string;
};

type RunCustomFunctionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  allowedTargetScopes: TargetScope[];
  functions?: CustomFunctionRecord[];
  initialFunctionId?: string;
  lockFunctionSelection?: boolean;
  chatUserId?: string;
  sessionId?: string;
  title?: string;
  description?: string;
};

const getFunctionLabel = (customFunction: CustomFunctionRecord) =>
  customFunction.niceName || customFunction.name || customFunction.key;

const getFunctionDescription = (customFunction: CustomFunctionRecord) =>
  customFunction.humanReadableDescription || customFunction.description;

const getInitialValues = (schema: JsonSchemaObject | null) => {
  const nextValues: Record<string, string | boolean> = {};

  if (!schema?.properties) {
    return nextValues;
  }

  for (const [key, property] of Object.entries(schema.properties)) {
    if (property.default !== undefined) {
      if (typeof property.default === "boolean") {
        nextValues[key] = property.default;
      } else if (property.default !== null) {
        nextValues[key] = String(property.default);
      }
      continue;
    }

    if (property.type === "boolean") {
      nextValues[key] = false;
      continue;
    }

    nextValues[key] = "";
  }

  return nextValues;
};

const buildInputPayload = ({
  schema,
  values,
}: {
  schema: JsonSchemaObject | null;
  values: Record<string, string | boolean>;
}) => {
  const nextInput: Record<string, unknown> = {};
  const nextErrors: Record<string, string> = {};

  if (!schema?.properties) {
    return {
      input: nextInput,
      fieldErrors: nextErrors,
    };
  }

  const requiredFields = new Set(schema.required || []);

  for (const [key, property] of Object.entries(schema.properties)) {
    const rawValue = values[key];
    const label = property.title || key;
    const isRequired = requiredFields.has(key);

    if (property.type === "boolean") {
      nextInput[key] = Boolean(rawValue);
      continue;
    }

    if (typeof rawValue !== "string") {
      if (isRequired) {
        nextErrors[key] = `${label} is required`;
      }
      continue;
    }

    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
      if (isRequired) {
        nextErrors[key] = `${label} is required`;
      }
      continue;
    }

    if (property.type === "integer" || property.type === "number") {
      const parsedNumber = Number(trimmedValue);

      if (Number.isNaN(parsedNumber)) {
        nextErrors[key] = `${label} must be a valid number`;
        continue;
      }

      nextInput[key] =
        property.type === "integer" ? Math.trunc(parsedNumber) : parsedNumber;
      continue;
    }

    if (property.type === "object" || property.type === "array") {
      try {
        nextInput[key] = JSON.parse(trimmedValue);
      } catch {
        nextErrors[key] = `${label} must be valid JSON`;
      }
      continue;
    }

    nextInput[key] = trimmedValue;
  }

  return {
    input: nextInput,
    fieldErrors: nextErrors,
  };
};

export default function RunCustomFunctionDialog({
  open,
  onOpenChange,
  agentId,
  allowedTargetScopes,
  functions: providedFunctions,
  initialFunctionId,
  lockFunctionSelection = false,
  chatUserId,
  sessionId,
  title = "Run Custom Function",
  description = "Select a function, review its inputs, and confirm the run.",
}: RunCustomFunctionDialogProps) {
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loadedFunctions, setLoadedFunctions] = useState<
    CustomFunctionRecord[]
  >([]);
  const [selectedFunctionId, setSelectedFunctionId] = useState(
    initialFunctionId || "",
  );
  const [runInBackground, setRunInBackground] = useState(false);
  const [selectedScope, setSelectedScope] = useState<TargetScope | "">("");
  const [inputValues, setInputValues] = useState<
    Record<string, string | boolean>
  >({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [runState, setRunState] = useState<RunState | null>(null);
  const router = useRouter();

  const functions = providedFunctions || loadedFunctions;

  const applyFunctionSelection = useCallback(
    (
      nextFunctionId: string,
      nextFunctions: CustomFunctionRecord[] = functions,
    ) => {
      const nextFunction = nextFunctions.find(
        (customFunction) => customFunction.id === nextFunctionId,
      );
      const nextAvailableScopes = nextFunction
        ? nextFunction.targetScopes.filter((scope): scope is TargetScope =>
            allowedTargetScopes.includes(scope as TargetScope),
          )
        : [];

      setSelectedFunctionId(nextFunctionId);
      setFieldErrors({});
      setRunState(null);
      setInputValues(getInitialValues(nextFunction?.inputSchema || null));
      setSelectedScope((currentValue) => {
        if (currentValue && nextAvailableScopes.includes(currentValue)) {
          return currentValue;
        }

        return nextAvailableScopes.length === 1 ? nextAvailableScopes[0] : "";
      });
    },
    [allowedTargetScopes, functions],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFieldErrors({});
      setRunState(null);
    }

    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (providedFunctions) {
      return;
    }

    if (!open) {
      return;
    }

    let isMounted = true;

    const loadFunctions = async () => {
      setIsLoadingFunctions(true);

      const response = await saGetAvailableCustomFunctions({ agentId });

      if (!isMounted) {
        return;
      }

      if (!response.success) {
        toast.error(response.error || "Failed to load custom functions");
        setLoadedFunctions([]);
        setSelectedFunctionId("");
        setInputValues({});
        setIsLoadingFunctions(false);
        return;
      }

      const nextFunctions = (response.data || []) as CustomFunctionRecord[];
      const scopedFunctions = nextFunctions.filter((customFunction) =>
        customFunction.targetScopes.some((scope) =>
          allowedTargetScopes.includes(scope as TargetScope),
        ),
      );

      setLoadedFunctions(scopedFunctions);
      const nextFunctionId = initialFunctionId
        ? initialFunctionId
        : scopedFunctions.some(
              (customFunction) => customFunction.id === selectedFunctionId,
            )
          ? selectedFunctionId
          : (scopedFunctions[0]?.id ?? "");
      applyFunctionSelection(nextFunctionId, scopedFunctions);
      setIsLoadingFunctions(false);
    };

    void loadFunctions();

    return () => {
      isMounted = false;
    };
  }, [
    agentId,
    allowedTargetScopes,
    applyFunctionSelection,
    initialFunctionId,
    open,
    providedFunctions,
    selectedFunctionId,
  ]);

  const selectedFunction = useMemo(
    () =>
      functions.find(
        (customFunction) => customFunction.id === selectedFunctionId,
      ),
    [functions, selectedFunctionId],
  );

  const availableScopes = useMemo(() => {
    if (!selectedFunction) {
      return [] as TargetScope[];
    }

    return selectedFunction.targetScopes.filter((scope): scope is TargetScope =>
      allowedTargetScopes.includes(scope as TargetScope),
    );
  }, [allowedTargetScopes, selectedFunction]);

  const handleRun = async () => {
    if (!selectedFunction) {
      toast.error("Select a custom function first");
      return;
    }

    const resolvedScope =
      selectedScope ||
      (availableScopes.length === 1 ? availableScopes[0] : undefined);

    if (!resolvedScope) {
      toast.error("Select a target scope before running the function");
      return;
    }

    const { input, fieldErrors: nextErrors } = buildInputPayload({
      schema: selectedFunction.inputSchema,
      values: inputValues,
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast.error("Check the required function inputs");
      return;
    }

    setFieldErrors({});
    setRunState(null);
    setIsRunning(true);

    const response = await saRunCustomFunction({
      agentId,
      functionKey: selectedFunction.key,
      mode: runInBackground ? "async" : "sync",
      targetScope: resolvedScope,
      chatUserId,
      sessionId,
      input,
    });

    setIsRunning(false);

    if (!response.success) {
      const runId =
        response.data && typeof response.data.runId === "string"
          ? response.data.runId
          : undefined;

      setRunState({
        status: "error",
        message: "Custom function failed.",
        error: response.error || "Failed to run custom function",
        runId,
      });
      toast.error(response.error || "Failed to run custom function");
      return;
    }

    const runId =
      response.data && typeof response.data.runId === "string"
        ? response.data.runId
        : undefined;

    if (runInBackground) {
      onOpenChange(false);
      toast.success("Custom function queued successfully", {
        action: runId
          ? {
              label: "View run",
              onClick: () =>
                router.push(`/custom-function-runs/${runId}`),
            }
          : undefined,
      });
      return;
    }

    setRunState({
      status: "success",
      message: "Custom function completed successfully.",
      runId,
    });
    toast.success("Custom function completed successfully");
  };

  const renderInputField = (key: string, property: JsonSchemaProperty) => {
    const label = property.title || key;
    const value = inputValues[key];
    const error = fieldErrors[key];
    const descriptionText = property.description;
    const isRequired = Boolean(
      selectedFunction?.inputSchema?.required?.includes(key),
    );

    let field: React.ReactNode = null;

    if (property.type === "boolean") {
      field = (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor={`custom-function-input-${key}`}>{label}</Label>
            {descriptionText && (
              <p className="text-sm text-muted-foreground">{descriptionText}</p>
            )}
          </div>
          <Switch
            id={`custom-function-input-${key}`}
            checked={Boolean(value)}
            onCheckedChange={(checked) =>
              setInputValues((currentValue) => ({
                ...currentValue,
                [key]: checked,
              }))
            }
          />
        </div>
      );
    } else if (property.enum && property.enum.length > 0) {
      field = (
        <div className="space-y-2">
          <Label htmlFor={`custom-function-input-${key}`}>
            {label}
            {isRequired ? " *" : ""}
          </Label>
          {descriptionText && (
            <p className="text-sm text-muted-foreground">{descriptionText}</p>
          )}
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(nextValue) =>
              setInputValues((currentValue) => ({
                ...currentValue,
                [key]: nextValue,
              }))
            }
          >
            <SelectTrigger
              id={`custom-function-input-${key}`}
              className="w-full"
            >
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {property.enum.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    } else if (property.type === "object" || property.type === "array") {
      field = (
        <div className="space-y-2">
          <Label htmlFor={`custom-function-input-${key}`}>
            {label}
            {isRequired ? " *" : ""}
          </Label>
          {descriptionText && (
            <p className="text-sm text-muted-foreground">{descriptionText}</p>
          )}
          <Textarea
            id={`custom-function-input-${key}`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) =>
              setInputValues((currentValue) => ({
                ...currentValue,
                [key]: event.target.value,
              }))
            }
            placeholder={property.type === "array" ? "[]" : "{}"}
            rows={5}
          />
        </div>
      );
    } else {
      field = (
        <div className="space-y-2">
          <Label htmlFor={`custom-function-input-${key}`}>
            {label}
            {isRequired ? " *" : ""}
          </Label>
          {descriptionText && (
            <p className="text-sm text-muted-foreground">{descriptionText}</p>
          )}
          <Input
            id={`custom-function-input-${key}`}
            type={
              property.type === "integer" || property.type === "number"
                ? "number"
                : "text"
            }
            value={typeof value === "string" ? value : ""}
            onChange={(event) =>
              setInputValues((currentValue) => ({
                ...currentValue,
                [key]: event.target.value,
              }))
            }
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        {field}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {selectedFunction ? getFunctionLabel(selectedFunction) : title}
          </DialogTitle>
          <DialogDescription>
            {selectedFunction
              ? getFunctionDescription(selectedFunction)
              : description}
          </DialogDescription>
        </DialogHeader>

        {isLoadingFunctions ? (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner />
          </div>
        ) : functions.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No manually runnable custom functions are available for this record.
          </div>
        ) : (
          <div className="space-y-4">
            {!lockFunctionSelection && (
              <div className="space-y-2">
                <Label htmlFor="custom-function-select">Function</Label>
                <Select
                  value={selectedFunctionId}
                  onValueChange={applyFunctionSelection}
                >
                  <SelectTrigger id="custom-function-select" className="w-full">
                    <SelectValue placeholder="Select a custom function" />
                  </SelectTrigger>
                  <SelectContent>
                    {functions.map((customFunction) => (
                      <SelectItem
                        key={customFunction.id}
                        value={customFunction.id}
                      >
                        {getFunctionLabel(customFunction)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-md border p-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="run-in-background">Run in background</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this to queue the run instead of waiting for it to
                      complete in this dialog.
                    </p>
                  </div>
                  <Switch
                    id="run-in-background"
                    checked={runInBackground}
                    onCheckedChange={setRunInBackground}
                  />
                </div>
              </div>

              {availableScopes.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="custom-function-scope">Target scope</Label>
                  <Select
                    value={selectedScope}
                    onValueChange={(value: TargetScope) =>
                      setSelectedScope(value)
                    }
                  >
                    <SelectTrigger
                      id="custom-function-scope"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select a target scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableScopes.map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {scope}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedFunction?.inputSchema?.properties &&
              Object.entries(selectedFunction.inputSchema.properties).map(
                ([key, property]) => renderInputField(key, property),
              )}

            {runState && (
              <div
                className={`space-y-3 rounded-md border p-4 ${
                  runState.status === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="font-medium">{runState.message}</p>
                {runState.error && (
                  <p className="text-sm text-red-700">{runState.error}</p>
                )}
                {runState.runId && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/custom-function-runs/${runState.runId}`}
                    >
                      View run record
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Alert
            title={
              selectedFunction
                ? `Run ${getFunctionLabel(selectedFunction)}`
                : "Run custom function"
            }
            description="Are you sure you want to run this custom function now?"
            actionText={isRunning ? "Running..." : "Run Function"}
            onAction={() => {
              if (!isRunning) {
                void handleRun();
              }
            }}
          >
            <Button
              disabled={
                isRunning ||
                isLoadingFunctions ||
                !selectedFunction ||
                functions.length === 0
              }
            >
              {isRunning ? <Spinner /> : null}
              Run Function
            </Button>
          </Alert>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
