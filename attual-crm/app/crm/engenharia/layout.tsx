import AuthGate from "@/components/AuthGate";
import Menu from "@/components/engenharia/Menu";

export default function EngenhariaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="eng">
        <Menu />
        <div className="eng-conteudo">{children}</div>
      </div>
    </AuthGate>
  );
}
