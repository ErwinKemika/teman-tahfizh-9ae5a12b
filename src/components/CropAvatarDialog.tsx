import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

const C = 260;   // preview circle size (px)
const OUT = 400; // output image size (px)

export default function CropAvatarDialog({ imageSrc, open, onClose, onCropComplete }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const startDrag = (x: number, y: number) => {
    dragging.current = true;
    last.current = { x, y };
  };

  const moveDrag = (x: number, y: number) => {
    if (!dragging.current) return;
    setPos(p => ({ x: p.x + x - last.current.x, y: p.y + y - last.current.y }));
    last.current = { x, y };
  };

  const stopDrag = () => { dragging.current = false; };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return;
    setLoading(true);

    const { naturalWidth: nw, naturalHeight: nh } = img;
    // s = total scale from natural px → CSS px (cover + zoom)
    const s = Math.max(C / nw, C / nh) * zoom;
    const srcW = C / s;
    const srcX = nw / 2 - (C / 2 + pos.x) / s;
    const srcY = nh / 2 - (C / 2 + pos.y) / s;

    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, srcW, srcW, 0, 0, OUT, OUT);

    canvas.toBlob(blob => {
      setLoading(false);
      if (blob) onCropComplete(blob);
    }, "image/jpeg", 0.82);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sesuaikan Foto Profil</DialogTitle>
        </DialogHeader>

        {/* Circular crop preview */}
        <div
          className="relative mx-auto overflow-hidden rounded-full cursor-grab active:cursor-grabbing select-none bg-black"
          style={{ width: C, height: C }}
          onMouseDown={e => { startDrag(e.clientX, e.clientY); e.preventDefault(); }}
          onMouseMove={e => moveDrag(e.clientX, e.clientY)}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchEnd={stopDrag}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop preview"
            draggable={false}
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              transformOrigin: "center center",
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
              pointerEvents: "none",
            }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground -mt-1">Geser untuk atur posisi</p>

        <div className="space-y-2 px-1 mt-1">
          <p className="text-xs text-muted-foreground">Zoom</p>
          <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
        </div>

        <DialogFooter className="gap-2 flex-row justify-end mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Memproses..." : "Gunakan Foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
