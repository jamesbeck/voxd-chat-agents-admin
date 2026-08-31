"use client";

import saDeleteAgent from "@/actions/saDeleteAgent";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CopyIcon,
  Code2,
  FlagIcon,
  MessageCircleIcon,
  Trash2Icon,
  Wrench,
} from "lucide-react";
import CloneAgentDialog from "./CloneAgentDialog";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReportAgentDialog from "./ReportAgentDialog";
import AgentTicketBadge from "./AgentTicketBadge";
import RecordActions from "@/components/admin/RecordActions";
import RunCustomFunctionDialog from "@/components/admin/RunCustomFunctionDialog";
import useAvailableCustomFunctions, {
  getAvailableCustomFunctionLabel,
} from "@/hooks/useAvailableCustomFunctions";

type AgentTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  createdByName: string | null;
  createdAt: Date;
};

export default function AgentActions({
  agentId,
  name,
  niceName,
  phoneNumber,
  organisationId,
  tickets,
  isSuperAdmin,
}: {
  agentId: string;
  name: string;
  niceName: string;
  phoneNumber: string;
  organisationId: string;
  tickets: AgentTicket[];
  isSuperAdmin: boolean;
}) {
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState<{
    url: string;
    label: string;
    filename: string;
  }>({
    url: "",
    label: "",
    filename: "",
  });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>();
  const qrRef = useRef<SVGSVGElement>(null);

  const { functions: customFunctions, isLoading: isLoadingCustomFunctions } =
    useAvailableCustomFunctions({
      agentId,
      allowedTargetScopes: ["agent"],
    });

  const router = useRouter();

  const whatsappUrl = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/\D/g, "")}`
    : "";

  const webClientUrl = `/web-chat/${agentId}`;
  const webWidgetUrl = `/web-chat/${agentId}?variant=widget`;

  const openQrDialog = (url: string, label: string, filename: string) => {
    setQrTarget({ url, label, filename });
    setQrDialogOpen(true);
  };

  const downloadQRCode = () => {
    const svg = qrRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${(niceName || name).replace(
        /[^a-z0-9]/gi,
        "_",
      )}_${qrTarget.filename}_qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const deleteAgent = async () => {
    setIsDeletingAgent(true);
    const saResponse = await saDeleteAgent({ agentId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting Agent: ${
          saResponse.error || "There was an error deleting the agent"
        }`,
      );
      setIsDeletingAgent(false);
      return;
    }
    // If successful
    toast.success(`Successfully deleted ${name}`);
    setIsDeletingAgent(false);
    router.push("/agents");
  };

  return (
    <>
      <RecordActions
        custom={
          <ButtonGroup>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <FlagIcon className="h-4 w-4 text-red-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Report issue for this agent</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AgentTicketBadge tickets={tickets} variant="button" />
          </ButtonGroup>
        }
        buttons={[
          ...(phoneNumber
            ? [
                {
                  buttons: [
                    {
                      label: "WA",
                      icon: <MessageCircleIcon />,
                      variant: "default" as const,
                      href: whatsappUrl,
                      target: "_blank",
                      tooltip: "Open this agent in WhatsApp.",
                    },
                    {
                      label: "WA QR",
                      variant: "outline" as const,
                      tooltip:
                        "Open a QR code that launches this agent in WhatsApp.",
                      onClick: () =>
                        openQrDialog(whatsappUrl, "WhatsApp", "whatsapp"),
                    },
                  ],
                },
              ]
            : []),
          {
            buttons: [
              {
                label: "Webchat",
                icon: <MessageCircleIcon />,
                variant: "default" as const,
                href: webClientUrl,
                target: "_blank",
                tooltip:
                  "Open the fullscreen webchat test page for this agent.",
              },
              {
                label: "Widget",
                icon: <MessageCircleIcon />,
                variant: "outline" as const,
                href: webWidgetUrl,
                target: "_blank",
                tooltip:
                  "Open the smaller webchat widget test page for this agent.",
              },
              {
                label: "Webchat QR",
                variant: "outline" as const,
                tooltip: "Open a QR code for the fullscreen webchat test page.",
                onClick: () =>
                  openQrDialog(
                    `${window.location.origin}/web-chat/${agentId}`,
                    "Web Client",
                    "web",
                  ),
              },
            ],
          },
        ]}
        dropdown={{
          loading: isDeletingAgent,
          groups: [
            {
              items: [
                {
                  label: "Embed Agent",
                  icon: <Code2 />,
                  href: `/agents/${agentId}/embed`,
                },
                ...(isLoadingCustomFunctions
                  ? [
                      {
                        label: "Loading custom functions...",
                        icon: <Wrench />,
                        loading: true,
                        disabled: true,
                      },
                    ]
                  : customFunctions.length > 0
                    ? customFunctions.map((customFunction) => ({
                        label:
                          customFunction.targetScopes.length > 1
                            ? `${getAvailableCustomFunctionLabel(customFunction)} (${customFunction.targetScopes.join(", ")})`
                            : getAvailableCustomFunctionLabel(customFunction),
                        icon: <Wrench />,
                        onSelect: () => {
                          setSelectedFunctionId(customFunction.id);
                          setRunDialogOpen(true);
                        },
                      }))
                    : [
                        {
                          label: "No custom functions available",
                          icon: <Wrench />,
                          disabled: true,
                        },
                      ]),
              ],
            },
            ...(isSuperAdmin
              ? [
                  {
                    items: [
                      {
                        label: "Clone Agent",
                        icon: <CopyIcon />,
                        onSelect: () => setCloneDialogOpen(true),
                      },
                      {
                        label: "Delete Agent",
                        icon: <Trash2Icon />,
                        danger: true,
                        confirm: {
                          title: `Delete ${name}`,
                          description: "This action cannot be undone.",
                          actionText: "Delete",
                          destructive: true,
                          onAction: deleteAgent,
                        },
                      },
                    ],
                  },
                ]
              : []),
          ],
        }}
      />

      <ReportAgentDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        agentId={agentId}
      />

      <CloneAgentDialog
        agentId={agentId}
        name={name}
        niceName={niceName}
        organisationId={organisationId}
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
      />

      <RunCustomFunctionDialog
        key={selectedFunctionId || "agent-custom-function"}
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        agentId={agentId}
        functions={customFunctions}
        initialFunctionId={selectedFunctionId}
        lockFunctionSelection
        allowedTargetScopes={["agent"]}
        description="Select an agent-level custom function to run for this agent."
      />

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{qrTarget.label} QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to open {niceName || name} via {qrTarget.label}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-6">
            <QRCodeSVG
              ref={qrRef}
              value={qrTarget.url}
              size={256}
              level="H"
              includeMargin
            />
          </div>
          <div className="flex justify-center pb-4">
            <Button onClick={downloadQRCode}>Save as Image</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
