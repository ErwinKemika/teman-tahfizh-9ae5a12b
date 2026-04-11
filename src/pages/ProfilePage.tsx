import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Info, Moon } from "lucide-react";

export default function ProfilePage() {
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [newPassword, setNewPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Profil berhasil diperbarui!"),
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password berhasil diubah!");
      setNewPassword("");
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-lg mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profil
        </h1>
      </div>

      {/* Avatar & Info */}
      <Card className="shadow-card">
        <CardContent className="py-6 flex flex-col items-center gap-3">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {profile?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="font-semibold text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Edit Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <Button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            className="w-full"
          >
            {updateProfileMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Ubah Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Password Baru</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              minLength={6}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => changePasswordMutation.mutate()}
            disabled={changePasswordMutation.isPending || newPassword.length < 6}
            className="w-full"
          >
            Ubah Password
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" /> Tentang
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Tahfizh Tracker v1.0</p>
          <p>Platform manajemen hafalan Al-Qur'an untuk sekolah Islam.</p>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={signOut}>
        Keluar
      </Button>
    </div>
  );
}
