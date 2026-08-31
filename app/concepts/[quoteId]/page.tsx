import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { verifyIdToken } from "@/lib/auth/verifyToken";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Building,
  User,
  Lightbulb,
  LayoutDashboard,
  Wrench,
  Smartphone,
  Users,
  PauseCircle,
  Send,
  BarChart3,
  Eye,
  MessageSquare,
  Bot,
  Download,
  ThumbsUp,
  Sparkles,
  Shield,
  Headphones,
  Zap,
  RefreshCw,
  Lock,
  FileCheck,
  Clock,
  Rocket,
  CheckCircle,
  Mail,
  ArrowRight,
  Gift,
} from "lucide-react";
import { getConceptForPublic } from "@/lib/getConceptForPublic";
import FloatingTableOfContents from "./FloatingTableOfContents";
import { MarkdownContent } from "@/components/MarkdownContent";
import WhatsAppQRCode from "@/components/WhatsAppQRCode";
import { saRecordQuoteView } from "@/actions/saRecordQuoteView";
import ExampleConversationsViewer from "@/components/ExampleConversationsViewer";
import DataFlowDiagram from "@/components/websiteui/DataFlowDiagram";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}): Promise<Metadata> {
  const quoteId = (await params).quoteId;
  const concept = await getConceptForPublic({ quoteId });

  if (!concept) {
    return {
      title: "Concept Not Found",
      description: "The requested concept could not be found.",
    };
  }

  const title = `${concept.organisationName} - ${concept.title} | ${concept.partner.name}`;
  const description = `AI Chatbot Concept for ${concept.organisationName} - prepared by ${concept.partner.name}`;

  // OG image is always generated in quoteOgWithLogo folder (uses fallback chain: hero+logo, hero, org logo)
  const ogImage = `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/quoteOgWithLogo/${concept.id}.webp`;

  // Get current host from request headers
  const headersList = await headers();
  const host = headersList.get("host") || "voxd.io";
  const protocol = host.includes("localhost") ? "http" : "https";
  const pageUrl = `${protocol}://${host}/concepts/${quoteId}`;

  const favicon = concept.partnerOrganisationLogoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${concept.partnerOrganisationId}.${concept.partnerOrganisationLogoFileExtension}`
    : "/logo.svg";

  return {
    title,
    description,
    icons: {
      icon: favicon,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: pageUrl,
      siteName: concept.partner.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${concept.organisationName} Logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicConceptPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const quoteId = (await params).quoteId;
  const concept = await getConceptForPublic({ quoteId });

  if (!concept) {
    return notFound();
  }

  // Record the view
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    null;
  const userAgent = headersList.get("user-agent");

  // Get email from id_token if present (regardless of expiry)
  const idToken = await verifyIdToken(false);
  const loggedInEmail = idToken?.email || null;

  // Fire and forget - don't block page render
  saRecordQuoteView({
    quoteId: concept.id,
    documentViewed: "concept",
    ipAddress,
    userAgent,
    loggedInEmail,
  }).catch(() => {
    // Silently ignore errors
  });

  const brandColor = concept.partnerOrganisationPrimaryColour || "#6366f1";
  const logoUrl = concept.partnerOrganisationLogoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${concept.partnerOrganisationId}.${concept.partnerOrganisationLogoFileExtension}`
    : "/logo.svg";
  const organisationLogoUrl = concept.organisationLogoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${concept.organisationId}.${concept.organisationLogoFileExtension}`
    : null;

  const sections = [
    { id: "welcome", label: "Welcome", icon: "Mail" as const },
    ...(concept.exampleConversations.length > 0
      ? [{ id: "examples", label: "Examples", icon: "MessageSquare" as const }]
      : []),
    { id: "concept", label: "The Concept", icon: "Lightbulb" as const },
    { id: "how-it-works", label: "How It Works", icon: "Zap" as const },
    {
      id: "portal",
      label: "Management Portal",
      icon: "LayoutDashboard" as const,
    },
    {
      id: "service",
      label: `The ${concept.partner.name} Service`,
      icon: "Wrench" as const,
    },
    {
      id: "pricing",
      label: "Investment & Timescales",
      icon: "FileCheck" as const,
    },
    { id: "next-steps", label: "Next Steps", icon: "Rocket" as const },
  ].filter((section) => !concept.conceptHideSections?.includes(section.id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with partner logo and organisation logo */}
      <header className="py-3 px-4 bg-white shadow-sm fixed top-0 left-0 right-0 z-50 overflow-hidden">
        <div className="max-w-5xl xl:max-w-[1380px] mx-auto flex items-center justify-center gap-4 md:gap-6 xl:justify-start xl:pl-[290px]">
          <div
            className="-my-3 py-3 px-2"
            style={
              concept.partnerOrganisationShowLogoOnColour
                ? {
                    backgroundColor:
                      concept.partnerOrganisationShowLogoOnColour,
                  }
                : undefined
            }
          >
            <Image
              src={logoUrl}
              alt={concept.partner.name}
              width={180}
              height={60}
              unoptimized
              className="h-8 md:h-12 w-auto object-contain"
            />
          </div>
          {organisationLogoUrl && (
            <>
              {!concept.partnerOrganisationShowLogoOnColour &&
                !concept.organisationShowLogoOnColour && (
                  <div className="h-8 md:h-12 w-px bg-gray-200" />
                )}
              <div
                className="-my-3 py-3 px-2"
                style={
                  concept.organisationShowLogoOnColour
                    ? { backgroundColor: concept.organisationShowLogoOnColour }
                    : undefined
                }
              >
                <Image
                  src={organisationLogoUrl}
                  alt={concept.organisationName}
                  width={180}
                  height={60}
                  unoptimized
                  className="h-8 md:h-12 w-auto object-contain"
                />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 md:h-[72px]" />

      {/* Hero Image */}
      {concept.heroImageFileExtension && (
        <div className="relative w-full">
          <Image
            src={`https://s3.${
              process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"
            }.wasabisys.com/${
              process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"
            }/quoteImages/${concept.id}.${concept.heroImageFileExtension}`}
            alt={concept.title}
            width={1920}
            height={600}
            unoptimized
            className="w-full h-[250px] md:h-[350px] object-cover"
          />
        </div>
      )}

      {/* Content wrapper with sidebar on desktop */}
      <div className="max-w-5xl xl:max-w-[1380px] mx-auto px-2 md:px-4 py-4 md:py-8 xl:flex xl:items-start xl:gap-8">
        {/* Desktop sticky ToC */}
        <FloatingTableOfContents sections={sections} brandColor={brandColor} />

        {/* Main content */}
        <main className="flex-1 max-w-5xl space-y-4 md:space-y-8">
          {/* Welcome Section - always shown */}
          <section
            id="welcome"
            className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${brandColor}15` }}
              >
                <Mail className="h-6 w-6" style={{ color: brandColor }} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  {concept.title}
                </h2>
                <p className="text-gray-500 text-sm mt-1">AI Chatbot Concept</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Building className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Prepared For</p>
                  <p className="font-medium text-gray-900">
                    {concept.organisationName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Prepared By</p>
                  <p className="font-medium text-gray-900">
                    {concept.createdBy?.name || concept.partner.name}
                    {concept.createdBy?.email && (
                      <span className="text-gray-500 text-xs font-normal ml-1">
                        ({concept.createdBy.email})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <hr
              className="border-0 h-px"
              style={{ backgroundColor: `${brandColor}20` }}
            />

            {/* Personal message from salesperson */}
            {concept.conceptPersonalMessage && (
              <div
                className="rounded-lg p-5 border-l-4"
                style={{
                  backgroundColor: `${brandColor}08`,
                  borderLeftColor: brandColor,
                }}
              >
                <div className="prose prose-gray prose-sm max-w-none">
                  <MarkdownContent
                    content={concept.conceptPersonalMessage}
                    brandColor={brandColor}
                  />
                </div>
                {concept.createdBy?.name && (
                  <p className="mt-4 text-gray-600 font-medium text-sm">
                    — {concept.createdBy.name}
                  </p>
                )}
              </div>
            )}

            <div
              className={concept.conceptPersonalMessage ? "border-t pt-6" : ""}
            >
              {concept.generatedConceptIntroduction ? (
                <div className="prose prose-gray max-w-none">
                  <MarkdownContent
                    content={concept.generatedConceptIntroduction}
                    brandColor={brandColor}
                  />
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Introduction is being prepared. Please check back soon.
                </p>
              )}
            </div>
          </section>

          {/* Example Conversations Section */}
          {concept.exampleConversations.length > 0 && (
            <section
              id="examples"
              className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <MessageSquare
                    className="h-6 w-6"
                    style={{ color: brandColor }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Example Conversations
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    See how your chatbot could interact with customers
                  </p>
                </div>
              </div>

              <ExampleConversationsViewer
                conversations={concept.exampleConversations}
                businessName={concept.organisationName}
                brandColor={brandColor}
                organizationId={concept.organisationId}
                organizationLogoFileExtension={
                  concept.organisationLogoFileExtension
                }
                organizationShowLogoOnColour={
                  concept.organisationShowLogoOnColour
                }
              />
            </section>
          )}

          {/* Concept Section */}
          <section
            id="concept"
            className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${brandColor}15` }}
              >
                <Lightbulb className="h-6 w-6" style={{ color: brandColor }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">The Concept</h2>
                <p className="text-gray-500 text-sm mt-1">
                  How AI can transform your customer communications
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {concept.generatedConcept ? (
                <div className="prose prose-gray max-w-none">
                  <MarkdownContent
                    content={concept.generatedConcept}
                    brandColor={brandColor}
                  />
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Concept details are being finalised. Please check back soon.
                </p>
              )}
            </div>
          </section>

          {/* How It Works Section */}
          {!concept.conceptHideSections?.includes("how-it-works") && (
            <section
              id="how-it-works"
              className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <Zap className="h-6 w-6" style={{ color: brandColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    How It Works
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Messages flow from your customers through WhatsApp, to our
                    AI, and back — with real-time access to all your business
                    systems.
                  </p>
                </div>
              </div>

              <DataFlowDiagram businessName={concept.partner.name} />
            </section>
          )}

          {/* Management Portal Section */}
          {!concept.conceptHideSections?.includes("portal") && (
            <section
              id="portal"
              className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <LayoutDashboard
                    className="h-6 w-6"
                    style={{ color: brandColor }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {concept.partner.name} Management Portal
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Included with every chatbot
                  </p>
                </div>
              </div>

              <p className="text-gray-600">
                Every chatbot comes with full access to the{" "}
                {concept.partner.name} management portal, giving you complete
                visibility and control over your AI assistant.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Smartphone
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Access Anywhere
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Mobile-friendly portal accessible from any device
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Users
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Unlimited Admin Users
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Add as many team members as you need
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <PauseCircle
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Pause & Takeover
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Pause AI replies and manually interact with users
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Send
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Template Messages
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Send pre-approved messages to individuals or groups
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <BarChart3
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Usage Analytics
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Charts and graphs showing usage statistics
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Eye
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      User Insights
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      View all users and captured information
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <MessageSquare
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Conversation Analysis
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      View raw conversations and AI decision-making details
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Bot
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      AI Workers
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Monitor AI workers analysing and actioning conversations
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Download
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Data Export
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Export all your data whenever you need it
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <ThumbsUp
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Feedback & Training
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Give feedback on messages to help your bot improve
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* The Service Section */}
          {!concept.conceptHideSections?.includes("service") && (
            <section
              id="service"
              className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <Wrench className="h-6 w-6" style={{ color: brandColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    The {concept.partner.name} Service
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    What we proactively do for you
                  </p>
                </div>
              </div>

              <p className="text-gray-600">
                Beyond the technology, {concept.partner.name} provides an
                ongoing managed service to ensure your chatbot continues to
                deliver exceptional results.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100">
                  <Bot
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      AI Agent Development
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Build and maintain an appropriate set of AI agents to
                      deliver the functionality outlined in the specification.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100">
                  <Sparkles
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Expert Consultancy
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Become an expert consultant for your business, working
                      with your team to ensure the correct contextual data is
                      available to the bot.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100">
                  <Shield
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Reliable 24/7 Service
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Maintain the system and provide a continuous, reliable,
                      secure service available around the clock.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100">
                  <Headphones
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Agreed SLA Support
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      8 working hour response time guaranteed, although we
                      almost always respond much sooner.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100">
                  <Zap
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Cutting-Edge Technology
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Keep pace with the fast-moving LLM landscape—we implement
                      the latest models from providers as they&apos;re released,
                      so your bot is always as capable as technology allows.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100">
                  <RefreshCw
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Updates & Patches
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Apply code updates and security patches to keep your
                      system running smoothly and securely.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100">
                  <Lock
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Enterprise Security
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Keep all data secure with regular penetration testing and
                      progression towards ISO 27001 and ISO 42001 certification.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Investment & Timescales Section */}
          {!concept.conceptHideSections?.includes("pricing") && (
            <section
              id="pricing"
              className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <FileCheck
                    className="h-6 w-6"
                    style={{ color: brandColor }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Investment & Timescales
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Simple, transparent pricing
                  </p>
                </div>
              </div>

              <p className="text-gray-600">
                We believe AI chatbots should be accessible to businesses of all
                sizes. Our pricing is designed to be straightforward and
                affordable - you might be surprised at just how cost-effective a
                custom AI solution can be.
              </p>

              {/* Pricing Structure */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">
                  {concept.setupFee || concept.monthlyFee
                    ? "Indicative Pricing"
                    : "How Pricing Works"}
                </h3>
                {(concept.setupFee || concept.monthlyFee) && (
                  <p className="text-sm text-gray-500">
                    The following ballpark figures give you an idea of the
                    investment required. Final pricing will be confirmed after
                    we discuss your specific requirements.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: `${brandColor}30` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket
                        className="h-5 w-5"
                        style={{ color: brandColor }}
                      />
                      <p className="font-medium text-gray-900">Setup Fee</p>
                    </div>
                    {concept.setupFee ? (
                      <>
                        <p
                          className="text-2xl font-bold mb-1"
                          style={{ color: brandColor }}
                        >
                          ~£{concept.setupFee.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Indicative one-time fee
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">
                        A one-time fee covering the initial build,
                        configuration, and training of your custom AI chatbot.
                      </p>
                    )}
                  </div>

                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: `${brandColor}30` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw
                        className="h-5 w-5"
                        style={{ color: brandColor }}
                      />
                      <p className="font-medium text-gray-900">Monthly Fee</p>
                    </div>
                    {concept.monthlyFee ? (
                      <>
                        <p
                          className="text-2xl font-bold mb-1"
                          style={{ color: brandColor }}
                        >
                          ~£{concept.monthlyFee.toLocaleString()}/mo
                        </p>
                        <p className="text-xs text-gray-500">
                          Indicative recurring fee
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">
                        An ongoing fee covering hosting, maintenance, support,
                        and continuous improvements to your chatbot.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Costs */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Other Costs</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    <span>
                      <strong>LLM costs</strong> – You pay your AI provider
                      directly for message processing (typically a few pence per
                      conversation)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    <span>
                      <strong>WhatsApp costs</strong> – Meta charges for
                      outbound messages sent outside the 24-hour reply window
                      (replies are free)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    <span>
                      <strong>Additional development</strong> – Major new
                      features beyond the initial scope are quoted separately
                    </span>
                  </div>
                </div>
              </div>

              {/* Free Time Highlight */}
              <div
                className="flex items-start gap-3 p-4 rounded-lg"
                style={{ backgroundColor: `${brandColor}10` }}
              >
                <Gift
                  className="h-5 w-5 mt-0.5 flex-shrink-0"
                  style={{ color: brandColor }}
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {concept.freeMonthlyMinutes || 30} minutes FREE each month
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Every month includes {concept.freeMonthlyMinutes || 30}{" "}
                    minutes of complimentary time for tweaks and amendments to
                    keep your chatbot performing at its best.
                  </p>
                </div>
              </div>

              {/* Timescales */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: `${brandColor}10` }}
              >
                <div className="flex items-start gap-3">
                  <Clock
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">Fast Turnaround</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Unlike traditional software projects that take months to
                      deliver, AI chatbots can be up and running in{" "}
                      <strong>days, not weeks or months</strong>. Our
                      streamlined process means you&apos;ll see results quickly,
                      with your bot ready to start helping customers sooner than
                      you might expect.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 italic">
                We&apos;ll provide a detailed quote tailored to your specific
                requirements. Most businesses are pleasantly surprised by how
                affordable a custom AI chatbot solution can be.
              </p>
            </section>
          )}

          {/* Next Steps Section */}
          {!concept.conceptHideSections?.includes("next-steps") && (
            <section
              id="next-steps"
              className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <Rocket className="h-6 w-6" style={{ color: brandColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Next Steps
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Let&apos;s explore what&apos;s possible
                  </p>
                </div>
              </div>

              <p className="text-gray-600">
                If this sounds interesting and you&apos;d like to explore how an
                AI chatbot could work for {concept.organisationName}, we&apos;d
                love the opportunity to learn more about your business and
                understand your specific needs.
              </p>

              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: `${brandColor}10` }}
              >
                <p className="text-gray-700">
                  Following a conversation, we can put together a{" "}
                  <strong>formal proposal</strong> tailored specifically to your
                  requirements, including:
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <ArrowRight
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    A detailed specification of what your chatbot will do
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <ArrowRight
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Clear, transparent pricing
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <ArrowRight
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Realistic timescales for delivery
                  </li>
                </ul>
              </div>

              <div className="border-t pt-6">
                <p className="font-medium text-gray-900 mb-3">Get in touch</p>
                <div
                  className="flex items-center gap-3 p-4 rounded-lg border"
                  style={{ borderColor: `${brandColor}30` }}
                >
                  <Mail className="h-5 w-5" style={{ color: brandColor }} />
                  <div>
                    <p className="font-medium text-gray-900">
                      {concept.createdBy?.name || concept.partner.name}
                    </p>
                    {concept.createdBy?.email && (
                      <a
                        href={`mailto:${concept.createdBy.email}`}
                        className="text-sm hover:underline"
                        style={{ color: brandColor }}
                      >
                        {concept.createdBy.email}
                      </a>
                    )}
                  </div>
                </div>

                {concept.salesBot && (
                  <div
                    className="mt-4 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4"
                    style={{ backgroundColor: `${brandColor}08` }}
                  >
                    <div
                      className="shrink-0"
                      title={`Scan or click to start chatting to ${concept.salesBot.name}`}
                    >
                      <WhatsAppQRCode
                        url={`https://wa.me/${concept.salesBot.phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`I have some questions about concept ${concept.shortLinkId}`)}`}
                        size={100}
                      />
                    </div>
                    <div className="flex flex-col gap-3 text-center sm:text-left">
                      <p className="text-gray-600 text-base">
                        Have questions about this concept? Chat with{" "}
                        {concept.salesBot.name} on WhatsApp - he&apos;s ready to
                        help you explore how an AI chatbot could work for your
                        business.
                      </p>
                      <a
                        href={`https://wa.me/${concept.salesBot.phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`I have some questions about concept ${concept.shortLinkId}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-opacity hover:opacity-90 self-center sm:self-start"
                        style={{ backgroundColor: brandColor }}
                      >
                        <MessageSquare className="h-5 w-5" />
                        Chat with {concept.salesBot.name} on WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500">
                We look forward to hearing from you and discussing how we can
                help transform your customer communications.
              </p>
            </section>
          )}

          {/* Footer */}
          <footer className="text-center py-8 text-sm text-gray-500">
            <p>
              Powered by{" "}
              <span className="font-medium">{concept.partner.name}</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
