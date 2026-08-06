"use client";

import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { format, formatDistance } from "date-fns";
import saGetAgentTableData from "@/actions/saGetAgentTableData";
import { useRef, useState } from "react";
import TableActions from "@/components/admin/TableActions";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getWhatsAppManagerUrl } from "@/lib/meta/getWhatsAppManagerUrl";

const AgentsTable = ({ isSuperAdmin }: { isSuperAdmin: boolean }) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedWhatsAppUrl, setSelectedWhatsAppUrl] = useState("");
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const qrRef = useRef<SVGSVGElement>(null);

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
      downloadLink.download = `${selectedAgentName.replace(
        /[^a-z0-9]/gi,
        "_",
      )}_whatsapp_qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const columns = [
    {
      label: "Name",
      name: "niceName",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/admin/agents/${row.id}`}>{row.niceName}</TableLink>
      ),
    },
    {
      label: "Organisation",
      name: "organisationName",
      format: (row: any) => {
        if (!row.organisationId) {
          return <span className="text-muted-foreground">None</span>;
        }
        return (
          <TableLink href={`/admin/organisations/${row.organisationId}`}>
            {row.organisationName}
          </TableLink>
        );
      },
    },
    ...(isSuperAdmin
      ? [
          {
            label: "Partner",
            name: "partnerName",
            format: (row: any) => {
              if (!row.partnerId) {
                return <span className="text-muted-foreground">None</span>;
              }
              return (
                <TableLink href={`/admin/organisations/${row.partnerId}`}>
                  {row.partnerName}
                </TableLink>
              );
            },
          },
        ]
      : []),
    {
      label: "Phone Number",
      name: "phoneNumber",
      sort: true,
      format: (row: any) => {
        if (!row.phoneNumberId) {
          return <span className="text-muted-foreground">None</span>;
        }
        if (isSuperAdmin) {
          return (
            <TableLink href={`/admin/phone-numbers/${row.phoneNumberId}`}>
              {row.phoneNumber}
            </TableLink>
          );
        }
        return row.phoneNumber;
      },
    },
    {
      label: "Sessions",
      name: "sessionCount",
      sort: true,
      tooltip: "Live sessions only (excludes development)",
    },
    {
      label: "Messages",
      name: "messageCount",
      sort: true,
      tooltip: "Messages from live sessions only (excludes development)",
    },
    {
      label: "Last Message",
      name: "lastMessageAt",
      sort: true,
      tooltip: "Last message from live sessions only (excludes development)",
      format: (row: any) => {
        const value = row.lastMessageAt;
        return value
          ? `${format(value, "dd/MM/yyyy HH:mm")} (${formatDistance(
              value,
              new Date(),
            )})`
          : "Never";
      },
    },
  ];

  const actions = (row: any) => {
    const whatsappUrl = row.phoneNumber
      ? `https://wa.me/${row.phoneNumber.replace(/\D/g, "")}`
      : "";
    const whatsappManagerUrl = getWhatsAppManagerUrl({
      businessId: row.metaBusinessMetaId,
      assetId: row.whatsappBusinessAccountMetaId,
    });

    return (
      <TableActions
        buttons={[
          { label: "View", href: `/admin/agents/${row.id}` },
          {
            label: "Meta Manager",
            href: whatsappManagerUrl ?? undefined,
            target: "_blank",
            hidden: !whatsappManagerUrl,
          },
          {
            label: "Link",
            href: whatsappUrl,
            target: "_blank",
            hidden: !row.phoneNumber,
          },
          {
            label: "QR Code",
            variant: "outline",
            hidden: !row.phoneNumber,
            onClick: () => {
              setSelectedWhatsAppUrl(whatsappUrl);
              setSelectedAgentName(row.niceName || row.name);
              setQrDialogOpen(true);
            },
          },
        ]}
      />
    );
  };

  return (
    <>
      <DataTable
        columns={columns}
        defaultSort={{
          name: "niceName",
          direction: "asc",
        }}
        actions={actions}
        getData={saGetAgentTableData}
      />

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to message {selectedAgentName} on WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-6">
            <QRCodeSVG
              ref={qrRef}
              value={selectedWhatsAppUrl}
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
};

export default AgentsTable;
