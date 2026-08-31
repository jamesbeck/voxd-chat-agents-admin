"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  PlusIcon,
  CameraIcon,
  MicrophoneIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Message from "./message";
import { addSeconds, format } from "date-fns";
import { useRef, useState, useEffect } from "react";

const DEVICE_WIDTH = 360;
const DEVICE_HEIGHT = 736;

export default function WhatsAppSim({
  messages,
  businessName,
  startTime,
  organizationId,
  organizationLogoFileExtension,
  organizationShowLogoOnColour,
}: {
  messages: {
    role: string;
    content: string;
    time: number;
    annotation: string;
    imageUrl?: string;
    fileName?: string;
    fileSize?: string;
  }[];
  businessName: string;
  startTime: string;
  organizationId?: string;
  organizationLogoFileExtension?: string | null;
  organizationShowLogoOnColour?: string | null;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return;
    }

    const updateScale = () => {
      const nextScale = Math.min(1, wrapper.clientWidth / DEVICE_WIDTH);
      setScale((currentScale) =>
        Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale,
      );
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(wrapper);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        setIsAtTop(scrollTop <= 10);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // iphone background image is 1350x2760
  // height is 2.0444444 width

  // convert start time string to a new date with the time set
  let currentMessageTime = new Date();
  const timeParts = startTime?.split(":") || [];
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);

  // Handle invalid time values (e.g., "--:--" for generating conversations)
  if (!isNaN(hours) && !isNaN(minutes)) {
    currentMessageTime.setHours(hours);
    currentMessageTime.setMinutes(minutes);
  }

  const endTime = addSeconds(
    currentMessageTime,
    messages.reduce((acc, message) => acc + message.time, 0),
  );

  return (
    <div
      ref={wrapperRef}
      className="w-full text-[#222]"
      style={{
        maxWidth: `${DEVICE_WIDTH}px`,
        height: `${DEVICE_HEIGHT * scale}px`,
      }}
    >
      <div
        className={cn(`relative origin-top-left`)}
        style={{
          width: `${DEVICE_WIDTH}px`,
          height: `${DEVICE_HEIGHT}px`,
          transform: `scale(${scale})`,
        }}
      >
        <div className="absolute w-[330px] h-[706px] top-[15px] left-[15px] bg-wabg rounded-[40px]" />

        <Image
          src="/whatsAppSim/iphone.png"
          alt="WhatsApp"
          width={DEVICE_WIDTH}
          height={DEVICE_HEIGHT}
          className="w-full h-full absolute top-0 left-0"
        />

        <div className="absolute top-[29px] left-[20px]  w-[320px]  h-[680] flex flex-col">
          <div className="mx-auto w-[260px]  h-[30] flex items-center">
            <div className="w-[50%] font-bold text-[16px] pl-[10px]">
              {format(endTime, "HH:mm")}
            </div>
            <div className="w-[50%] flex justify-end space-x-[6px] items-center">
              <div>
                <Image
                  src="/whatsAppSim/bars.svg"
                  alt="Battery"
                  width={20}
                  height={20}
                  className="scale-y-[0.8]"
                />
              </div>
              <div>
                <Image
                  src="/whatsAppSim/wifi.svg"
                  alt="Battery"
                  width={20}
                  height={20}
                />
              </div>
              <div>
                <Image
                  src="/whatsAppSim/black-full-battery.svg"
                  alt="Battery"
                  width={20}
                  height={20}
                />
              </div>
            </div>
          </div>
          <div className="w-full py-[10px] flex items-center">
            <ChevronLeftIcon className="w-8 h-8" />
            <div className="w-[36px] h-[36px] relative ml-[10px]">
              {organizationId && organizationLogoFileExtension ? (
                <Image
                  src={`https://${process.env.NEXT_PUBLIC_WASABI_ENDPOINT}/voxd/organisationLogos/${organizationId}.${organizationLogoFileExtension}`}
                  alt="Logo"
                  fill
                  unoptimized
                  style={{
                    objectFit: "contain",
                    backgroundColor: organizationShowLogoOnColour || "#fff",
                  }}
                  className="rounded-full"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {businessName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-[-2px] ml-[10px]">
              <div className="text-[14px] font-bold">
                {businessName.length > 24
                  ? `${businessName.slice(0, 24)}...`
                  : businessName}
              </div>
              <div className="text-[12px] text-[#777]">
                Business Organisation
              </div>
            </div>
          </div>
          <div
            className="w-full h-[540px] relative overflow-y-scroll bg-[url(/whatsAppSim/bg.png)] bg-contain bg-repeat "
            ref={scrollContainerRef}
          >
            {/* <Image
              src="/whatsAppSim/bg.jpg"
              alt="background"
              fill
              style={{
                objectFit: "cover",
                zIndex: 0,
              }}
              className="opacity-20"
            /> */}

            <div className="relative z-10 flex flex-col space-y-[12px] p-[12px]">
              {messages.map((message, index) => {
                currentMessageTime = addSeconds(
                  currentMessageTime,
                  message.time,
                );

                return (
                  <Message
                    key={index}
                    role={message.role}
                    text={message.content}
                    time={format(currentMessageTime, "HH:mm")}
                    annotation={message.annotation}
                    imageUrl={message.imageUrl}
                    fileName={message.fileName}
                    fileSize={message.fileSize}
                  />
                );
              })}
            </div>

            {/* Scroll down indicator */}
            <div
              className={cn(
                "absolute bottom-[5px] left-0 right-0 flex justify-center z-20 transition-opacity duration-300 group",
                isAtTop && messages.length > 3
                  ? "opacity-100 animate-bounce-subtle"
                  : "opacity-0 pointer-events-none",
              )}
            >
              <div className="relative">
                <div className="bg-black/20 text-gray-700 p-2.5 rounded-full backdrop-blur-sm shadow-sm">
                  <ChevronDownIcon className="w-7 h-7" />
                </div>
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                    Scroll down to see the rest of the conversation
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full py-[10px] pl-[10px] flex items-center space-x-[10px]">
            <PlusIcon className="w-7 h-7" />
            <div className="w-[190px] h-[26px] rounded-full bg-white border-[1px] border-[#DDD] flex justify-end items-center pr-[10px] relative top-[2px]">
              <Image
                src="/whatsAppSim/sticker.svg"
                alt="Sticker"
                width={24}
                height={24}
                className="w-[22px] h-[22px]"
              />
            </div>
            <CameraIcon className="w-6 h-6" />
            <MicrophoneIcon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
