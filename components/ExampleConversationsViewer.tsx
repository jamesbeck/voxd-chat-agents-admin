"use client";

import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import WhatsAppSim from "@/components/whatsAppSim";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  description: string;
  startTime: string;
  messages: {
    role: "user" | "assistant";
    content: string;
    time: number;
    annotation: string | null;
    imageUrl?: string;
    fileName?: string;
    fileSize?: string;
  }[];
};

export default function ExampleConversationsViewer({
  conversations,
  businessName,
  brandColor,
  organizationId,
  organizationLogoFileExtension,
  organizationShowLogoOnColour,
}: {
  conversations: Conversation[];
  businessName: string;
  brandColor: string;
  organizationId?: string;
  organizationLogoFileExtension?: string | null;
  organizationShowLogoOnColour?: string | null;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Embla carousel for mobile
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
  });

  // Sync dot indicators with carousel scroll
  const [emblaSelectedIndex, setEmblaSelectedIndex] = useState(0);

  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    setEmblaSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onEmblaSelect);
    onEmblaSelect();
    return () => {
      emblaApi.off("select", onEmblaSelect);
    };
  }, [emblaApi, onEmblaSelect]);

  if (conversations.length === 0) return null;

  const simProps = (conversation: Conversation) => ({
    messages: conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
      time: m.time,
      annotation: m.annotation || "",
      imageUrl: m.imageUrl,
      fileName: m.fileName,
      fileSize: m.fileSize,
    })),
    businessName,
    startTime: conversation.startTime,
    organizationId,
    organizationLogoFileExtension,
    organizationShowLogoOnColour,
  });

  return (
    <>
      {/* Desktop / Tablet: sidebar + detail */}
      <div className="hidden md:flex gap-6">
        {/* Left: conversation titles */}
        <div className="flex-1 min-w-0 space-y-2">
          {conversations.map((conversation, index) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-lg border-l-[3px] transition-colors text-sm",
                selectedIndex === index
                  ? "font-semibold text-gray-900"
                  : "border-transparent bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
              style={
                selectedIndex === index
                  ? {
                      borderLeftColor: brandColor,
                      backgroundColor: `${brandColor}10`,
                    }
                  : undefined
              }
            >
              <span
                className="inline-flex items-center justify-center h-[18px] w-[18px] rounded-full text-white text-[10px] font-bold align-middle mr-1.5"
                style={{
                  backgroundColor: brandColor,
                  position: "relative",
                  top: "-2px",
                }}
              >
                {index + 1}
              </span>
              {conversation.description}
            </button>
          ))}
        </div>

        {/* Right: WhatsApp sim */}
        <div className="shrink-0">
          <WhatsAppSim {...simProps(conversations[selectedIndex])} />
        </div>
      </div>

      {/* Mobile: Embla carousel */}
      <div className="md:hidden">
        {conversations.length > 1 && (
          <p className="text-center text-xs text-gray-400 mb-2">
            Swipe for more →
          </p>
        )}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {conversations.map((conversation, index) => (
              <div key={conversation.id} className="flex-[0_0_100%] min-w-0">
                {/* Title above sim */}
                <div className="text-center mb-3 px-2">
                  <p className="text-sm font-medium text-gray-700 line-clamp-2">
                    {index + 1}. {conversation.description}
                  </p>
                </div>

                {/* WhatsApp sim */}
                <div className="flex justify-center">
                  <WhatsAppSim {...simProps(conversation)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        {conversations.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {conversations.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  emblaSelectedIndex === index
                    ? ""
                    : "bg-gray-300 hover:bg-gray-400",
                )}
                style={
                  emblaSelectedIndex === index
                    ? { backgroundColor: brandColor }
                    : undefined
                }
                aria-label={`Go to conversation ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
