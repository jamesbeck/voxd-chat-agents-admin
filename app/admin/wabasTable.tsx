"use client";

import DataTable from "@/components/adminui/Table";
import { Badge } from "@/components/ui/badge";
import saGetWabaTableData from "@/actions/saGetWabaTableData";
import { cn } from "@/lib/utils";
import TableActions from "@/components/admin/TableActions";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

//   name: waba.name,
//   organisationReviewStatus: waba.organisation_review_status,
//   canSendMessage: waba.health_status?.can_send_message,
//   subscribedApps:
//     waba.subscribed_apps?.data.map(
//       (app) => app.whatsapp_business_api_data.name
//     ) || [],
//   phoneNumbers:
//     waba.phone_numbers?.data.map(
//       (phoneNumber) => phoneNumber.display_phone_number
//     ) || [],
//   id: waba.id,
// }

const WabasTable = () => {
  const columns = [
    { label: "ID", name: "id", sort: true },
    { label: "Waba Name", name: "name", sort: true },
    { label: "Business Name", name: "businessName", sort: true },
    { label: "App", name: "appName", sort: true },
    {
      label: "Status",
      name: "accountReviewStatus",
      sort: true,
      format: (row: any) => (
        <Badge
          className={cn(
            row.accountReviewStatus == "APPROVED"
              ? "bg-green-500"
              : "bg-red-500",
          )}
        >
          {row.accountReviewStatus}
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
                  open={entity.errors ? undefined : false}
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
                  <TooltipContent>
                    {entity.errors &&
                      entity.errors.map((error: any) => (
                        <div key={error.error_code}>
                          <p>Error Code: {error.error_code}</p>
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
    // {
    //   label: "Subscribed apps",
    //   name: "subscribed_apps",
    //   sort: true,
    //   format: (row: any) => {
    //     // console.log(value);
    //     return (
    //       <div>
    //         {(row.subscribed_apps.data || []).map((app: any) => {
    //           return (
    //             <Badge
    //               key={app.whatsapp_business_api_data.name}
    //               variant={
    //                 app.whatsapp_business_api_data.name == "SwiftReply"
    //                   ? "default"
    //                   : "destructive"
    //               }
    //             >
    //               {app.whatsapp_business_api_data.name}
    //             </Badge>
    //           );
    //         })}
    //       </div>
    //     );
    //   },
    // },
    // {
    //   label: "Phone numbers",
    //   name: "phone_numbers",
    //   sort: true,
    //   format: (row: any) => {
    //     // console.log(value);
    //     return (
    //       <div>
    //         {(row.phone_numbers.data || []).map((phoneNumber: any) => {
    //           return (
    //             <Badge key={phoneNumber.display_phone_number} variant="default">
    //               {phoneNumber.display_phone_number}
    //             </Badge>
    //           );
    //         })}
    //       </div>
    //     );
    //   },
    // },
  ];

  return (
    <DataTable
      columns={columns}
      defaultSort={{
        name: "name",
        direction: "asc",
      }}
      getData={saGetWabaTableData}
      actions={(row: any) => <TableActions href={`/wabas/${row.id}`} />}
    />
  );
};

export default WabasTable;
