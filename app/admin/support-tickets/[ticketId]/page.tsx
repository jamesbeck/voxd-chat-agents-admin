import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import saGetSupportTicketById from "@/actions/saGetSupportTicketById";
import { format, formatDistance } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  Calendar,
  User,
  Bot,
  Building2,
  FileText,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";
import TicketComments from "./ticketComments";
import TicketStatusDropdown from "./ticketStatusDropdown";
import TicketActions from "./ticketActions";
import CopyTicketLinkButton from "./copyTicketLinkButton";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

export default async function Page({
  params,
  searchParams,
}: {
  params: { ticketId: string };
  searchParams: { tab?: string };
}) {
  const ticketId = (await params).ticketId;
  const activeTab = (await searchParams).tab || "info";

  const result = await saGetSupportTicketById({ ticketId });

  if (!result.success) {
    return notFound();
  }

  const ticket = result.data;
  const token = await verifyAccessToken();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-red-500";
      case "in progress":
        return "bg-blue-500";
      case "awaiting client":
        return "bg-orange-500";
      case "closed":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Support Tickets", href: "/support-tickets" },
          { label: `#${ticket.ticketNumber}` },
        ]}
      />

      <H1 className="flex items-center gap-3">
        <span>
          <span className="text-muted-foreground">#{ticket.ticketNumber}</span>{" "}
          {ticket.title}
        </span>
        <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
      </H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "info",
            label: "Info",
            href: `/support-tickets/${ticketId}?tab=info`,
          },
          {
            value: "comments",
            label: "Comments",
            href: `/support-tickets/${ticketId}?tab=comments`,
          },
        ]}
        actions={
          <>
            {token.superAdmin && (
              <TicketStatusDropdown
                ticketId={ticketId}
                currentStatus={ticket.status}
              />
            )}
            <CopyTicketLinkButton
              ticketId={ticketId}
              partnerDomain={ticket.partnerDomain}
            />
            <Button asChild variant="outline" size="sm">
              <Link href="/support-tickets">
                <ChevronLeft className="h-4 w-4" />
                Back to Tickets
              </Link>
            </Button>
            {token.superAdmin && (
              <TicketActions
                ticketId={ticketId}
                ticketNumber={ticket.ticketNumber}
                title={ticket.title}
                description={ticket.description || undefined}
              />
            )}
          </>
        }
      >
        <TabsContent value="info">
          <Container>
            <DataCard
              items={
                [
                  {
                    label: "Ticket Number",
                    value: `#${ticket.ticketNumber}`,
                    icon: <Ticket className="h-4 w-4" />,
                  },
                  {
                    label: "Status",
                    value: (
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    ),
                    icon: <FileText className="h-4 w-4" />,
                  },
                  {
                    label: "Created",
                    value: format(ticket.createdAt, "dd/MM/yyyy HH:mm"),
                    description: formatDistance(ticket.createdAt, new Date(), {
                      addSuffix: true,
                    }),
                    icon: <Calendar className="h-4 w-4" />,
                  },
                  {
                    label: "Created By",
                    value:
                      ticket.createdByName ||
                      ticket.createdByEmail ||
                      "Unknown",
                    icon: <User className="h-4 w-4" />,
                  },
                  ticket.agentId && ticket.agentName
                    ? {
                        label: "Agent",
                        value: (
                          <Link
                            href={`/agents/${ticket.agentId}`}
                            className="text-primary hover:underline"
                          >
                            {ticket.agentName}
                          </Link>
                        ),
                        icon: <Bot className="h-4 w-4" />,
                      }
                    : null,
                  {
                    label: "Organisation",
                    value: (
                      <Link
                        href={`/organisations/${ticket.organisationId}`}
                        className="text-primary hover:underline"
                      >
                        {ticket.organisationName}
                      </Link>
                    ),
                    icon: <Building2 className="h-4 w-4" />,
                  },
                ].filter(Boolean) as DataItem[]
              }
            />

            {ticket.description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Description
                </h3>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
              </div>
            )}

            {ticket.sessionId && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {ticket.userMessageText || ticket.assistantMessageText
                      ? "Reported Message"
                      : "Related Session"}
                  </h3>
                  <Link
                    href={`/sessions/${ticket.sessionId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View Session →
                  </Link>
                </div>
                {ticket.userMessageText || ticket.assistantMessageText ? (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm whitespace-pre-wrap">
                      {ticket.userMessageText || ticket.assistantMessageText}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      This ticket was created for the entire session.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Container>
        </TabsContent>

        <TabsContent value="comments">
          <Container>
            <TicketComments ticketId={ticketId} ticketStatus={ticket.status} />
          </Container>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
