import { notFound } from "next/navigation";
import { CheckCircle2, CircleX, SendHorizontal, User } from "lucide-react";
import db from "@/database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import userCanViewAgent from "@/lib/userCanViewAgent";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import H2 from "@/components/adminui/H2";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import TemplateSendAttemptsTable from "../../templateSendAttemptsTable";

export default async function Page({
  params,
}: {
  params: { agentId: string; templateMessageSendId: string };
}) {
  const agentId = (await params).agentId;
  const templateMessageSendId = (await params).templateMessageSendId;
  const accessToken = await verifyAccessToken();

  if (!(await userCanViewAgent({ agentId, accessToken }))) {
    return notFound();
  }

  const send = await db("templateMessageSend")
    .leftJoin("waTemplate", "templateMessageSend.templateId", "waTemplate.id")
    .leftJoin(
      "adminUser",
      "templateMessageSend.createdByAdminUserId",
      "adminUser.id",
    )
    .leftJoin(
      "templateMessageSendAttempt",
      "templateMessageSend.id",
      "templateMessageSendAttempt.templateMessageSendId",
    )
    .where("templateMessageSend.id", templateMessageSendId)
    .where("templateMessageSend.agentId", agentId)
    .groupBy(
      "templateMessageSend.id",
      "templateMessageSend.createdAt",
      "waTemplate.name",
      "adminUser.name",
    )
    .select(
      "templateMessageSend.id",
      "templateMessageSend.createdAt",
      "waTemplate.name as templateName",
      "adminUser.name as createdByAdminUserName",
      db.raw('count("templateMessageSendAttempt"."id")::int as "attemptCount"'),
      db.raw(
        'sum(case when "templateMessageSendAttempt"."success" = true then 1 else 0 end)::int as "successCount"',
      ),
      db.raw(
        'sum(case when "templateMessageSendAttempt"."success" = false then 1 else 0 end)::int as "failureCount"',
      ),
    )
    .first();

  if (!send) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Agents", href: "/agents" },
          { label: "Agent", href: `/agents/${agentId}` },
          {
            label: "Template History",
            href: `/agents/${agentId}?tab=template-history`,
          },
          { label: send.templateName || "Template Send" },
        ]}
      />
      <H1>{send.templateName || "Template Send"}</H1>
      <p className="mb-4 text-muted-foreground">
        This page shows every individual message attempt for the selected
        grouped template send.
      </p>
      <DataCard
        items={
          [
            {
              label: "Template",
              value: send.templateName || "Unknown template",
              icon: <SendHorizontal className="h-4 w-4" />,
            },
            {
              label: "Sent By",
              value: send.createdByAdminUserName || "Unknown admin",
              icon: <User className="h-4 w-4" />,
            },
            {
              label: "Recipients",
              value: String(send.attemptCount || 0),
              icon: <SendHorizontal className="h-4 w-4" />,
            },
            {
              label: "Successes",
              value: String(send.successCount || 0),
              icon: <CheckCircle2 className="h-4 w-4" />,
            },
            {
              label: "Failures",
              value: String(send.failureCount || 0),
              icon: <CircleX className="h-4 w-4" />,
            },
          ] satisfies DataItem[]
        }
      />

      <div className="mt-6">
        <H2>Individual Sends</H2>
        <p className="mb-4 text-muted-foreground">
          Every delivery attempt linked to this grouped send is listed below.
        </p>
        <TemplateSendAttemptsTable
          agentId={agentId}
          templateMessageSendId={templateMessageSendId}
        />
      </div>
    </Container>
  );
}
