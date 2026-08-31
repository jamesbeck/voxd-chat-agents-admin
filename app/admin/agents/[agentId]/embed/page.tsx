import { notFound } from "next/navigation";
import { Bot, Building2, Globe, Link2, TriangleAlert } from "lucide-react";

import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import H1 from "@/components/adminui/H1";
import H2 from "@/components/adminui/H2";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import getAgentEmbedPageData from "@/lib/getAgentEmbedPageData";
import userCanViewAgent from "@/lib/userCanViewAgent";

import CopyableSnippetCard from "./CopyableSnippetCard";

function buildEmbedScriptUrl(partnerCoreDomain: string | null) {
  if (partnerCoreDomain) {
    return `https://${partnerCoreDomain}/web-client/embed.js`;
  }

  return "https://the-core-domain/web-client/embed.js";
}

function getSetupAttributeCards({ agentId }: { agentId: string }) {
  return [
    {
      name: "data-agent-id",
      required: "Required",
      example: agentId,
      description:
        "This tells the chat which agent to load. Without it, nothing will appear.",
    },
    {
      name: "data-color",
      required: "Optional",
      example: "#0f766e",
      description:
        "Changes the main accent colour so the chat feels at home on your site.",
    },
    {
      name: "data-mode",
      required: "Optional",
      example: "widget or fullscreen",
      description:
        "Use widget for the usual floating bubble. Use fullscreen when you want the chat to take over the page.",
    },
    {
      name: "data-auto-open",
      required: "Optional",
      example: "true",
      description:
        "Only the exact word true opens the chat straight away. Anything else is treated as off.",
    },
  ];
}

const widgetMethodCards = [
  {
    name: "identify(...)",
    description:
      "Turns an anonymous visitor into a known customer so the chat can stay tied to the right person.",
    whenToUse: "After your page knows who the visitor is.",
  },
  {
    name: "setUserData(...)",
    description:
      "Adds background details about the person, such as plan, language, or account owner.",
    whenToUse: "When you want the agent to tailor replies using customer data.",
  },
  {
    name: "setSessionData(...)",
    description:
      "Adds details about this visit, such as the page they came from or the campaign they clicked.",
    whenToUse: "When you want the conversation to know the current context.",
  },
  {
    name: "reset()",
    description:
      "Clears the current browser identity and session so the next person starts fresh.",
    whenToUse:
      "When someone logs out or you switch from one customer account to another.",
  },
  {
    name: "open(), close(), toggle()",
    description:
      "Lets buttons on your site open, close, or flip the chat open and shut.",
    whenToUse: "When you want the chat to respond to your own page buttons.",
  },
];

export default async function Page({
  params,
}: {
  params: { agentId: string };
}) {
  const agentId = (await params).agentId;
  const accessToken = await verifyAccessToken();

  if (!(await userCanViewAgent({ agentId, accessToken }))) {
    return notFound();
  }

  const embedData = await getAgentEmbedPageData({ agentId });

  if (!embedData) {
    return notFound();
  }

  const partnerName = embedData.partnerName || "your partner";
  const partnerCoreDomain = embedData.partnerCoreDomain;
  const coreDomainLabel = partnerCoreDomain || "the core domain";
  const scriptUrl = buildEmbedScriptUrl(partnerCoreDomain);
  const missingCoreDomain = !partnerCoreDomain;

  const quickStartSnippet = `<script
  src="${scriptUrl}"
  data-agent-id="${embedData.agentId}"
></script>`;

  const fullSetupSnippet = `<script
  src="${scriptUrl}"
  data-agent-id="${embedData.agentId}"
  data-color="#0f766e"
  data-mode="widget"
  data-auto-open="true"
></script>`;

  const readyEventSnippet = `<script>
  window.addEventListener("voxdchat:ready", async (event) => {
    const chat = event.detail.chat;

    console.log("Chat is ready", chat);
  });
</script>`;

  const identifySnippet = `window.addEventListener("voxdchat:ready", async (event) => {
  const chat = event.detail.chat;
  const customer = window.currentCustomer;

  if (!customer) {
    return;
  }

  await chat.identify({
    externalId: customer.id,
    email: customer.email,
    number: customer.phone,
    name: customer.name,
  });
});`;

  const userDataSnippet = `window.addEventListener("voxdchat:ready", async (event) => {
  const chat = event.detail.chat;
  const customer = window.currentCustomer;

  if (!customer) {
    return;
  }

  await chat.setUserData({
    plan: customer.plan,
    accountManager: customer.accountManager,
    locale: customer.locale,
  });

  await chat.setSessionData({
    sourcePage: "pricing-page",
    campaign: "summer-launch",
    cartValue: 129.99,
  });
});`;

  const resetSnippet = `async function handleLogout() {
  if (window.VoxdChat) {
    await window.VoxdChat.reset();
  }
}

async function switchCustomer(nextCustomer) {
  if (!window.VoxdChat) {
    return;
  }

  await window.VoxdChat.reset();
  await window.VoxdChat.identify({
    externalId: nextCustomer.id,
    email: nextCustomer.email,
    number: nextCustomer.phone,
    name: nextCustomer.name,
  });
}`;

  const controlsSnippet = `window.addEventListener("voxdchat:ready", (event) => {
  const chat = event.detail.chat;

  document
    .getElementById("open-chat-button")
    ?.addEventListener("click", () => chat.open());

  document
    .getElementById("close-chat-button")
    ?.addEventListener("click", () => chat.close());

  document
    .getElementById("toggle-chat-button")
    ?.addEventListener("click", () => chat.toggle());
});`;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Agents", href: "/agents" },
          { label: embedData.agentName, href: `/agents/${agentId}` },
          { label: "Embed Agent" },
        ]}
      />

      <H1>Embed agent</H1>

      <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
        These ready-to-use snippets add {embedData.agentName} to your website
        using {partnerName}&apos;s portal. The examples below already include
        this agent&apos;s ID, so in most cases you can paste the quick start and
        go live.
      </p>

      <DataCard
        items={
          [
            {
              label: "Agent",
              value: embedData.agentName,
              icon: <Bot className="h-4 w-4" />,
            },
            {
              label: "Brand shown on the chat",
              value: partnerName,
              icon: <Building2 className="h-4 w-4" />,
            },
            {
              label: "Core domain",
              value: coreDomainLabel,
              icon: <Globe className="h-4 w-4" />,
            },
            {
              label: "Embed script address",
              value: <span className="break-all">{scriptUrl}</span>,
              icon: <Link2 className="h-4 w-4" />,
            },
          ] satisfies DataItem[]
        }
      />

      {missingCoreDomain ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Core domain still needs to be set</AlertTitle>
          <AlertDescription>
            <p>
              The page never falls back to a platform domain. Until{" "}
              {partnerName}
              &apos;s core domain is configured, the examples below use the
              phrase the core domain as a placeholder.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4 pt-2">
        <H2>Quick start</H2>
        <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
          If you just want the chat bubble live on a page, paste this script
          into the page where you want the chat to appear. This gives you the
          standard floating widget without any extra setup.
        </p>
        <CopyableSnippetCard
          title="Simple embed"
          description="Paste this into the page, template, or website builder area where you want the chat to appear."
          code={quickStartSnippet}
          notes={[
            "This is the fastest way to embed the agent.",
            "It creates the floating chat widget automatically.",
            "You only need one copy of the script on each page.",
          ]}
        />
      </section>

      <section className="space-y-4 pt-2">
        <H2>Before you use the advanced examples</H2>
        <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
          The chat sends a one-time ready event as soon as the API is available.
          Use that event for setup work like identifying a customer, passing in
          extra details, or wiring your own buttons to the chat.
        </p>
        <CopyableSnippetCard
          title="Ready event"
          description="Add this once near your embed script so your page can react as soon as the chat is ready to use."
          code={readyEventSnippet}
          notes={[
            "event.detail.chat gives you the chat API straight away.",
            "window.VoxdChat is also available inside this event if you prefer to use the global name.",
            "Because the event only fires once, add this listener before the chat finishes loading.",
          ]}
        />
      </section>

      <section className="space-y-4 pt-2">
        <H2>More ways to set it up</H2>
        <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
          Use the longer setup when you want more control over colour, opening
          style, or brand handling.
        </p>
        <div className="grid gap-4 xl:grid-cols-2">
          <CopyableSnippetCard
            title="Full setup"
            description="This version adds the most useful optional settings in one place."
            code={fullSetupSnippet}
            notes={[
              "Use widget for the normal bubble, or fullscreen if you want the chat to fill the page.",
              "Only the exact text true turns auto-open on.",
            ]}
          />
          <CopyableSnippetCard
            title="Open, close, or toggle the chat"
            description="Use these helpers if you want your own page buttons to control the widget."
            code={controlsSnippet}
            notes={[
              "open() shows the chat.",
              "close() hides it.",
              "toggle() swaps between open and closed.",
            ]}
          />
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <H2>Connect it to a known customer</H2>
        <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
          If somebody is already signed in on your website, you can tell the
          chat who they are. That way the conversation can stay connected to the
          right customer instead of starting as anonymous.
        </p>
        <div className="grid gap-4 xl:grid-cols-2">
          <CopyableSnippetCard
            title="Identify a signed-in customer"
            description="Use this when your site already knows the customer’s ID, email, phone number, or name."
            code={identifySnippet}
            notes={[
              "externalId is the only required field.",
              "This example waits for the ready event and then connects the chat to the signed-in customer.",
              "Once a person has been identified, you cannot identify somebody else until you reset the chat.",
            ]}
          />
          <CopyableSnippetCard
            title="Pass customer and visit details"
            description="This is helpful when you want the chat to know the customer plan, page source, or campaign."
            code={userDataSnippet}
            notes={[
              "setUserData stores details about the person.",
              "setSessionData stores details about this visit or conversation.",
              "The exact nested fields allowed here depend on this agent’s own data rules.",
            ]}
          />
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <H2>When somebody logs out or changes account</H2>
        <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
          Resetting the chat clears the current browser-side identity and
          session. Use it whenever one signed-in person becomes another.
        </p>
        <CopyableSnippetCard
          title="Reset before logout or account switching"
          description="This makes sure the next person starts fresh instead of inheriting the previous conversation."
          code={resetSnippet}
          notes={[
            "Call reset() on logout.",
            "Call reset() before identifying a different customer.",
            "Once the chat is ready, window.VoxdChat is available for later actions like logout and account switching.",
          ]}
        />
      </section>

      <section className="space-y-4 pt-2">
        <H2>What you can set right away</H2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {getSetupAttributeCards({
            agentId: embedData.agentId,
          }).map((attribute) => (
            <Card key={attribute.name}>
              <CardHeader>
                <CardTitle className="text-base">{attribute.name}</CardTitle>
                <CardDescription>{attribute.required}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{attribute.description}</p>
                <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {attribute.example}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <H2>What you set after the chat has loaded</H2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgetMethodCards.map((method) => (
            <Card key={method.name}>
              <CardHeader>
                <CardTitle className="text-base">{method.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{method.description}</p>
                <p className="font-medium text-foreground">
                  {method.whenToUse}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
