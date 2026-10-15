import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Start } from "./pages/Start";
import { Upload } from "./pages/Upload";
import { Accessibility, Privacy } from "./pages/Info";
import { Api, createApi } from "./lib/api";

function useHash() {
  const [h, setH] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => { setH(location.hash || "#/"); document.getElementById("main")?.focus(); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return h;
}

export default function App({ apiOverride }: { apiOverride?: Api }) {
  const hash = useHash();
  const [api, setApi] = useState<Api | null>(apiOverride ?? null);
  useEffect(() => { if (!apiOverride) createApi().then(setApi); }, [apiOverride]);

  const [path, query = ""] = hash.split("?");
  const reason = new URLSearchParams(query).get("reason") ?? undefined;
  let page = <Home />;
  if (path === "#/start") page = api ? <Start api={api} initialReason={reason} /> : <p>Loading…</p>;
  else if (path === "#/upload") page = api ? <Upload api={api} /> : <p>Loading…</p>;
  else if (path === "#/accessibility") page = <Accessibility />;
  else if (path === "#/privacy") page = <Privacy />;
  return <Layout current={path}>{page}</Layout>;
}
