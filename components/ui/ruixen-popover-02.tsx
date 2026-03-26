"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, ChevronLeft, ChevronRight, CheckCheck, Inbox } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils";
import { useData } from "@/context/DataContext";
import { AppNotification } from "@/types";

const typeColors: Record<AppNotification['type'], string> = {
  info:         'bg-blue-500/20 text-blue-300',
  success:      'bg-emerald-500/20 text-emerald-300',
  warning:      'bg-amber-500/20 text-amber-300',
  error:        'bg-red-500/20 text-red-300',
  product:      'bg-brand-primary/20 text-brand-primary',
  mixtape:      'bg-brand-cyan/20 text-brand-cyan',
  promotion:    'bg-brand-pink/20 text-brand-pink',
  subscription: 'bg-brand-gold/20 text-brand-gold',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPopover() {
  const { notifications, markNotificationAsRead, clearNotifications, notificationsLoading } = useData();
  const [step, setStep] = useState(0);

  const unread = notifications.filter(n => !n.read);
  const total = notifications.length;
  const safeStep = Math.min(step, Math.max(total - 1, 0));
  const current = notifications[safeStep];

  const next = () => setStep(p => Math.min(p + 1, total - 1));
  const back = () => setStep(p => Math.max(p - 1, 0));

  const handleViewDetails = async () => {
    if (current && !current.read) await markNotificationAsRead(current.id);
    if (current?.link) window.location.href = current.link;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          <Bell size={16} className="mr-2" />
          Notifications
          {unread.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[350px] border border-white/10 bg-[#1a1a1a] p-0 text-white shadow-2xl"
      >
        {!notificationsLoading && total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center px-6">
            <Inbox className="h-8 w-8 text-white/20" />
            <p className="text-sm text-white/40">You're all caught up!</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-72 p-4">
              {current && (
                <div className={cn("space-y-1 transition-opacity", current.read ? "opacity-60" : "")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide", typeColors[current.type])}>
                      {current.type}
                    </span>
                    {!current.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
                    )}
                  </div>
                  <p className="font-medium text-sm text-white">{current.title}</p>
                  <p className="text-sm text-white/60 mt-0.5">{current.message}</p>
                  <p className="text-xs text-white/40 mt-1">{timeAgo(current.createdAt)}</p>
                  {current.link && (
                    <button
                      onClick={handleViewDetails}
                      className="text-brand-primary text-sm hover:underline mt-2 inline-block font-medium"
                    >
                      View details →
                    </button>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 gap-2">
              <Button size="sm" variant="ghost" onClick={back} disabled={safeStep === 0}
                className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-white/40 flex-1 text-center">{safeStep + 1} / {total}</span>
              <Button size="sm" variant="ghost"
                onClick={() => current && markNotificationAsRead(current.id)}
                disabled={!current || current.read}
                title="Mark as read"
                className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 px-2">
                <CheckCheck className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={next} disabled={safeStep === total - 1}
                className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 px-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-t border-white/5 px-3 py-1.5">
              <button
                onClick={() => { clearNotifications(); setStep(0); }}
                className="w-full text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
