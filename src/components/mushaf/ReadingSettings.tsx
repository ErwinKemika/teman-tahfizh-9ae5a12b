import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";

interface ReadingSettingsProps {
  open: boolean;
  onClose: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  showTranslation: boolean;
  onShowTranslationChange: (v: boolean) => void;
}

export default function ReadingSettings({
  open,
  onClose,
  fontSize,
  onFontSizeChange,
  showTranslation,
  onShowTranslationChange,
}: ReadingSettingsProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-sm">Pengaturan Bacaan</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm">Ukuran Font Arab ({fontSize}px)</Label>
            <Slider
              value={[fontSize]}
              onValueChange={(v) => onFontSizeChange(v[0])}
              min={18}
              max={48}
              step={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Tampilkan Terjemahan</Label>
            <Switch checked={showTranslation} onCheckedChange={onShowTranslationChange} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Mode Gelap</Label>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
