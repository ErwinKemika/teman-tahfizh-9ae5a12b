import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw } from "lucide-react";

const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Alafasy" },
  { id: "ar.abdurrahmaansudais", name: "Abdurrahman As-Sudais" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary" },
];

const CDN = "https://cdn.islamic.network/quran/audio/128";

export default function AudioPlayer({ ayahNumber }: { ayahNumber: number }) {
  const [reciter, setReciter] = useState("ar.alafasy");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = `${CDN}/${reciter}/${ayahNumber}.mp3`;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  useEffect(() => {
    // Reset on reciter change
    setPlaying(false);
    setProgress(0);
  }, [reciter]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
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

  const handleSeek = (val: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = (val[0] / 100) * audioRef.current.duration;
    setProgress(val[0]);
  };

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

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="shrink-0" onClick={togglePlay}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              setProgress(0);
            }
          }}
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>

      {/* Speed & Reciter */}
      <div className="flex items-center gap-2">
        <Select value={speed.toString()} onValueChange={(v) => setSpeed(parseFloat(v))}>
          <SelectTrigger className="w-20 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.75">0.75x</SelectItem>
            <SelectItem value="1">1x</SelectItem>
            <SelectItem value="1.25">1.25x</SelectItem>
            <SelectItem value="1.5">1.5x</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reciter} onValueChange={setReciter}>
          <SelectTrigger className="flex-1 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECITERS.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
