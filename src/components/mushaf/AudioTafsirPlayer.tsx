import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioTafsirPlayerProps {
  surahNumber: number;
  ayatNumber: number;
}

export default function AudioTafsirPlayer({ surahNumber, ayatNumber }: AudioTafsirPlayerProps) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const surahStr = surahNumber.toString().padStart(3, "0");
  const ayatStr = ayatNumber.toString().padStart(3, "0");
  const audioUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tafsir-audio/${surahStr}_${ayatStr}.mp3`;

  useEffect(() => {
    // Check if file exists
    fetch(audioUrl, { method: "HEAD" })
      .then((res) => setExists(res.ok))
      .catch(() => setExists(false));
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  if (exists === null) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 text-center text-sm text-muted-foreground">
        Memeriksa audio tafsir...
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="p-4 rounded-xl bg-muted/20 text-center space-y-2">
        <Volume2 className="w-8 h-8 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground/60">Audio tafsir belum tersedia</p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-muted/30 space-y-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        preload="metadata"
      />
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="shrink-0" onClick={togglePlay}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Slider
          value={[progress]}
          onValueChange={(val) => {
            if (audioRef.current) {
              audioRef.current.currentTime = (val[0] / 100) * audioRef.current.duration;
              setProgress(val[0]);
            }
          }}
          max={100}
          step={0.1}
          className="flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">Audio Tafsir — {surahStr}:{ayatStr}</p>
    </div>
  );
}
