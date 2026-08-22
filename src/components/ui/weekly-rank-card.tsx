import { Trophy } from "lucide-react";
import { useWeeklyRanking, getWeekLabel } from "@/hooks/useWeeklyRanking";

const MEDALS = ["🥇", "🥈", "🥉"];

interface WeeklyRankCardProps {
  currentUserId?: string;
}

export function WeeklyRankCard({ currentUserId }: WeeklyRankCardProps) {
  const { data: ranking, isLoading } = useWeeklyRanking();
  const weekLabel = getWeekLabel();

  const top10 = ranking?.slice(0, 10) ?? [];
  const myEntry = currentUserId ? ranking?.find((s) => s.student_id === currentUserId) : null;
  const myInTop10 = top10.some((s) => s.student_id === currentUserId);

  return (
    <div className="bg-white dark:bg-[#10243c] rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#fff1e0] dark:bg-[#3d3010] text-[#c98a2f] dark:text-[#d4a943] shrink-0">
            <Trophy className="w-[18px] h-[18px]" />
          </span>
          <h3 className="font-display text-[15px] sm:text-[19px] text-[#0f2742] dark:text-[#e8edf5] truncate">
            Top 10 Pekan Ini
          </h3>
        </div>
        <span className="text-[11.5px] text-[#9aa6b8] dark:text-[#5a6a80] shrink-0">{weekLabel}</span>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-6 py-4 space-y-1.5">
        {isLoading && (
          <p className="py-8 text-center text-[13px] text-[#9aa6b8] dark:text-[#5a6a80]">
            Memuat data…
          </p>
        )}

        {!isLoading && top10.length === 0 && (
          <p className="py-8 text-center text-[13px] text-[#9aa6b8] dark:text-[#5a6a80]">
            Belum ada aktivitas minggu ini
          </p>
        )}

        {top10.map((s) => {
          const isMe = s.student_id === currentUserId;
          const medal = MEDALS[s.rank - 1];
          return (
            <RankRow key={s.student_id} s={s} isMe={isMe} medal={medal} />
          );
        })}

        {/* Tampilkan posisi saya jika di luar top 10 */}
        {myEntry && !myInTop10 && (
          <>
            <div className="text-center text-[11px] text-[#c4cdd9] dark:text-[#3a4a5a] py-0.5">
              • • •
            </div>
            <RankRow s={myEntry} isMe medal={undefined} />
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap px-4 sm:px-6 pb-4 pt-1">
        {[
          { label: "Ujian", weight: "40%" },
          { label: "Hafalan", weight: "35%" },
          { label: "Murojaah", weight: "25%" },
        ].map((item) => (
          <span key={item.label} className="text-[10.5px] text-[#9aa6b8] dark:text-[#5a6a80]">
            {item.label}{" "}
            <span className="text-[#c9a35a] font-semibold">{item.weight}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function RankRow({
  s,
  isMe,
  medal,
}: {
  s: { student_id: string; name: string; skor_ujian: number; skor_hafalan: number; skor_murojaah: number; skor_akhir: number; rank: number };
  isMe: boolean;
  medal: string | undefined;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors ${
        isMe
          ? "bg-[#e7f0fb] dark:bg-[#1a2f4a] ring-1 ring-[#1b426f]/20 dark:ring-[#5b9fd4]/20"
          : "hover:bg-[#f7f9fc] dark:hover:bg-[#162236]"
      }`}
    >
      {/* Rank / medal */}
      <div className="w-7 text-center shrink-0">
        {medal ? (
          <span className="text-[16px] leading-none">{medal}</span>
        ) : (
          <span className={`text-[12px] font-bold ${isMe ? "text-[#1b426f] dark:text-[#5b9fd4]" : "text-[#9aa6b8] dark:text-[#5a6a80]"}`}>
            {s.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0 ${
          isMe
            ? "bg-[#1b426f] dark:bg-[#2a5a8f] text-white"
            : "bg-[#eef2f7] dark:bg-[#162236] text-[#1b426f] dark:text-[#5b9fd4]"
        }`}
      >
        {s.name.charAt(0)}
      </div>

      {/* Name + bar + breakdown */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span
            className={`text-[13px] font-semibold truncate ${
              isMe ? "text-[#1b426f] dark:text-[#5b9fd4]" : "text-[#0f2742] dark:text-[#e8edf5]"
            }`}
          >
            {s.name}
            {isMe && <span className="ml-1 text-[11px] font-normal opacity-70">(Kamu)</span>}
          </span>
          <span className="text-[13px] font-bold text-[#0f2742] dark:text-[#e8edf5] shrink-0 tabular-nums">
            {s.skor_akhir}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-1 h-1.5 rounded-full bg-[#eef2f7] dark:bg-[#162236] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#c9a35a] to-[#1b426f]"
            style={{ width: `${s.skor_akhir}%` }}
          />
        </div>

        {/* Score breakdown */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-[#9aa6b8] dark:text-[#5a6a80]">U:{s.skor_ujian}</span>
          <span className="text-[10px] text-[#c4cdd9] dark:text-[#3a4a5a]">·</span>
          <span className="text-[10px] text-[#9aa6b8] dark:text-[#5a6a80]">H:{s.skor_hafalan}</span>
          <span className="text-[10px] text-[#c4cdd9] dark:text-[#3a4a5a]">·</span>
          <span className="text-[10px] text-[#9aa6b8] dark:text-[#5a6a80]">M:{s.skor_murojaah}</span>
        </div>
      </div>
    </div>
  );
}
