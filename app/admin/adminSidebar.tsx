"use client";

import {
  Home,
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
    url: "/",
    icon: Home,
  },
  {
    roles: ["admin", "partner"],
    title: "Organisations",
    url: "/organisations",
    icon: Building,
  },
  {
    roles: ["partner", "admin"],
    title: "Quotes",
    url: "/quotes",
    icon: FileText,
  },
  {
    roles: ["partner"],
    title: "Partner Profile",
    url: "/partner-profile",
    icon: Settings,
  },
  {
    title: "Agents",
    url: "/agents",
    icon: BotMessageSquare,
  },
  {
    title: "Sessions",
    url: "/sessions",
    icon: MessageCircle,
  },
  {
    title: "Chat Users",
    url: "/chatUsers",
    icon: User,
  },
  {
    roles: ["admin", "partner", "organisation"],
    title: "Admin Users",
    url: "/adminUsers",
    icon: UserCog,
  },
  {
    title: "Connected Accounts",
    url: "/oauth-accounts",
    icon: Link2,
  },
  {
    roles: ["admin"],
    title: "Provider API Keys",
    url: "/provider-api-keys",
    icon: KeyRound,
  },
  {
    roles: ["admin"],
    title: "Activity Log",
    url: "/log",
    icon: ScrollText,
  },
  {
    roles: ["admin"],
    title: "Tool Calls",
    url: "/tool-calls",
    icon: Wrench,
  },
  {
    roles: ["admin"],
    title: "Webhooks",
    url: "/webhooks",
    icon: Webhook,
  },
  {
    roles: ["admin"],
    title: "Files",
    url: "/files",
    icon: Paperclip,
  },
  {
    roles: ["admin"],
    title: "Custom Functions",
    url: "/custom-functions",
    icon: ListTree,
  },
  {
    roles: ["admin"],
    title: "Custom Function Logs",
    url: "/custom-function-runs",
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
                              <Link href={`/agents/${agent.id}`}>
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
                    <Link href="/permission-groups">
                      <ShieldEllipsis />
                      <span>Permission Groups</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/permission-definitions">
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
                    <Link href="/wabas">
                      <Smartphone />
                      <span>WABAs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/phone-numbers">
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
                    <Link href="/faq">
                      <HelpCircle />
                      <span>FAQ</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/faq-categories">
                      <FolderOpen />
                      <span>FAQ Categories</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/knowledge-sources">
                      <BookOpen />
                      <span>Knowledge Sources</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/integrations">
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
                  <Link href="/support-tickets">
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
                    <Link href="/billing/invoices">
                      <ReceiptText />
                      <span>Invoices</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/billing/line-items">
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
