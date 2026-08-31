import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import saGetAgentDemoData from "@/actions/saGetAgentDemoData";
import ChatEmbed from "@/components/ChatEmbed";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ variant?: string }>;
}): Promise<Metadata> {
  const agentId = (await params).agentId;
  const variant =
    (await searchParams).variant === "widget" ? "widget" : "fullscreen";
  const data = await saGetAgentDemoData({ agentId });

  if (!data) return { title: "Agent Not Found" };

  return {
    title: `${data.agentNiceName} – ${variant === "widget" ? "Chat Widget" : "Web Chat"}`,
    description: `${variant === "widget" ? "Chat widget" : "Web chat"} for ${data.agentNiceName}.`,
  };
}

export default async function WebChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const agentId = (await params).agentId;
  const variant =
    (await searchParams).variant === "widget" ? "widget" : "fullscreen";
  const data = await saGetAgentDemoData({ agentId });

  if (!data) return notFound();

  const coreDomain = data.coreDomain?.trim() || "core.voxd.ai";
  const coreBaseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${coreDomain}`;

  const primaryColour = data.primaryColour || "#6366f1";
  const logoBgColour = data.showLogoOnColour || "#ffffff";
  const orgName = data.organisationName;

  const logoUrl = data.logoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${data.organisationId}.${data.logoFileExtension}`
    : null;

  return (
    <main
      className="flex min-h-screen items-center justify-center p-8"
      style={{ backgroundColor: logoBgColour }}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={orgName}
          width={280}
          height={120}
          className="h-auto max-h-32 w-auto max-w-[min(280px,80vw)] object-contain"
          priority
          unoptimized
        />
      ) : (
        <span className="text-center text-3xl font-semibold">{orgName}</span>
      )}
      <ChatEmbed
        agentId={data.agentId}
        coreBaseUrl={coreBaseUrl}
        primaryColour={primaryColour}
        mode={variant}
      />
    </main>
  );
}
