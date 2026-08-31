"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CopyTicketLinkButton({
  ticketId,
  partnerDomain,
}: {
  ticketId: string;
  partnerDomain: string | null;
}) {
  const copyLinkToClipboard = () => {
    const domain = partnerDomain || window.location.host;
    const protocol = partnerDomain ? "https" : window.location.protocol;
    const url = `${protocol}${
      partnerDomain ? "://" : "//"
    }${domain}/support-tickets/${ticketId}`;

    navigator.clipboard.writeText(url).then(
      () => {
        toast.success("Link copied to clipboard");
      },
      () => {
        toast.error("Failed to copy link");
      }
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={copyLinkToClipboard}
          className="h-8 w-8"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Copy link to this ticket</p>
      </TooltipContent>
    </Tooltip>
  );
}
