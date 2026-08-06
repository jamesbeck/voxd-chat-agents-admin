"use client";

import DataTable from "@/components/adminui/Table";
import { Badge } from "@/components/ui/badge";
import saRegisterPhoneNumber from "@/lib/meta/saRegisterPhoneNumber";
import saGetPhoneNumbersTableData from "@/actions/saGetPhoneNumbersTableData";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TableActions from "@/components/admin/TableActions";
import { getWhatsAppManagerUrl } from "@/lib/meta/getWhatsAppManagerUrl";

const PhoneNumberTable = () => {
  return (
    <DataTable
      getData={saGetPhoneNumbersTableData}
      defaultSort={{
        name: "verifiedName",
        direction: "asc",
      }}
      columns={[
        {
          label: "ID",
          name: "id",
          sort: true,
        },
        {
          label: "Number",
          name: "displayPhoneNumber",
          sort: true,
        },
        {
          label: "Meta ID",
          name: "metaId",
          sort: true,
        },
        {
          label: "Verified Name",
          name: "verifiedName",
          sort: true,
        },
        {
          label: "Status",
          name: "status",
          sort: true,
          format: (row) => (
            <Badge
              className={cn(
                row.status == "CONNECTED" ? "bg-green-500" : "bg-red-500",
              )}
            >
              {row.status}
            </Badge>
          ),
        },
        {
          label: "Platform Type",
          name: "platformType",
          sort: true,
          format: (row) => (
            <Badge
              className={cn(
                row.platformType == "CLOUD_API" ? "bg-green-500" : "bg-red-500",
              )}
            >
              {row.platformType}
            </Badge>
          ),
        },
        {
          label: "Account Mode",
          name: "accountMode",
          sort: true,
          format: (row) => (
            <Badge
              className={cn(
                row.accountMode == "LIVE" ? "bg-green-500" : "bg-red-500",
              )}
            >
              {row.accountMode}
            </Badge>
          ),
        },
        {
          label: "Send First Message",
          name: "healthStatus",
          sort: true,
          format: (row: any) => {
            return (
              <div className="flex gap-1">
                {row.healthStatus.entities.map((entity: any) => {
                  return (
                    <Tooltip
                      key={entity.id}
                      //only allow to open on hover if there are errors
                      open={
                        entity.can_send_message != "AVAILABLE" && entity.errors
                          ? undefined
                          : false
                      }
                    >
                      <TooltipTrigger>
                        <Badge
                          className={cn(
                            entity.can_send_message == "AVAILABLE"
                              ? "bg-green-500"
                              : "bg-red-500",
                          )}
                        >
                          {entity.entity_type}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="flex flex-col gap-2">
                        {entity.errors &&
                          entity.can_send_message != "AVAILABLE" &&
                          entity.errors.map((error: any) => (
                            <div key={error.error_code}>
                              <p className="font-bold">
                                Error Code: {error.error_code}
                              </p>
                              <p>Description: {error.error_description}</p>
                              <p>Solution: {error.possible_solution}</p>
                            </div>
                          ))}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
          },
        },
      ]}
      actions={(row: any) => {
        const whatsappManagerUrl = getWhatsAppManagerUrl({
          businessId: row.metaBusinessMetaId,
          assetId: row.whatsappBusinessAccountMetaId,
        });

        return (
          <TableActions
            buttons={[
              { label: "View", href: `/admin/phone-numbers/${row.id}` },
              {
                label: "Meta Manager",
                href: whatsappManagerUrl ?? undefined,
                target: "_blank",
                hidden: !whatsappManagerUrl,
              },
              {
                label: "Register",
                onClick: () =>
                  saRegisterPhoneNumber({ phoneNumberId: row.metaId }),
              },
              {
                label: "Message",
                href: `https://wa.me/${row.displayPhoneNumber.replace(/\D/g, "")}`,
                target: "_blank",
              },
            ]}
          />
        );
      }}
    />
  );
};

export default PhoneNumberTable;
