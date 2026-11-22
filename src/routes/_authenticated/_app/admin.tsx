import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/rulis/common";
import { categoriesQuery, isAdminQuery, qk, type Activity } from "@/lib/queries";
import { GROUP_LABEL, PRICE_LEVEL_LABEL } from "@/lib/constants";
import { DEFAULT_WEIGHTS } from "@/lib/recommend";

export const Route = createFileRoute("/_authenticated/_app/admin")({
  beforeLoad: async ({ context }) => {
    const ok = await context.queryClient.ensureQueryData(isAdminQuery);
    if (!ok) throw redirect({ to: "/inicio" });
  },
  head: () => ({
    meta: [
      { title: "Administração — RULIS" },
      { name: "description", content: "Painel da equipe RULIS." },
      { property: "og:title", content: "Administração — RULIS" },
      { property: "og:description", content: "Painel da equipe RULIS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  return (
    <div>
      <PageHeader eyebrow="Administração" title="Bastidores da RULIS" />
      <Tabs defaultValue="metricas">
        <TabsList className="flex-wrap rounded-full">
          <TabsTrigger value="metricas" className="rounded-full">Métricas</TabsTrigger>
          <TabsTrigger value="lugares" className="rounded-full">Lugares</TabsTrigger>
          <TabsTrigger value="eventos" className="rounded-full">Eventos</TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-full">Usuários</TabsTrigger>
          <TabsTrigger value="motor" className="rounded-full">Motor</TabsTrigger>
        </TabsList>
        <TabsContent value="metricas" className="mt-6"><Metrics /></TabsContent>
        <TabsContent value="lugares" className="mt-6"><Places /></TabsContent>
        <TabsContent value="eventos" className="mt-6"><Events /></TabsContent>
        <TabsContent value="usuarios" className="mt-6"><Users /></TabsContent>
        <TabsContent value="motor" className="mt-6"><Weights /></TabsContent>
      </Tabs>
    </div>
  );
}

type MetricsData = {
  total_users: number; onboarded_users: number; active_users_30d: number; returning_users_30d: number;
  reco_accepted: number; reco_rejected: number;
  top_saved: { title: string; total: number }[]; top_completed: { title: string; total: number }[];
  top_categories: { group_key: string; total: number }[]; users_by_city: { city: string; total: number }[];
};

function Metrics() {
  const q = useQuery({ queryKey: ["admin-metrics"], queryFn: async () => { const { data, error } = await supabase.rpc("admin_metrics"); if (error) throw error; return data as unknown as MetricsData; } });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock error={q.error} />;
  const m = q.data!;
  const retention = m.active_users_30d ? Math.round((m.returning_users_30d / m.active_users_30d) * 100) : 0;
  const List = ({ title, rows }: { title: string; rows: { label: string; total: number }[] }) => (
    <div className="rounded-3xl bg-card p-5 shadow-card">
      <p className="font-semibold">{title}</p>
      {rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Sem dados ainda.</p> : (
        <ul className="mt-2 space-y-1 text-sm">{rows.map((r) => <li key={r.label} className="flex justify-between"><span>{r.label}</span><span className="font-semibold">{r.total}</span></li>)}</ul>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Usuários", m.total_users], ["Com onboarding", m.onboarded_users], ["Ativos (30 dias)", m.active_users_30d], ["Retenção 30d", `${retention}%`], ["Recomendações aceitas", m.reco_accepted], ["Recomendações rejeitadas", m.reco_rejected]].map(([l, v]) => (
          <div key={l as string} className="rounded-3xl bg-card p-4 shadow-card"><p className="text-xs text-muted-foreground">{l}</p><p className="font-display text-2xl font-extrabold">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <List title="Categorias mais acessadas" rows={m.top_categories.map((r) => ({ label: GROUP_LABEL[r.group_key] ?? r.group_key, total: r.total }))} />
        <List title="Atividades mais salvas" rows={m.top_saved.map((r) => ({ label: r.title, total: r.total }))} />
        <List title="Atividades mais realizadas" rows={m.top_completed.map((r) => ({ label: r.title, total: r.total }))} />
        <List title="Uso por cidade" rows={m.users_by_city.map((r) => ({ label: r.city, total: r.total }))} />
      </div>
      <p className="text-xs text-muted-foreground">Métricas agregadas. Nenhum dado pessoal sensível é exibido.</p>
    </div>
  );
}

const emptyPlace = {
  title: "", description: "", category_id: "", address: "", neighborhood: "", city: "Florianópolis", state: "SC",
  lat: "", lng: "", price_level: "", duration_min_minutes: "60", duration_max_minutes: "120", indoor: false,
  energy: "calm", crowd: "busy", family_friendly: false, cover_image_url: "", external_url: "", is_verified: false, is_active: true,
};

function Places() {
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const q = useQuery({ queryKey: ["admin-activities"], queryFn: async () => { const { data, error } = await supabase.from("activities").select("*").order("updated_at", { ascending: false }); if (error) throw error; return data; } });
  const [editing, setEditing] = useState<(typeof emptyPlace & { id?: string }) | null>(null);
  const [filter, setFilter] = useState("");

  const save = useMutation({
    mutationFn: async (p: typeof emptyPlace & { id?: string }) => {
      const cat = cats.data?.find((c) => c.id === p.category_id);
      if (!p.title.trim() || !cat) throw new Error("Título e categoria são obrigatórios");
      const { data: u } = await supabase.auth.getUser();
      const lat = p.lat ? Number(p.lat) : null;
      const lng = p.lng ? Number(p.lng) : null;
      if ((lat != null && (lat < -90 || lat > 90)) || (lng != null && (lng < -180 || lng > 180))) throw new Error("Coordenadas inválidas");
      const row = {
        title: p.title.trim(), description: p.description.trim() || null, category_id: cat.id, group_key: cat.group_key,
        address: p.address.trim() || null, neighborhood: p.neighborhood.trim() || null, city: p.city.trim() || "Florianópolis", state: p.state.trim() || "SC",
        lat, lng, price_level: p.price_level === "" ? null : Number(p.price_level),
        duration_min_minutes: Math.max(5, Number(p.duration_min_minutes) || 60), duration_max_minutes: Math.max(Number(p.duration_min_minutes) || 60, Number(p.duration_max_minutes) || 120),
        indoor: p.indoor, energy: p.energy, crowd: p.crowd, family_friendly: p.family_friendly,
        cover_image_url: p.cover_image_url.trim() || null, external_url: p.external_url.trim() || null,
        is_verified: p.is_verified, is_active: p.is_active, last_verified_at: p.is_verified ? new Date().toISOString() : null,
      };
      const res = p.id ? await supabase.from("activities").update(row).eq("id", p.id) : await supabase.from("activities").insert({ ...row, is_demo: false, created_by: u.user?.id });
      if (res.error) throw res.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-activities"] }); qc.invalidateQueries({ queryKey: qk.activities }); toast.success("Salvo"); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock error={q.error} />;
  const list = (q.data ?? []).filter((a) => a.title.toLowerCase().includes(filter.toLowerCase()));
  const dupes = new Set((q.data ?? []).map((a) => a.title.trim().toLowerCase()).filter((t, i, arr) => arr.indexOf(t) !== i));

  const toForm = (a: Activity) => ({ ...emptyPlace, ...Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v == null ? "" : typeof v === "number" ? String(v) : v])), indoor: a.indoor, family_friendly: a.family_friendly, is_verified: a.is_verified, is_active: a.is_active, id: a.id }) as typeof emptyPlace & { id: string };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Buscar lugar…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
        <Button variant="hero" onClick={() => setEditing({ ...emptyPlace })}><Plus /> Novo lugar</Button>
      </div>
      <div className="overflow-hidden rounded-3xl bg-card shadow-card">
        {list.map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.title} {dupes.has(a.title.trim().toLowerCase()) && <span className="ml-1 rounded-full bg-warning/20 px-2 text-[10px] font-semibold">possível duplicado</span>}</p>
              <p className="text-xs text-muted-foreground">
                {GROUP_LABEL[a.group_key]} · {a.neighborhood ?? a.city} · {a.is_demo ? "demonstração" : "cadastro real"} · {a.is_verified ? "verificado" : "não verificado"} · atualizado {new Date(a.updated_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            {a.is_verified && <CheckCircle2 className="size-4 text-success" aria-label="Verificado" />}
            <Switch checked={a.is_active} aria-label="Ativo" onCheckedChange={async (v) => { const { error } = await supabase.from("activities").update({ is_active: v }).eq("id", a.id); if (error) toast.error(error.message); qc.invalidateQueries({ queryKey: ["admin-activities"] }); qc.invalidateQueries({ queryKey: qk.activities }); }} />
            <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditing(toForm(a))}><Pencil /></Button>
          </div>
        ))}
      </div>
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle className="font-display">{editing?.id ? "Editar lugar" : "Novo lugar"}</SheetTitle></SheetHeader>
          {editing && (
            <div className="space-y-3 px-4 pb-8">
              <F l="Nome"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></F>
              <F l="Categoria">
                <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={editing.category_id} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                  <option value="">Escolha…</option>
                  {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{GROUP_LABEL[c.group_key]} — {c.name}</option>)}
                </select>
              </F>
              <F l="Descrição"><Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></F>
              <F l="Endereço"><Input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></F>
              <div className="grid grid-cols-2 gap-2">
                <F l="Bairro"><Input value={editing.neighborhood} onChange={(e) => setEditing({ ...editing, neighborhood: e.target.value })} /></F>
                <F l="Cidade"><Input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></F>
                <F l="Latitude"><Input inputMode="decimal" value={editing.lat} onChange={(e) => setEditing({ ...editing, lat: e.target.value })} /></F>
                <F l="Longitude"><Input inputMode="decimal" value={editing.lng} onChange={(e) => setEditing({ ...editing, lng: e.target.value })} /></F>
                <F l="Duração mín. (min)"><Input type="number" value={editing.duration_min_minutes} onChange={(e) => setEditing({ ...editing, duration_min_minutes: e.target.value })} /></F>
                <F l="Duração máx. (min)"><Input type="number" value={editing.duration_max_minutes} onChange={(e) => setEditing({ ...editing, duration_max_minutes: e.target.value })} /></F>
              </div>
              <F l="Faixa de preço">
                <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={editing.price_level} onChange={(e) => setEditing({ ...editing, price_level: e.target.value })}>
                  <option value="">Não verificado</option>
                  {Object.entries(PRICE_LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </F>
              <div className="grid grid-cols-2 gap-2">
                <F l="Ritmo">
                  <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={editing.energy} onChange={(e) => setEditing({ ...editing, energy: e.target.value })}><option value="calm">Tranquilo</option><option value="lively">Movimentado</option></select>
                </F>
                <F l="Público">
                  <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={editing.crowd} onChange={(e) => setEditing({ ...editing, crowd: e.target.value })}><option value="busy">Movimentado</option><option value="reserved">Reservado</option></select>
                </F>
              </div>
              <F l="URL da imagem (opcional)"><Input value={editing.cover_image_url} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} /></F>
              <F l="Link externo (opcional)"><Input value={editing.external_url} onChange={(e) => setEditing({ ...editing, external_url: e.target.value })} /></F>
              {([["indoor", "Ambiente coberto"], ["family_friendly", "Familiar"], ["is_verified", "Informações verificadas"], ["is_active", "Ativo"]] as const).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between"><Label>{l}</Label><Switch checked={editing[k]} onCheckedChange={(v) => setEditing({ ...editing, [k]: v })} /></div>
              ))}
              <Button variant="hero" className="w-full" onClick={() => save.mutate(editing)} disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Salvar</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function F({ l, children }: { l: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{l}</Label>{children}</div>;
}

function Events() {
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const q = useQuery({ queryKey: ["admin-events"], queryFn: async () => { const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: false }); if (error) throw error; return data; } });
  const [f, setF] = useState({ title: "", description: "", category_id: "", starts_at: "", ends_at: "", address: "", external_url: "", publish_until: "", is_free: false });
  const add = useMutation({
    mutationFn: async () => {
      const cat = cats.data?.find((c) => c.id === f.category_id);
      if (!f.title.trim() || !f.starts_at) throw new Error("Título e data são obrigatórios");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("events").insert({
        title: f.title.trim(), description: f.description.trim() || null, category_id: cat?.id ?? null, group_key: cat?.group_key ?? "entretenimento",
        starts_at: new Date(f.starts_at).toISOString(), ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null, address: f.address.trim() || null,
        external_url: f.external_url.trim() || null, publish_until: f.publish_until ? new Date(f.publish_until).toISOString() : null, is_free: f.is_free, created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-events"] }); qc.invalidateQueries({ queryKey: qk.events }); toast.success("Evento cadastrado"); setF({ ...f, title: "", description: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-3xl bg-card p-5 shadow-card">
        <p className="font-semibold">Cadastrar evento real</p>
        <F l="Título"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></F>
        <F l="Categoria">
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
            <option value="">Escolha…</option>
            {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{GROUP_LABEL[c.group_key]} — {c.name}</option>)}
          </select>
        </F>
        <F l="Descrição"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
        <div className="grid grid-cols-2 gap-2">
          <F l="Início"><Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></F>
          <F l="Fim"><Input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></F>
        </div>
        <F l="Endereço"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></F>
        <F l="Link externo"><Input value={f.external_url} onChange={(e) => setF({ ...f, external_url: e.target.value })} /></F>
        <F l="Publicar até"><Input type="datetime-local" value={f.publish_until} onChange={(e) => setF({ ...f, publish_until: e.target.value })} /></F>
        <div className="flex items-center justify-between"><Label>Gratuito</Label><Switch checked={f.is_free} onCheckedChange={(v) => setF({ ...f, is_free: v })} /></div>
        <Button variant="hero" onClick={() => add.mutate()} disabled={add.isPending}>{add.isPending && <Loader2 className="animate-spin" />} Cadastrar</Button>
      </div>
      <div className="overflow-hidden rounded-3xl bg-card shadow-card">
        {q.isLoading ? <LoadingBlock /> : (q.data ?? []).length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nenhum evento cadastrado.</p> : (q.data ?? []).map((e) => (
          <div key={e.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{e.title}</p><p className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString("pt-BR")}</p></div>
            <Switch checked={e.is_active} aria-label="Ativo" onCheckedChange={async (v) => { await supabase.from("events").update({ is_active: v }).eq("id", e.id); qc.invalidateQueries({ queryKey: ["admin-events"] }); qc.invalidateQueries({ queryKey: qk.events }); }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-users"], queryFn: async () => { const { data, error } = await supabase.rpc("admin_list_users"); if (error) throw error; return data; } });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock error={q.error} />;
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-card">
      {(q.data ?? []).map((u) => (
        <div key={u.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{u.full_name || "—"} {u.is_admin && <span className="ml-1 rounded-full bg-primary-soft px-2 text-[10px] font-semibold text-primary">admin</span>}</p>
            <p className="text-xs text-muted-foreground">{u.city ?? "—"}{u.state ? `/${u.state}` : ""} · desde {new Date(u.created_at).toLocaleDateString("pt-BR")} · {u.onboarding_completed ? "onboarding concluído" : "onboarding pendente"}</p>
          </div>
          <Switch
            checked={u.is_active}
            aria-label="Conta ativa"
            disabled={u.is_admin}
            onCheckedChange={async (v) => {
              const { error } = await supabase.rpc("admin_set_user_active", { _user_id: u.id, _active: v });
              if (error) toast.error(error.message); else toast.success(v ? "Conta ativada" : "Conta desativada");
              qc.invalidateQueries({ queryKey: ["admin-users"] });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function Weights() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-weights"], queryFn: async () => { const { data, error } = await supabase.from("recommendation_weights").select("*").order("weight", { ascending: false }); if (error) throw error; return data; } });
  const [vals, setVals] = useState<Record<string, string>>({});
  if (q.isLoading) return <LoadingBlock />;
  const total = (q.data ?? []).reduce((s, w) => s + Number(vals[w.key] ?? w.weight), 0);
  return (
    <div className="max-w-xl space-y-3 rounded-3xl bg-card p-5 shadow-card">
      <p className="font-semibold">Pesos do motor de recomendação</p>
      <p className="text-sm text-muted-foreground">Regras determinísticas — não é aprendizado de máquina. A pontuação só ordena sugestões. Padrão: {Object.values(DEFAULT_WEIGHTS).join("/")}.</p>
      {(q.data ?? []).map((w) => (
        <div key={w.key} className="flex items-center justify-between gap-3">
          <Label>{w.label}</Label>
          <Input type="number" min={0} className="w-24" value={vals[w.key] ?? String(Number(w.weight))} onChange={(e) => setVals({ ...vals, [w.key]: e.target.value })} />
        </div>
      ))}
      <p className="text-sm">Total: {total} {total !== 100 && <span className="text-muted-foreground">(normalizado automaticamente)</span>}</p>
      <Button
        variant="hero"
        onClick={async () => {
          for (const [key, v] of Object.entries(vals)) {
            const { error } = await supabase.from("recommendation_weights").update({ weight: Math.max(0, Number(v) || 0) }).eq("key", key);
            if (error) return toast.error(error.message);
          }
          qc.invalidateQueries({ queryKey: ["admin-weights"] });
          qc.invalidateQueries({ queryKey: qk.weights });
          toast.success("Pesos atualizados");
        }}
      >
        Salvar pesos
      </Button>
    </div>
  );
}
