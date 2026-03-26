import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/utils";

// Generic reusable switch with label + description
interface SwitchWithDescriptionProps {
  id?: string;
  label: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function SwitchWithDescription({
  id = "switch",
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SwitchWithDescriptionProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={id} className="text-white font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-sm text-white/50">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-brand-primary data-[state=unchecked]:bg-white/10"
      />
    </div>
  );
}

// Live newsletter switch — reads real subscription state and calls real APIs
export function NewsletterSwitch({ className }: { className?: string }) {
  const { user, updateUserProfile } = useAuth();
  const { addSubscriber } = useData();
  const [loading, setLoading] = useState(false);

  const isSubscribed = user?.isSubscriber ?? false;

  const handleToggle = async (checked: boolean) => {
    if (!user?.email) {
      toast.error("Please log in to manage newsletter preferences.");
      return;
    }
    setLoading(true);
    try {
      if (checked) {
        await addSubscriber(user.email, 'newsletter');
        await updateUserProfile({ isSubscriber: true });
        toast.success("🎵 You're subscribed! Exclusive drops incoming.");
      } else {
        await updateUserProfile({ isSubscriber: false });
        toast.info("You've been unsubscribed from the newsletter.");
      }
    } catch {
      toast.error("Failed to update newsletter preference. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="newsletter" className="text-white font-medium">
          Newsletter
        </Label>
        <p className="text-sm text-white/50">
          {user?.email
            ? `Receive exclusive drops & promo codes to ${user.email}`
            : "Log in to subscribe to the newsletter"}
        </p>
      </div>
      <Switch
        id="newsletter"
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={loading || !user}
        className="data-[state=checked]:bg-brand-primary data-[state=unchecked]:bg-white/10"
      />
    </div>
  );
}
