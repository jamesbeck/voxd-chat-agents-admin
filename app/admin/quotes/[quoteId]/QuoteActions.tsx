"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import saArchiveQuote from "@/actions/saArchiveQuote";
import saDeleteQuote from "@/actions/saDeleteQuote";
import saUnarchiveQuote from "@/actions/saUnarchiveQuote";
import {
  Trash2,
  UserCog,
  ExternalLink,
  Copy,
  CopyPlus,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import ChangeOwnerDialog from "./ChangeOwnerDialog";
import CloneQuoteDialog from "./CloneQuoteDialog";
import RecordActions, {
  type DropdownGroup,
} from "@/components/admin/RecordActions";

export default function QuoteActions({
  quoteId,
  shortLinkId,
  name,
  organisationName,
  organisationId,
  prototypingAgentId,
  archived,
  canDelete,
  createdByAdminUserId,
}: {
  quoteId: string;
  shortLinkId: string;
  name: string;
  organisationName: string;
  organisationId: string;
  prototypingAgentId: string | null;
  archived: boolean;
  canDelete: boolean;
  createdByAdminUserId: string | null;
}) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [changeOwnerOpen, setChangeOwnerOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

  const router = useRouter();

  const archiveQuote = async () => {
    setIsArchiving(true);
    const saResponse = await saArchiveQuote({ quoteId });

    if (!saResponse.success) {
      toast.error(
        `Error Archiving Quote: ${
          saResponse.error || "There was an error archiving the quote"
        }`,
      );
      setIsArchiving(false);
      return;
    }

    toast.success(`Successfully archived ${name}`);
    setIsArchiving(false);
    router.refresh();
  };

  const unarchiveQuote = async () => {
    setIsUnarchiving(true);
    const saResponse = await saUnarchiveQuote({ quoteId });

    if (!saResponse.success) {
      toast.error(
        `Error Unarchiving Quote: ${
          saResponse.error || "There was an error unarchiving the quote"
        }`,
      );
      setIsUnarchiving(false);
      return;
    }

    toast.success(`Successfully unarchived ${name}`);
    setIsUnarchiving(false);
    router.refresh();
  };

  const deleteQuote = async () => {
    setIsDeleting(true);
    const saResponse = await saDeleteQuote({ quoteId });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting Quote: ${
          saResponse.error || "There was an error deleting the quote"
        }`,
      );
      setIsDeleting(false);
      return;
    }

    toast.success(`Successfully deleted ${name}`);
    router.push("/admin/quotes");
  };

  const dropdownGroups: DropdownGroup[] = [
    {
      items: [
        {
          label: "View Concept",
          icon: <ExternalLink />,
          href: `/concepts/${shortLinkId}`,
          target: "_blank",
        },
        {
          label: "Copy Concept Link",
          icon: <Copy />,
          onSelect: () => {
            navigator.clipboard.writeText(
              `${window.location.origin}/concepts/${shortLinkId}`,
            );
            toast.success("Concept link copied to clipboard");
          },
        },
      ],
    },
    {
      items: [
        {
          label: "View Proposal",
          icon: <ExternalLink />,
          href: `/proposals/${shortLinkId}`,
          target: "_blank",
        },
        {
          label: "Copy Proposal Link",
          icon: <Copy />,
          onSelect: () => {
            navigator.clipboard.writeText(
              `${window.location.origin}/proposals/${shortLinkId}`,
            );
            toast.success("Proposal link copied to clipboard");
          },
        },
      ],
    },
  ];

  if (prototypingAgentId) {
    const prototypeUrl = `/prototypes/${shortLinkId}`;
    dropdownGroups.push({
      items: [
        {
          label: "Test Prototype",
          icon: <ExternalLink />,
          href: prototypeUrl,
          target: "_blank",
        },
        {
          label: "Copy Prototype Link",
          icon: <Copy />,
          onSelect: () => {
            navigator.clipboard.writeText(
              `${window.location.origin}/prototypes/${shortLinkId}`,
            );
            toast.success("Prototype link copied to clipboard");
          },
        },
      ],
    });
  }

  dropdownGroups.push({
    items: [
      archived
        ? {
            label: "Unarchive Quote",
            icon: <ArchiveRestore />,
            loading: isUnarchiving,
            confirm: {
              title: `Unarchive ${name}`,
              description:
                "Are you sure you want to unarchive this quote? Editing will be enabled again.",
              actionText: "Unarchive Quote",
              onAction: unarchiveQuote,
            },
          }
        : {
            label: "Archive Quote",
            icon: <Archive />,
            loading: isArchiving,
            confirm: {
              title: `Archive ${name}`,
              description:
                "Are you sure you want to archive this quote? Archived quotes become read-only until unarchived.",
              actionText: "Archive Quote",
              onAction: archiveQuote,
            },
          },
    ],
  });

  const managementItems = [
    {
      label: "Clone to Organisation",
      icon: <CopyPlus />,
      onSelect: () => setCloneDialogOpen(true),
    },
  ];
  if (canDelete) {
    managementItems.push({
      label: "Change Owner",
      icon: <UserCog />,
      onSelect: () => setChangeOwnerOpen(true),
    });
  }
  dropdownGroups.push({ items: managementItems });

  if (canDelete) {
    dropdownGroups.push({
      items: [
        {
          label: "Delete Quote",
          icon: <Trash2 />,
          danger: true,
          loading: isDeleting,
          confirm: {
            title: `Delete ${name}`,
            description:
              "Are you sure you want to delete this quote? This action cannot be undone.",
            actionText: "Delete Quote",
            destructive: true,
            onAction: deleteQuote,
          },
        },
      ],
    });
  }

  return (
    <>
      <RecordActions
        dropdown={{
          loading: isDeleting || isArchiving || isUnarchiving,
          groups: dropdownGroups,
        }}
      />

      <ChangeOwnerDialog
        quoteId={quoteId}
        createdByAdminUserId={createdByAdminUserId}
        open={changeOwnerOpen}
        onOpenChange={setChangeOwnerOpen}
      />

      <CloneQuoteDialog
        quoteId={quoteId}
        quoteName={name}
        organisationName={organisationName}
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
      />
    </>
  );
}
