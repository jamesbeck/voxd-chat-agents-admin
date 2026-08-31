import saGetExampleConversationById from "@/actions/saGetExampleConversationById";
import WhatsAppSim from "@/components/whatsAppSim";
import { notFound } from "next/navigation";

export default async function ExampleConversationIframePage({
  params,
}: {
  params: { exampleConversationId: string };
}) {
  const { exampleConversationId } = await params;

  const response = await saGetExampleConversationById({
    conversationId: exampleConversationId,
  });

  if (!response.success || !response.data) {
    notFound();
  }

  const conversation = response.data;

  const businessName = conversation.organizationName || "Business";
  const organizationId = conversation.organizationId || undefined;
  const organizationLogoFileExtension =
    conversation.organizationLogoFileExtension || undefined;
  const organizationShowLogoOnColour =
    conversation.organizationShowLogoOnColour || null;

  return (
    <>
      <style>{`body { background: transparent !important; }`}</style>
      <div className="min-h-screen flex items-start justify-start md:items-center md:justify-center">
        <WhatsAppSim
          messages={conversation.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            time: m.time,
            annotation: m.annotation || "",
            imageUrl: m.imageUrl,
            fileName: m.fileName,
            fileSize: m.fileSize,
          }))}
          businessName={businessName}
          startTime={conversation.startTime}
          organizationId={organizationId}
          organizationLogoFileExtension={organizationLogoFileExtension}
          organizationShowLogoOnColour={organizationShowLogoOnColour}
        />
      </div>
    </>
  );
}
