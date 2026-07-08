"use client";

import {
  Home,
  Inbox,
  Smartphone,
  FileText,
  Phone,
  BotMessageSquare,
  Building,
  User,
  UserCog,
  MessageCircle,
  HelpCircle,
  FolderOpen,
  ScrollText,
  Ticket,
  Link2,
  Wrench,
  Webhook,
  Paperclip,
  BookOpen,
  Plug,
  Settings,
  KeyRound,
  ListTree,
  ReceiptText,
  ShieldCheck,
  ShieldEllipsis,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, User2 } from "lucide-react";
import logout from "@/actions/saLogout";
import { Roles } from "@/types/types";
import { UserAgent } from "@/actions/saGetUserAgents";
import {
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

type MenuItem = {
  roles?: Roles[];
  title: string;
  url: string;
  icon: React.ElementType;
};

// Menu items.
const menuItems: MenuItem[] = [
  {
    roles: ["admin"],
    title: "Admin Home",
    url: "/admin",
    icon: Home,
  },
  {
    roles: ["admin", "partner"],
    title: "Organisations",
    url: "/admin/organisations",
    icon: Building,
  },
  {
    roles: ["partner", "admin"],
    title: "Quotes",
    url: "/admin/quotes",
    icon: FileText,
  },
  {
    roles: ["partner"],
    title: "Partner Profile",
    url: "/admin/partner-profile",
    icon: Settings,
  },
  {
    title: "Agents",
    url: "/admin/agents",
    icon: BotMessageSquare,
  },
  {
    title: "Sessions",
    url: "/admin/sessions",
    icon: MessageCircle,
  },
  {
    title: "Chat Users",
    url: "/admin/chatUsers",
    icon: User,
  },
  {
    roles: ["admin", "partner", "organisation"],
    title: "Admin Users",
    url: "/admin/adminUsers",
    icon: UserCog,
  },
  {
    title: "Connected Accounts",
    url: "/admin/oauth-accounts",
    icon: Link2,
  },
  {
    roles: ["admin"],
    title: "Provider API Keys",
    url: "/admin/provider-api-keys",
    icon: KeyRound,
  },
  {
    roles: ["admin"],
    title: "Activity Log",
    url: "/admin/log",
    icon: ScrollText,
  },
  {
    roles: ["admin"],
    title: "Tool Calls",
    url: "/admin/tool-calls",
    icon: Wrench,
  },
  {
    roles: ["admin"],
    title: "Webhooks",
    url: "/admin/webhooks",
    icon: Webhook,
  },
  {
    roles: ["admin"],
    title: "Files",
    url: "/admin/files",
    icon: Paperclip,
  },
  {
    roles: ["admin"],
    title: "Custom Functions",
    url: "/admin/custom-functions",
    icon: ListTree,
  },
  {
    roles: ["admin"],
    title: "Custom Function Logs",
    url: "/admin/custom-function-runs",
    icon: Wrench,
  },
];

export default function AdminSidebar({
  email,
  superAdmin,
  partner,
  agents = [],
  logoUrl,
  showLogoOnColour,
}: {
  email?: string;
  superAdmin?: boolean;
  partner?: boolean;
  agents?: UserAgent[];
  logoUrl?: string;
  showLogoOnColour?: string;
}) {
  const userRoles: Roles[] = [];
  if (superAdmin) userRoles.push("admin");
  if (partner) userRoles.push("partner");
  if (!superAdmin && !partner) userRoles.push("organisation");

  return (
    <Sidebar collapsible="icon" className="bg-cream">
      <SidebarHeader className="p-0">
        <div
          style={
            showLogoOnColour ? { backgroundColor: showLogoOnColour } : undefined
          }
        >
          <Image
            src={logoUrl || "/logo.svg"}
            alt="Logo"
            width={300}
            height={50}
            unoptimized
            className="p-2"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Live Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (
                  item.roles &&
                  !item.roles.some((role) => userRoles.includes(role))
                ) {
                  return null;
                }

                const showAgentSubItems =
                  item.title === "Agents" && agents.length > 0;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {showAgentSubItems && (
                      <SidebarMenuSub>
                        {agents.map((agent) => (
                          <SidebarMenuSubItem key={agent.id}>
                            <SidebarMenuSubButton asChild>
                              <Link href={`/admin/agents/${agent.id}`}>
                                <span>{agent.niceName || agent.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {superAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Permissions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/permission-groups">
                      <ShieldEllipsis />
                      <span>Permission Groups</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/permission-definitions">
                      <ShieldCheck />
                      <span>Permission Definitions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {superAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>WhatsApp</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/wabas">
                      <Smartphone />
                      <span>WABAs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/phone-numbers">
                      <Phone />
                      <span>Phone Numbers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {superAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>CMS</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/examples">
                      <Inbox />
                      <span>Examples</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/faq">
                      <HelpCircle />
                      <span>FAQ</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/faq-categories">
                      <FolderOpen />
                      <span>FAQ Categories</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/industries">
                      <Inbox />
                      <span>Industries</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/functions">
                      <Inbox />
                      <span>Functions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/features">
                      <Inbox />
                      <span>Features</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/knowledge-sources">
                      <BookOpen />
                      <span>Knowledge Sources</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/integrations">
                      <Plug />
                      <span>Integrations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/support-tickets">
                    <Ticket />
                    <span>Support Tickets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {superAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Billing</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/billing/invoices">
                      <ReceiptText />
                      <span>Invoices</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/billing/line-items">
                      <ListTree />
                      <span>Line Items</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> {email}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={() => logout()}>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
