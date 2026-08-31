import getUserById from "@/lib/getChatUserById";
import H1 from "@/components/adminui/H1";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import SessionsTable from "./sessionsTable";
import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import { ChatUser } from "@/types/types";
import NewUserForm from "./newUserForm";
import { notFound } from "next/navigation";
import UserActions from "./UserActions";
import EditUserForm from "./editUserForm";
import H2 from "@/components/adminui/H2";
import getAgents from "@/lib/getAgents";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import SendTemplateTab from "./sendTemplateTab";
import JsonDataEditor from "./JsonDataEditor";
import getAgentById from "@/lib/getAgentById";
import TemplateSendHistoryTable from "./templateSendHistoryTable";

export default async function Page({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams: { tab?: string };
}) {
  const token = await verifyAccessToken();

  const userId = (await params).userId;
  const activeTab = (await searchParams).tab || "sessions";

  let user: ChatUser | null = null;
  let agent;

  if (userId && userId != "new") user = await getUserById({ userId: userId });

  if (user?.agentId) {
    agent = await getAgentById({ agentId: user.agentId });
  }

  if (!user && userId !== "new") return notFound();

  //get all agents for the edit form
  const agents = await getAgents();

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={
          agent
            ? [
                { label: "Admin", href: "/" },
                { label: "Agents", href: "/agents" },
                {
                  label: agent.niceName,
                  href: `/agents/${agent.id}`,
                },
                {
                  label: "Users",
                  href: `/agents/${agent.id}?tab=users`,
                },
                { label: user?.name || "New User" },
              ]
            : [
                { label: "Admin", href: "/" },
                { label: "Users", href: "/chatUsers" },
                { label: user?.name || "New User" },
              ]
        }
      />
      <H1>{user?.name || "New User"}</H1>
      {user && (
        <>
          <RecordTabs
            value={activeTab}
            tabs={[
              {
                value: "edit",
                label: "Edit User",
                href: `/chatUsers/${userId}?tab=edit`,
              },
              {
                value: "sessions",
                label: "Sessions",
                href: `/chatUsers/${userId}?tab=sessions`,
              },
              {
                value: "send-template",
                label: "Send Template",
                href: `/chatUsers/${userId}?tab=send-template`,
              },
              {
                value: "template-history",
                label: "Template History",
                href: `/chatUsers/${userId}?tab=template-history`,
              },
              {
                value: "data",
                label: "Data",
                href: `/chatUsers/${userId}?tab=data`,
              },
            ]}
            actions={<UserActions user={user} />}
          >
            <TabsContent value="edit">
              <EditUserForm
                userId={userId}
                name={user.name}
                number={user.number}
                testingAgentId={user.testingAgentId}
                agentOptions={agents.map((agent) => ({
                  value: agent.id,
                  label: agent.niceName,
                }))}
              />
            </TabsContent>
            <TabsContent value="sessions">
              <H2>Sessions</H2>
              <SessionsTable userId={userId} superAdmin={!!token.superAdmin} />
            </TabsContent>
            <TabsContent value="send-template">
              <H2>Send Template</H2>
              <p className="text-muted-foreground mb-4">
                Send a WhatsApp template message to this user.
              </p>
              <SendTemplateTab userId={userId} />
            </TabsContent>
            <TabsContent value="template-history">
              <H2>Template History</H2>
              <p className="text-muted-foreground mb-4">
                View all WhatsApp template sends recorded for this user.
              </p>
              {agent ? (
                <TemplateSendHistoryTable agentId={agent.id} userId={userId} />
              ) : (
                <p className="text-muted-foreground">
                  Template history is unavailable because this user is not
                  linked to an agent.
                </p>
              )}
            </TabsContent>
            <TabsContent value="data">
              <H2>User Data</H2>
              {user.data ? (
                <JsonDataEditor
                  userId={userId}
                  initialData={user.data}
                  userDataSchema={agent?.userDataSchema}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    No data stored for this user.
                  </p>
                  <JsonDataEditor
                    userId={userId}
                    initialData={{}}
                    userDataSchema={agent?.userDataSchema}
                  />
                </div>
              )}
            </TabsContent>
          </RecordTabs>
        </>
      )}
      {!user && (
        <NewUserForm
          agentOptions={agents.map((agent) => ({
            value: agent.id,
            label: agent.niceName,
          }))}
        />
      )}
    </Container>
  );
}
