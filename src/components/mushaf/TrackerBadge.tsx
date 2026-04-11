import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_MAP = {
  mutqin: { label: "✓ Sudah Hafal", className: "bg-success/10 text-success border-success/20" },
  tasmi_done: { label: "✓ Tasmi' Done", className: "bg-success/10 text-success border-success/20" },
  murajaah: { label: "📖 Sedang Dihafal", className: "bg-warning/10 text-warning border-warning/20" },
  belum_dihafalkan: { label: "Belum Dihafal", className: "bg-muted text-muted-foreground" },
} as const;

type TahfizhStatus = keyof typeof STATUS_MAP;

export default function TrackerBadge({ pageNumber }: { pageNumber: number }) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const { data: entry } = useQuery({
    queryKey: ["tahfizh-page-badge", user?.id, pageNumber],
    queryFn: async () => {
      const { data } = await supabase
        .from("tahfizh_entries")
        .select("id, status, is_mutqin")
        .eq("student_id", user!.id)
        .eq("page_number", pageNumber)
        .maybeSingle();
      return data;
    },
    enabled: !!user && role === "siswa",
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: TahfizhStatus) => {
      if (entry) {
        await supabase
          .from("tahfizh_entries")
          .update({
            status: newStatus,
            is_mutqin: newStatus === "mutqin",
          })
          .eq("id", entry.id);
      } else {
        await supabase.from("tahfizh_entries").insert({
          student_id: user!.id,
          page_number: pageNumber,
          status: newStatus,
          is_mutqin: newStatus === "mutqin",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tahfizh-page-badge"] });
      toast.success("Status hafalan diperbarui");
    },
  });

  if (role !== "siswa") return null;

  const status: TahfizhStatus = entry?.is_mutqin ? "mutqin" : (entry?.status as TahfizhStatus) || "belum_dihafalkan";
  const info = STATUS_MAP[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge variant="outline" className={`cursor-pointer text-[10px] ${info.className}`}>
          {info.label}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(STATUS_MAP) as [TahfizhStatus, typeof info][]).map(([key, val]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => updateStatus.mutate(key)}
            className="text-xs"
          >
            {val.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
