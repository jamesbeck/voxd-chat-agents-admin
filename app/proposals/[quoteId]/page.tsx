import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { format } from "date-fns";
import { verifyIdToken } from "@/lib/auth/verifyToken";
import Image from "next/image";
import type { Metadata } from "next";
import {
  FileText,
  Calendar,
  Building,
  User,
  CheckCircle,
  Clock,
  Rocket,
  BookOpen,
  FileCheck,
  MessageSquare,
  LayoutDashboard,
  Smartphone,
  Users,
  PauseCircle,
  Send,
  BarChart3,
  Eye,
  Bot,
  Download,
  ThumbsUp,
  Wrench,
  Sparkles,
  Shield,
  Headphones,
  Zap,
  RefreshCw,
  Lock,
  Gift,
  Mail,
} from "lucide-react";
import { getQuoteForPublic } from "@/lib/getQuoteForPublic";
import ExampleConversationsViewer from "@/components/ExampleConversationsViewer";
import FloatingTableOfContents from "./FloatingTableOfContents";
import { MarkdownContent } from "@/components/MarkdownContent";
import { saRecordQuoteView } from "@/actions/saRecordQuoteView";
import ProposalTermsSection from "./ProposalTermsSection";
import SignContractForm from "./SignContractForm";
import WhatsAppQRCode from "@/components/WhatsAppQRCode";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}): Promise<Metadata> {
  const quoteId = (await params).quoteId;
  const quote = await getQuoteForPublic({ quoteId });

  if (!quote) {
    return {
      title: "Quote Not Found",
      description: "The requested quote could not be found.",
    };
  }

  const title = `${quote.organisationName} - ${quote.title} | ${quote.partner.name}`;
  const description = `AI Chatbot Implementation Proposal for ${quote.organisationName} - prepared by ${quote.partner.name}`;

  // OG image is always generated in quoteOgWithLogo folder (uses fallback chain: hero+logo, hero, org logo)
  const ogImage = `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/quoteOgWithLogo/${quote.id}.webp`;

  // Get current host from request headers
  const headersList = await headers();
  const host = headersList.get("host") || "voxd.io";
  const protocol = host.includes("localhost") ? "http" : "https";
  const pageUrl = `${protocol}://${host}/proposals/${quoteId}`;

  const favicon = quote.partnerOrganisationLogoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${quote.partnerOrganisationId}.${quote.partnerOrganisationLogoFileExtension}`
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
      siteName: quote.partner.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${quote.organisationName} Logo`,
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

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const quoteId = (await params).quoteId;
  const quote = await getQuoteForPublic({ quoteId });

  if (!quote) {
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
    quoteId: quote.id,
    documentViewed: "quote",
    ipAddress,
    userAgent,
    loggedInEmail,
  }).catch(() => {
    // Silently ignore errors
  });

  const brandColor = quote.partnerOrganisationPrimaryColour || "#6366f1";
  const logoUrl = quote.partnerOrganisationLogoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${quote.partnerOrganisationId}.${quote.partnerOrganisationLogoFileExtension}`
    : "/logo.svg";
  const organisationLogoUrl = quote.organisationLogoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${quote.organisationId}.${quote.organisationLogoFileExtension}`
    : null;

  // Calculate build days - default to 3 if not set or zero
  const effectiveBuildDays =
    quote.buildDays && quote.buildDays > 0 ? quote.buildDays : 3;
  const buildEndDay = 2 + effectiveBuildDays;
  const testStartDay = buildEndDay + 1;
  const testEndDay = buildEndDay + effectiveBuildDays;
  const hasContractNotes = !!quote.contractNotes?.trim();

  const sections = [
    ...(quote.proposalPersonalMessage
      ? [{ id: "welcome", label: "Welcome", icon: "Mail" as const }]
      : []),
    { id: "introduction", label: "Introduction", icon: "FileText" as const },
    { id: "specification", label: "Specification", icon: "BookOpen" as const },
    ...(!quote.proposalHideSections?.includes("examples") &&
    quote.exampleConversations.length > 0
      ? [
          {
            id: "examples",
            label: "Examples",
            icon: "MessageSquare" as const,
          },
        ]
      : []),
    ...(!quote.proposalHideSections?.includes("portal")
      ? [
          {
            id: "portal",
            label: "Management Portal",
            icon: "LayoutDashboard" as const,
          },
        ]
      : []),
    ...(!quote.proposalHideSections?.includes("service")
      ? [
          {
            id: "service",
            label: `The ${quote.partner.name} Service`,
            icon: "Wrench" as const,
          },
        ]
      : []),
    ...(quote.setupFee !== null || quote.monthlyFee !== null || hasContractNotes
      ? [{ id: "pricing", label: "Investment", icon: "FileCheck" as const }]
      : []),
    { id: "next-steps", label: "Next Steps", icon: "Rocket" as const },
    { id: "terms", label: "Terms & Conditions", icon: "FileText" as const },
    { id: "sign-contract", label: "Sign Contract", icon: "FileCheck" as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with partner logo and organisation logo */}
      <header className="py-3 px-4 bg-white shadow-sm fixed top-0 left-0 right-0 z-50 overflow-hidden">
        <div className="max-w-5xl xl:max-w-[1380px] mx-auto flex items-center justify-center gap-4 md:gap-6 xl:justify-start xl:pl-[290px]">
          <div
            className="-my-3 py-3 px-2"
            style={
              quote.partnerOrganisationShowLogoOnColour
                ? { backgroundColor: quote.partnerOrganisationShowLogoOnColour }
                : undefined
            }
          >
            <Image
              src={logoUrl}
              alt={quote.partner.name}
              width={180}
              height={60}
              unoptimized
              className="h-8 md:h-12 w-auto object-contain"
            />
          </div>
          {organisationLogoUrl && (
            <>
              {!quote.partnerOrganisationShowLogoOnColour &&
                !quote.organisationShowLogoOnColour && (
                  <div className="h-8 md:h-12 w-px bg-gray-200" />
                )}
              <div
                className="-my-3 py-3 px-2"
                style={
                  quote.organisationShowLogoOnColour
                    ? { backgroundColor: quote.organisationShowLogoOnColour }
                    : undefined
                }
              >
                <Image
                  src={organisationLogoUrl}
                  alt={quote.organisationName}
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
      {quote.heroImageFileExtension && (
        <div className="relative w-full">
          <Image
            src={`https://s3.${
              process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"
            }.wasabisys.com/${
              process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"
            }/quoteImages/${quote.id}.${quote.heroImageFileExtension}`}
            alt={quote.title}
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
          {/* Welcome Section (if personal message exists) */}
          {quote.proposalPersonalMessage && (
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
                    {quote.title}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    AI Chatbot Implementation Proposal
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Date Created</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(quote.createdAt), "dd MMMM yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Prepared For</p>
                    <p className="font-medium text-gray-900">
                      {quote.organisationName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Prepared By</p>
                    <p className="font-medium text-gray-900">
                      {quote.createdBy?.name || quote.partner.name}
                      {quote.createdBy?.email && (
                        <span className="text-gray-500 text-xs font-normal ml-1">
                          ({quote.createdBy.email})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="prose prose-gray max-w-none">
                  <MarkdownContent content={quote.proposalPersonalMessage} />
                </div>
                {quote.createdBy?.name && (
                  <p className="mt-6 text-gray-700 font-medium">
                    — {quote.createdBy.name}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Introduction Section */}
          <section
            id="introduction"
            className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${brandColor}15` }}
              >
                <FileText className="h-6 w-6" style={{ color: brandColor }} />
              </div>
              <div>
                {quote.proposalPersonalMessage ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-900">
                      Introduction
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Overview of the AI chatbot proposal
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                      {quote.title}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      AI Chatbot Implementation Proposal
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Only show metadata grid if there's no personal message section */}
            {!quote.proposalPersonalMessage && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Date Created</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(quote.createdAt), "dd MMMM yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Prepared For</p>
                    <p className="font-medium text-gray-900">
                      {quote.organisationName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Prepared By</p>
                    <p className="font-medium text-gray-900">
                      {quote.createdBy?.name || quote.partner.name}
                      {quote.createdBy?.email && (
                        <span className="text-gray-500 text-xs font-normal ml-1">
                          ({quote.createdBy.email})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div
              className={quote.proposalPersonalMessage ? "" : "border-t pt-6"}
            >
              {quote.generatedProposalIntroduction ? (
                <div className="prose prose-gray max-w-none">
                  <MarkdownContent
                    content={quote.generatedProposalIntroduction}
                  />
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Introduction is being prepared. Please check back soon.
                </p>
              )}
            </div>
          </section>

          {/* Specification Section */}
          <section
            id="specification"
            className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-6 scroll-mt-8"
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${brandColor}15` }}
              >
                <BookOpen className="h-6 w-6" style={{ color: brandColor }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Specification
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Details of your custom chatbot
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {quote.generatedSpecification ? (
                <div className="prose prose-gray max-w-none">
                  <MarkdownContent content={quote.generatedSpecification} />
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Specification details are being finalised. Please check back
                  soon.
                </p>
              )}
            </div>
          </section>

          {/* Example Conversations Section */}
          {!quote.proposalHideSections?.includes("examples") &&
            quote.exampleConversations.length > 0 && (
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
                  conversations={quote.exampleConversations}
                  businessName={quote.organisationName}
                  brandColor={brandColor}
                  organizationId={quote.organisationId}
                  organizationLogoFileExtension={
                    quote.organisationLogoFileExtension
                  }
                  organizationShowLogoOnColour={
                    quote.organisationShowLogoOnColour
                  }
                />
              </section>
            )}

          {/* Voxd Portal Section */}
          {!quote.proposalHideSections?.includes("portal") && (
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
                    {quote.partner.name} Management Portal
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Included with every chatbot
                  </p>
                </div>
              </div>

              <p className="text-gray-600">
                Every chatbot comes with full access to the {quote.partner.name}{" "}
                management portal, giving you complete visibility and control
                over your AI assistant.
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

          {/* The Voxd Service Section */}
          {!quote.proposalHideSections?.includes("service") && (
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
                    The {quote.partner.name} Service
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    What we proactively do for you
                  </p>
                </div>
              </div>

              <p className="text-gray-600">
                Beyond the technology, {quote.partner.name} provides an ongoing
                managed service to ensure your chatbot continues to deliver
                exceptional results.
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

          {/* Pricing Section */}
          {(quote.setupFee !== null ||
            quote.monthlyFee !== null ||
            hasContractNotes) && (
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
                    Investment
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Your chatbot pricing
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quote.setupFee !== null && (
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: `${brandColor}30` }}
                  >
                    <p className="text-sm text-gray-500">One-time Setup Fee</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: brandColor }}
                    >
                      £{quote.setupFee.toLocaleString()}
                    </p>
                  </div>
                )}

                {quote.monthlyFee !== null && (
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: `${brandColor}30` }}
                  >
                    <p className="text-sm text-gray-500">Monthly Fee</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: brandColor }}
                    >
                      £{quote.monthlyFee.toLocaleString()}
                      <span className="text-sm font-normal text-gray-500">
                        /month
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Terms */}
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <span>Setup fee due at project commencement</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <span>
                    Monthly fee paid in advance via Direct Debit from the point
                    your chatbot is ready for use
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: brandColor }}
                  />
                  <span>
                    {quote.contractLength || 12} month initial contract term,
                    then rolling monthly
                  </span>
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
                    {quote.freeMonthlyMinutes || 30} minutes FREE each month
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Every month includes {quote.freeMonthlyMinutes || 30}{" "}
                    minutes of complimentary time for tweaks and amendments to
                    keep your chatbot performing at its best.
                  </p>
                </div>
              </div>

              {/* Additional Changes */}
              <p className="text-sm text-gray-500">
                Additional changes and amendments beyond the included free time
                will be quoted on a case-by-case basis.
              </p>

              {hasContractNotes && (
                <div
                  id="contract-notes"
                  className="rounded-lg border px-4 py-4 scroll-mt-24"
                  style={{
                    borderColor: `${brandColor}30`,
                    backgroundColor: `${brandColor}08`,
                  }}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Contract Notes
                  </h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {quote.contractNotes}
                  </p>
                </div>
              )}

              {/* LLM Costs Sub-section */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-2">LLM Costs</h3>
                <p className="text-sm text-gray-600">
                  You will be charged directly by your LLM provider for AI
                  generation. Costs vary depending on many factors including the
                  size and complexity of each request. However, the average
                  conversation across our entire network costs around 5p.
                </p>
              </div>

              {/* Meta/WhatsApp Costs Sub-section */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Meta/WhatsApp Costs
                </h3>
                <p className="text-sm text-gray-600">
                  Messages sent outside the 24-hour reply window must be
                  templated and pre-approved by Meta. All outbound messages are
                  chargeable by Meta, costs vary by region and nature or
                  message.
                </p>
              </div>
            </section>
          )}

          {/* Next Steps Section */}
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
                <h2 className="text-xl font-bold text-gray-900">Next Steps</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Your path to launch
                </p>
              </div>
            </div>

            {quote.salesBot && (
              <div
                className="rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4"
                style={{ backgroundColor: `${brandColor}08` }}
              >
                <div
                  className="shrink-0"
                  title={`Scan or click to start chatting to ${quote.salesBot.name}`}
                >
                  <WhatsAppQRCode
                    url={`https://wa.me/${quote.salesBot.phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`I have some questions about proposal ${quote.shortLinkId}`)}`}
                    size={100}
                  />
                </div>
                <div className="flex flex-col gap-3 text-center sm:text-left">
                  <p className="text-gray-600 text-base">
                    Have questions about this proposal? Chat with{" "}
                    {quote.salesBot.name} on WhatsApp &mdash; ready to help you
                    explore how an AI chatbot could work for your business.
                  </p>
                  <a
                    href={`https://wa.me/${quote.salesBot.phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`I have some questions about proposal ${quote.shortLinkId}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-opacity hover:opacity-90 self-center sm:self-start"
                    style={{ backgroundColor: brandColor }}
                  >
                    <MessageSquare className="h-5 w-5" />
                    Chat with {quote.salesBot.name} on WhatsApp
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-6 ml-3">
              {/* Day 1 */}
              <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                <div
                  className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Day 1 – Getting Started
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Sign contract
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Sign direct debit mandate
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Pay setup fee by bank transfer
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Assign admin user(s) to manage your chatbot
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Setup and verify Meta Business Profile & WhatsApp Business
                    Account (we can help with this)
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Add {quote.partner.name} as a partner on your WABA
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Setup and verify an account with your chosen LLM provider
                    and share an API key with {quote.partner.name} (we can help
                    with this too)
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Share external systems access details or data, or provide an
                    IT or admin contact that can help
                  </li>
                </ul>
              </div>

              {/* Day 2 */}
              <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                <div
                  className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Day 2 to {buildEndDay} – Build
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    {quote.partner.name} builds your custom chatbot tailored to
                    your specific requirements
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Connect your chatbot to WhatsApp Business
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Integrate with your business systems and data sources
                  </li>
                </ul>
              </div>

              {/* Day 3 */}
              <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                <div
                  className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  {testStartDay}
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Day {testStartDay} to {testEndDay} – Test
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Test your chatbot thoroughly with real-world scenarios
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    Provide feedback on responses, tone, and behaviour
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: brandColor }}
                    />
                    {quote.partner.name} makes quick amendments based on your
                    feedback
                  </li>
                </ul>
              </div>

              {/* Launch */}
              <div className="relative pl-8">
                <div
                  className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  <Rocket className="h-3 w-3" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">🚀 Launch!</h3>
                <p className="text-sm text-gray-600">
                  Your AI chatbot goes live and starts helping your customers.
                </p>
              </div>
            </div>
          </section>

          {/* Terms & Conditions Section */}
          <ProposalTermsSection
            brandColor={brandColor}
            contractNotes={quote.contractNotes}
            partner={{
              name: quote.partner.name,
              legalName: quote.partner.legalName,
              companyNumber: quote.partner.companyNumber,
              registeredAddress: quote.partner.registeredAddress,
              legalEmail: quote.partner.legalEmail,
            }}
          />

          {/* Sign Contract Section */}
          <SignContractForm
            quoteId={quote.id}
            brandColor={brandColor}
            partnerName={quote.partner.name}
            organisationName={quote.organisationName}
            ipAddress={ipAddress}
            userAgent={userAgent}
            existingSignOff={quote.signOff}
          />

          {/* Footer */}
          <footer className="text-center py-8 text-sm text-gray-500">
            <p>
              Powered by{" "}
              <span className="font-medium">{quote.partner.name}</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
