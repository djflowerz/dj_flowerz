"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils";

const notifications = [
  {
    title: "Welcome to DJ Flowerz!",
    message: "Let's get started by exploring the latest drops.",
    time: "Just now",
  },
  {
    title: "🔥 New Beat Pack Dropped",
    message: "The Nairobi Nights Vol. 3 pack is now live.",
    time: "5 minutes ago",
  },
  {
    title: "🎉 Exclusive Offer",
    message: "Use code LAUNCH20 for 20% off your first order.",
    time: "Today",
    cta: {
      text: "Shop Now →",
      href: "/store",
    },
  },
  {
    title: "🎵 Your Download is Ready",
    message: "Your mixtape download link is ready to use.",
    time: "1 day ago",
  },
];

export default function NotificationsPopover() {
  const [step, setStep] = useState(0);
  const maxSteps = notifications.length;

  const next = () => setStep((prev) => Math.min(prev + 1, maxSteps - 1));
  const back = () => setStep((prev) => Math.max(prev - 1, 0));

  const current = notifications[step];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
          <Bell size={16} className="mr-2" />
          Notifications
          {/* badge */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
            {maxSteps}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[350px] border border-white/10 bg-[#1a1a1a] p-0 text-white shadow-2xl"
      >
        <ScrollArea className="max-h-80 p-4">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-sm text-white">
                {current.title}
              </p>
              <p className="text-sm text-white/60 mt-0.5">
                {current.message}
              </p>
              <p className="text-xs text-white/40 mt-1">{current.time}</p>
              {current.cta && (
                <a
                  href={current.cta.href}
                  className="text-brand-primary text-sm hover:underline mt-2 inline-block font-medium"
                >
                  {current.cta.text}
                </a>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={back}
            disabled={step === 0}
            className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <span className="text-xs text-white/40">
            {step + 1} / {maxSteps}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={next}
            disabled={step === maxSteps - 1}
            className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
