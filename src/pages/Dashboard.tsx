import { useAuth } from "@/contexts/AuthContext";
import SiswaDashboard from "./SiswaDashboard";
import GuruDashboard from "./GuruDashboard";

export default function Dashboard() {
  const { role } = useAuth();
  if (role === "guru") return <GuruDashboard />;
  return <SiswaDashboard />;
}
