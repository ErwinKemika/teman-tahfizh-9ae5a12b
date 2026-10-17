import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, compareNama } from "@/lib/utils";

interface StudentOption {
  user_id: string;
  full_name: string;
}

interface StudentPickerProps {
  students: StudentOption[] | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allOption?: { value: string; label: string };
  className?: string;
}

export default function StudentPicker({
  students,
  value,
  onChange,
  placeholder = "Pilih siswa...",
  allOption,
  className,
}: StudentPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () => [...(students || [])].sort((a, b) => compareNama(a.full_name, b.full_name)),
    [students]
  );

  // Filter manually so cmdk doesn't re-rank results by match score — order must stay alphabetical.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? sorted.filter((s) => s.full_name.toLowerCase().includes(q)) : sorted;
  }, [sorted, search]);

  const selectedLabel =
    allOption && value === allOption.value
      ? allOption.label
      : sorted.find((s) => s.user_id === value)?.full_name;

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className
          )}
        >
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[14rem]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari nama siswa..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-72 overscroll-contain">
            <CommandEmpty>Siswa tidak ditemukan</CommandEmpty>
            {allOption && !search && (
              <CommandItem value={allOption.value} onSelect={() => select(allOption.value)}>
                <Check className={cn("mr-2 h-4 w-4", value === allOption.value ? "opacity-100" : "opacity-0")} />
                {allOption.label}
              </CommandItem>
            )}
            {filtered.map((s) => (
              <CommandItem key={s.user_id} value={s.user_id} onSelect={() => select(s.user_id)}>
                <Check className={cn("mr-2 h-4 w-4", value === s.user_id ? "opacity-100" : "opacity-0")} />
                {s.full_name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
