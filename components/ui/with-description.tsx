import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SwitchWithDescriptionProps {
  id?: string;
  label: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function SwitchWithDescription({
  id = "switch",
  label,
  description,
  checked,
  onCheckedChange,
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
        className="data-[state=checked]:bg-brand-primary data-[state=unchecked]:bg-white/10"
      />
    </div>
  );
}

// Default "Newsletter" demo preset
export function NewsletterSwitch() {
  return (
    <SwitchWithDescription
      id="newsletter"
      label="Newsletter"
      description="Receive the latest drops, exclusive beat packs & promo codes directly to your email"
    />
  );
}
