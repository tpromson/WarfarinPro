import { useState } from "react";
import { Lock } from "lucide-react";
import Panel from "./Panel";

export default function StaffLogin({
  lang,
  loading,
  error,
  onLogin,
}: {
  lang: "th" | "en";
  loading: boolean;
  error: string;
  onLogin: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Panel title={lang === "th" ? "เข้าสู่ระบบเจ้าหน้าที่" : "Staff Login"} icon={<Lock size={18} />}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(email.trim(), password);
          }}
        >
          <label className="field">
            {lang === "th" ? "อีเมล" : "Email"}
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label className="field">
            {lang === "th" ? "รหัสผ่าน" : "Password"}
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>
          {error && <p className="text-xs font-bold text-clinic-red">{error}</p>}
          <button className="icon-button w-full justify-center" disabled={loading} type="submit">
            {loading
              ? lang === "th"
                ? "กำลังเข้าสู่ระบบ..."
                : "Signing in..."
              : lang === "th"
                ? "เข้าสู่ระบบเจ้าหน้าที่"
                : "Sign in"}
          </button>
        </form>
      </Panel>
    </div>
  );
}
