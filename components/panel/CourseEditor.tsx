"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BlockView, { type Block } from "@/components/BlockView";
import RichTextEditor from "@/components/panel/RichTextEditor";

type Lesson = { id: string; titulo: string; orden: number; blocks: Block[] };
type Module = { id: string; titulo: string; orden: number; lessons: Lesson[] };
type Question = {
  id: string;
  enunciado: string;
  explicacion: string | null;
  options: { id: string; texto: string; es_correcta: boolean }[];
};
export type EditorData = {
  course: { id: string; titulo: string; descripcion: string | null; categoria: string | null; precio: number; estado: string; emite_participacion: boolean; emite_certificacion: boolean; capacitador_id: string | null };
  tenantId: string;
  modulos: Module[];
  examCfg: { cant_preguntas: number; nota_corte: number; max_intentos: number };
  preguntas: Question[];
  signers: Signer[];
  instructores: Instructor[];
  categorias: { id: string; nombre: string }[];
};
type Signer = { id: string; nombre: string; cargo: string | null; firma_url: string | null; orden: number };
export type Instructor = { id: string; nombre: string; headline: string | null; bio: string | null; foto_url: string | null; linkedin_url: string | null };

const TIPOS: { t: Block["tipo"]; l: string }[] = [
  { t: "video", l: "Video" }, { t: "slides", l: "Slides" }, { t: "richtext", l: "Texto" },
  { t: "download", l: "Descargable" }, { t: "link", l: "Enlace" }, { t: "embed", l: "Embed" }, { t: "quiz", l: "Quiz" },
];

export default function CourseEditor({ data }: { data: EditorData }) {
  const supabase = createClient();
  const router = useRouter();
  const { tenantId } = data;
  const courseId = data.course.id;

  const searchParams = useSearchParams();
  const tabInicial = searchParams.get("tab") === "masiva" ? "masiva" : "c";
  const [tab, setTab] = useState<"c" | "e" | "cert" | "masiva">(tabInicial);
  const [course, setCourse] = useState(data.course);
  const [mods, setMods] = useState<Module[]>(data.modulos);
  const [sel, setSel] = useState<{ m: number; l: number } | null>(
    data.modulos[0]?.lessons[0] ? { m: 0, l: 0 } : null
  );
  const [cfg, setCfg] = useState(data.examCfg);
  const [qs, setQs] = useState<Question[]>(data.preguntas);
  const [emiteP, setEmiteP] = useState(data.course.emite_participacion);
  const [emiteC, setEmiteC] = useState(data.course.emite_certificacion);
  const [signers, setSigners] = useState<Signer[]>(data.signers);
  const [instructores, setInstructores] = useState<Instructor[]>(data.instructores);
  const [capacitadorId, setCapacitadorId] = useState<string | null>(data.course.capacitador_id);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [draftHtml, setDraftHtml] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function fail(e: any) { setErr(e?.message ?? "Ocurrió un error"); }

  // ---------- certificado: tipos y firmantes ----------
  async function setEmite(field: "emite_participacion" | "emite_certificacion", val: boolean) {
    if (field === "emite_participacion") setEmiteP(val); else setEmiteC(val);
    const { error } = await supabase.from("courses").update({ [field]: val }).eq("id", courseId);
    if (error) fail(error);
  }
  async function addSigner(nombre: string, cargo: string, file: File | null) {
    let firma_url: string | null = null;
    if (file) {
      const path = `${tenantId}/${courseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const up = await supabase.storage.from("firmas").upload(path, file, { upsert: true });
      if (up.error) return fail(up.error);
      firma_url = supabase.storage.from("firmas").getPublicUrl(path).data.publicUrl;
    }
    const { data: s, error } = await supabase.from("certificate_signers")
      .insert({ tenant_id: tenantId, course_id: courseId, nombre, cargo, firma_url, orden: signers.length })
      .select("id, nombre, cargo, firma_url, orden").single();
    if (error || !s) return fail(error);
    setSigners([...signers, s as Signer]);
  }
  async function delSigner(i: number) {
    const { error } = await supabase.from("certificate_signers").delete().eq("id", signers[i].id);
    if (error) return fail(error);
    setSigners(signers.filter((_, k) => k !== i));
  }

  // ---------- capacitador (identidad de quién dicta) ----------
  async function asignarCapacitador(id: string | null) {
    setCapacitadorId(id);
    const { error } = await supabase.from("courses").update({ capacitador_id: id }).eq("id", courseId);
    if (error) fail(error);
  }
  async function crearCapacitador(nombre: string, headline: string, bio: string, file: File | null) {
    let foto_url: string | null = null;
    if (file) {
      const path = `${tenantId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const up = await supabase.storage.from("instructores").upload(path, file, { upsert: true });
      if (up.error) return fail(up.error);
      foto_url = supabase.storage.from("instructores").getPublicUrl(path).data.publicUrl;
    }
    const { data: ins, error } = await supabase.from("instructores")
      .insert({ tenant_id: tenantId, nombre, headline: headline || null, bio: bio || null, foto_url })
      .select("id, nombre, headline, bio, foto_url, linkedin_url").single();
    if (error || !ins) return fail(error);
    setInstructores([ins as Instructor, ...instructores]);
    await asignarCapacitador(ins.id);
  }

  // ---------- curso ----------
  async function guardarCurso(override?: Partial<typeof course>) {
    const c = { ...course, ...override };
    const { error } = await supabase.from("courses").update({
      titulo: c.titulo, descripcion: c.descripcion,
      categoria: c.categoria, precio: c.precio,
    }).eq("id", courseId);
    if (error) return fail(error);
    setErr(null);
  }
  async function eliminarCurso() {
    if (!confirm("¿Eliminar este curso? Se borran módulos, lecciones, inscripciones y certificados asociados. Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) return fail(error);
    router.push("/panel");
  }

  async function togglePublicar() {
    const nuevo = course.estado === "publicado" ? "borrador" : "publicado";
    const { error } = await supabase.from("courses").update({ estado: nuevo }).eq("id", courseId);
    if (error) return fail(error);
    setCourse({ ...course, estado: nuevo });
  }

  // ---------- módulos / lecciones ----------
  async function addModule() {
    const { data: m, error } = await supabase.from("modules")
      .insert({ tenant_id: tenantId, course_id: courseId, titulo: "Nuevo módulo", orden: mods.length })
      .select("id").single();
    if (error || !m) return fail(error);
    setMods([...mods, { id: m.id, titulo: "Nuevo módulo", orden: mods.length, lessons: [] }]);
  }
  async function renameModule(i: number, titulo: string) {
    const copy = [...mods]; copy[i] = { ...copy[i], titulo }; setMods(copy);
    await supabase.from("modules").update({ titulo }).eq("id", mods[i].id);
  }
  async function delModule(i: number) {
    if (!confirm("¿Eliminar el módulo y sus lecciones?")) return;
    const { error } = await supabase.from("modules").delete().eq("id", mods[i].id);
    if (error) return fail(error);
    const copy = mods.filter((_, k) => k !== i); setMods(copy); setSel(null);
  }
  async function addLesson(mi: number) {
    const m = mods[mi];
    const { data: l, error } = await supabase.from("lessons")
      .insert({ tenant_id: tenantId, module_id: m.id, titulo: "Nueva lección", orden: m.lessons.length })
      .select("id").single();
    if (error || !l) return fail(error);
    const copy = [...mods];
    copy[mi] = { ...m, lessons: [...m.lessons, { id: l.id, titulo: "Nueva lección", orden: m.lessons.length, blocks: [] }] };
    setMods(copy); setSel({ m: mi, l: copy[mi].lessons.length - 1 });
  }
  async function renameLesson(mi: number, li: number, titulo: string) {
    const copy = [...mods]; copy[mi].lessons[li] = { ...copy[mi].lessons[li], titulo }; setMods(copy);
    await supabase.from("lessons").update({ titulo }).eq("id", mods[mi].lessons[li].id);
  }
  async function delLesson(mi: number, li: number) {
    const { error } = await supabase.from("lessons").delete().eq("id", mods[mi].lessons[li].id);
    if (error) return fail(error);
    const copy = [...mods]; copy[mi].lessons = copy[mi].lessons.filter((_, k) => k !== li); setMods(copy); setSel(null);
  }

  const lesson = sel ? mods[sel.m]?.lessons[sel.l] : null;

  // ---------- bloques ----------
  async function addBlock(tipo: Block["tipo"], contenido: Record<string, any>) {
    if (!sel || !lesson) return;
    const orden = lesson.blocks.length;
    const { data: b, error } = await supabase.from("content_blocks")
      .insert({ tenant_id: tenantId, lesson_id: lesson.id, tipo, orden, contenido })
      .select("id").single();
    if (error || !b) return fail(error);
    const copy = [...mods];
    copy[sel.m].lessons[sel.l].blocks = [...lesson.blocks, { id: b.id, tipo, contenido, media_url: null }];
    setMods(copy);
  }
  async function delBlock(bi: number) {
    if (!sel || !lesson) return;
    const { error } = await supabase.from("content_blocks").delete().eq("id", lesson.blocks[bi].id);
    if (error) return fail(error);
    const copy = [...mods];
    copy[sel.m].lessons[sel.l].blocks = lesson.blocks.filter((_, k) => k !== bi);
    setMods(copy);
  }
  async function updateBlock(bi: number, contenido: Record<string, any>) {
    if (!sel || !lesson) return;
    const { error } = await supabase.from("content_blocks").update({ contenido }).eq("id", lesson.blocks[bi].id);
    if (error) return fail(error);
    const copy = [...mods];
    copy[sel.m].lessons[sel.l].blocks[bi] = { ...lesson.blocks[bi], contenido };
    setMods(copy);
  }

  // ---------- examen ----------
  async function saveCfg(patch: Partial<typeof cfg>) {
    const next = { ...cfg, ...patch }; setCfg(next);
    await supabase.from("exam_config").upsert(
      { course_id: courseId, tenant_id: tenantId, ...next }, { onConflict: "course_id" }
    );
  }
  async function addQuestion(enunciado: string, opciones: string[], correcta: number, explicacion: string) {
    const { data: q, error } = await supabase.from("questions")
      .insert({ tenant_id: tenantId, course_id: courseId, enunciado, explicacion })
      .select("id").single();
    if (error || !q) return fail(error);
    const rows = opciones.filter(Boolean).map((texto, i) => ({
      tenant_id: tenantId, question_id: q.id, texto, es_correcta: i === correcta,
    }));
    const { data: opts, error: e2 } = await supabase.from("question_options").insert(rows).select("id, texto, es_correcta");
    if (e2) return fail(e2);
    setQs([...qs, { id: q.id, enunciado, explicacion, options: opts ?? [] }]);
  }
  async function delQuestion(qi: number) {
    const { error } = await supabase.from("questions").delete().eq("id", qs[qi].id);
    if (error) return fail(error);
    setQs(qs.filter((_, k) => k !== qi));
  }

  return (
    <div>
      {err && <div className="msg err" style={{ marginBottom: 12 }}>{err}</div>}

      {/* cabecera del curso */}
      <div className="card" style={{ padding: 20, marginBottom: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div><label className="ed-lab">Título</label>
            <input className="ed-inp" value={course.titulo}
              onChange={(e) => setCourse({ ...course, titulo: e.target.value })} onBlur={() => guardarCurso()} /></div>
          <div><label className="ed-lab">Categoría</label>
            <select className="ed-inp" value={course.categoria ?? ""}
              onChange={(e) => { const v = e.target.value || null; setCourse({ ...course, categoria: v }); guardarCurso({ categoria: v }); }}>
              <option value="">Sin categoría</option>
              {course.categoria && !data.categorias.some((c) => c.nombre === course.categoria) && (
                <option value={course.categoria}>{course.categoria} (no está en la lista)</option>
              )}
              {data.categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select></div>
          <div><label className="ed-lab">Precio (ARS)</label>
            <input className="ed-inp" type="number" value={course.precio}
              onChange={(e) => setCourse({ ...course, precio: Number(e.target.value) })} onBlur={() => guardarCurso()} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span className={`st ${course.estado === "publicado" ? "pub" : "draft"}`}>
            {course.estado === "publicado" ? "Publicado" : "Borrador"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost danger" style={{ padding: "8px 14px", fontSize: 13 }} onClick={eliminarCurso}>Eliminar curso</button>
            <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={togglePublicar}>
              {course.estado === "publicado" ? "Despublicar" : "Publicar"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <CapacitadorPicker
            instructores={instructores}
            capacitadorId={capacitadorId}
            onSelect={asignarCapacitador}
            onCreate={crearCapacitador}
          />
        </div>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "c" ? " on" : ""}`} onClick={() => setTab("c")}>Contenido</button>
        <button className={`tab${tab === "e" ? " on" : ""}`} onClick={() => setTab("e")}>Examen de certificación</button>
        <button className={`tab${tab === "cert" ? " on" : ""}`} onClick={() => setTab("cert")}>Certificado</button>
        <button className={`tab${tab === "masiva" ? " on" : ""}`} onClick={() => setTab("masiva")}>Inscripción masiva</button>
      </div>

      {tab === "c" ? (
        <div className="ed-grid">
          {/* árbol */}
          <div className="card tree">
            <h4>Módulos y lecciones</h4>
            {mods.map((m, mi) => (
              <div className="tmod" key={m.id}>
                <div className="trow">
                  <span className="tidx">M{String(mi + 1).padStart(2, "0")}</span>
                  <input className="tinp" defaultValue={m.titulo} onBlur={(e) => renameModule(mi, e.target.value)} />
                  <button className="tx" onClick={() => delModule(mi)}>✕</button>
                </div>
                {m.lessons.map((l, li) => (
                  <div key={l.id} className={`tles${sel?.m === mi && sel?.l === li ? " sel" : ""}`} onClick={() => { setSel({ m: mi, l: li }); setEditingBlock(null); }}>
                    <span className="tles-dot" />
                    <input className="tinp les" defaultValue={l.titulo}
                      onClick={(e) => e.stopPropagation()} onBlur={(e) => renameLesson(mi, li, e.target.value)} />
                    <button className="tx" onClick={(e) => { e.stopPropagation(); delLesson(mi, li); }}>✕</button>
                  </div>
                ))}
                <button className="tadd" onClick={() => addLesson(mi)}>+ Lección</button>
              </div>
            ))}
            <button className="btn ghost" style={{ width: "100%", marginTop: 6, padding: "8px", fontSize: 13 }} onClick={addModule}>+ Módulo</button>
          </div>

          {/* editor de bloques + preview */}
          <div className="ed-main" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
            <div className="card" style={{ padding: 20 }}>
              {lesson ? (
                <>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
                    Editando: <strong style={{ color: "var(--ink)" }}>{lesson.titulo}</strong>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}>Bloques</h3>
                  {lesson.blocks.length ? lesson.blocks.map((b, bi) => (
                    editingBlock === bi ? (
                      <div key={b.id} style={{ marginBottom: 10 }}>
                        <div className="ed-lab">Editando bloque de texto</div>
                        <RichTextEditor value={draftHtml} onChange={setDraftHtml} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn accent" style={{ padding: "8px 14px", fontSize: 13 }}
                            onClick={() => { updateBlock(bi, { html: draftHtml }); setEditingBlock(null); }}>
                            Guardar
                          </button>
                          <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setEditingBlock(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="blk-row" key={b.id}>
                        <span className="blk-label" style={{ margin: 0 }}>{b.tipo}</span>
                        <span className="t">{blockSummary(b)}</span>
                        {b.tipo === "richtext" && (
                          <button className="tx" title="Editar" onClick={() => { setEditingBlock(bi); setDraftHtml(b.contenido?.html || ""); }}>✎</button>
                        )}
                        <button className="tx" onClick={() => delBlock(bi)}>✕</button>
                      </div>
                    )
                  )) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Sin bloques todavía.</p>}
                  <BlockAdder onAdd={addBlock} />
                </>
              ) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Seleccioná o creá una lección.</p>}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Vista previa</h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Como lo verá el participante</p>
              {lesson?.blocks.map((b) => <BlockView key={b.id} b={b} />)}
            </div>
          </div>
        </div>
      ) : tab === "e" ? (
        <ExamEditor cfg={cfg} qs={qs} onCfg={saveCfg} onAdd={addQuestion} onDel={delQuestion} />
      ) : tab === "cert" ? (
        <CertEditor emiteP={emiteP} emiteC={emiteC} signers={signers} onEmite={setEmite} onAddSigner={addSigner} onDelSigner={delSigner} />
      ) : (
        <InscripcionMasivaTab courseId={courseId} />
      )}
    </div>
  );
}

function blockSummary(b: Block) {
  const c = b.contenido ?? {};
  return c.titulo || c.title || c.nombre || c.name || c.pregunta || c.question ||
    (c.html ? String(c.html).replace(/<[^>]+>/g, "").slice(0, 40) : "") || c.fuente || c.source || "—";
}

// ---------- alta de bloque ----------
function BlockAdder({ onAdd }: { onAdd: (t: Block["tipo"], c: Record<string, any>) => void }) {
  const [tipo, setTipo] = useState<Block["tipo"] | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  function confirmar() {
    if (!tipo) return;
    let c: Record<string, any> = {};
    if (["video", "slides", "embed"].includes(tipo)) c = { titulo: f.titulo, proveedor: f.prov, url: f.url };
    else if (tipo === "richtext") c = { html: f.html || "<p></p>" };
    else if (tipo === "download") c = { nombre: f.nombre || "Material.pdf", tipo_archivo: f.tipo || "PDF", url: f.url };
    else if (tipo === "link") c = { titulo: f.titulo || "Enlace", fuente: f.fuente, url: f.url };
    else if (tipo === "quiz") c = { pregunta: f.q, opciones: [f.o0, f.o1, f.o2, f.o3].filter(Boolean), correcta: Number(f.ans || 1) - 1 };
    onAdd(tipo, c); setTipo(null); setF({});
  }

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <div className="ed-lab" style={{ marginBottom: 8 }}>Agregar bloque</div>
      <div className="ed-types">
        {TIPOS.map((x) => <button key={x.t} onClick={() => setTipo(x.t)}>+ {x.l}</button>)}
      </div>
      {tipo && (
        <div style={{ marginTop: 12, padding: 14, border: "1px dashed var(--line-strong)", borderRadius: 4, background: "var(--surface-2)" }}>
          {["video", "slides", "embed"].includes(tipo) && (<>
            <input className="ed-inp" placeholder="Título" onChange={set("titulo")} />
            <input className="ed-inp" placeholder="Proveedor (YouTube, Storage…)" onChange={set("prov")} />
            <input className="ed-inp" placeholder="URL" onChange={set("url")} />
          </>)}
          {tipo === "richtext" && (
            <RichTextEditor value={f.html || ""} onChange={(html) => setF({ ...f, html })} />
          )}
          {tipo === "download" && (<>
            <input className="ed-inp" placeholder="Nombre del archivo" onChange={set("nombre")} />
            <input className="ed-inp" placeholder="Tipo (PDF, XLSX…)" onChange={set("tipo")} />
            <input className="ed-inp" placeholder="URL" onChange={set("url")} />
          </>)}
          {tipo === "link" && (<>
            <input className="ed-inp" placeholder="Título" onChange={set("titulo")} />
            <input className="ed-inp" placeholder="Fuente (BCRA, UIF…)" onChange={set("fuente")} />
            <input className="ed-inp" placeholder="URL" onChange={set("url")} />
          </>)}
          {tipo === "quiz" && (<>
            <input className="ed-inp" placeholder="Pregunta" onChange={set("q")} />
            <input className="ed-inp" placeholder="Opción 1" onChange={set("o0")} />
            <input className="ed-inp" placeholder="Opción 2" onChange={set("o1")} />
            <input className="ed-inp" placeholder="Opción 3" onChange={set("o2")} />
            <input className="ed-inp" placeholder="Opción 4" onChange={set("o3")} />
            <input className="ed-inp" placeholder="N° de opción correcta (1-4)" onChange={set("ans")} />
          </>)}
          <button className="btn accent" style={{ padding: "8px 14px", fontSize: 13 }} onClick={confirmar}>Agregar</button>
        </div>
      )}
    </div>
  );
}

// ---------- examen ----------
function ExamEditor({
  cfg, qs, onCfg, onAdd, onDel,
}: {
  cfg: EditorData["examCfg"]; qs: Question[];
  onCfg: (p: Partial<EditorData["examCfg"]>) => void;
  onAdd: (enunciado: string, opciones: string[], correcta: number, explicacion: string) => void;
  onDel: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [ops, setOps] = useState(["", "", "", ""]);
  const [correcta, setCorrecta] = useState(0);
  const [exp, setExp] = useState("");

  function guardar() {
    if (!q.trim() || ops.filter(Boolean).length < 2) return;
    onAdd(q, ops, correcta, exp);
    setQ(""); setOps(["", "", "", ""]); setCorrecta(0); setExp(""); setOpen(false);
  }

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Configuración</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <div><label className="ed-lab">Nota de corte (%)</label>
            <input className="ed-inp" type="number" defaultValue={cfg.nota_corte} onBlur={(e) => onCfg({ nota_corte: Number(e.target.value) })} /></div>
          <div><label className="ed-lab">Preguntas a mostrar</label>
            <input className="ed-inp" type="number" defaultValue={cfg.cant_preguntas} onBlur={(e) => onCfg({ cant_preguntas: Number(e.target.value) })} /></div>
          <div><label className="ed-lab">Intentos</label>
            <input className="ed-inp" type="number" defaultValue={cfg.max_intentos} onBlur={(e) => onCfg({ max_intentos: Number(e.target.value) })} /></div>
        </div>
      </div>

      <div className="panel-head" style={{ margin: "0 0 14px" }}>
        <h3 style={{ fontSize: 18 }}>Banco de preguntas ({qs.length})</h3>
        <button className="btn accent" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setOpen(!open)}>+ Agregar pregunta</button>
      </div>

      {open && (
        <div className="card" style={{ padding: 18, marginBottom: 14, background: "var(--surface-2)" }}>
          <label className="ed-lab">Enunciado</label>
          <input className="ed-inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pregunta" />
          <label className="ed-lab" style={{ marginTop: 6 }}>Opciones (marcá la correcta)</label>
          {ops.map((o, i) => (
            <div className="qopt-edit" key={i}>
              <input type="radio" name="correcta" checked={correcta === i} onChange={() => setCorrecta(i)} />
              <input className="ed-inp" placeholder={`Opción ${i + 1}`} value={o}
                onChange={(e) => { const c = [...ops]; c[i] = e.target.value; setOps(c); }} />
            </div>
          ))}
          <label className="ed-lab" style={{ marginTop: 6 }}>Explicación (opcional)</label>
          <textarea className="ed-inp" rows={2} value={exp} onChange={(e) => setExp(e.target.value)} />
          <button className="btn accent" style={{ padding: "8px 14px", fontSize: 13 }} onClick={guardar}>Guardar pregunta</button>
        </div>
      )}

      {qs.map((question, qi) => (
        <div className="qitem" key={question.id}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{qi + 1}. {question.enunciado}</div>
          {question.options.map((o) => (
            <div key={o.id} style={{ fontSize: 13, color: o.es_correcta ? "#1c5a3f" : "var(--muted)", fontWeight: o.es_correcta ? 600 : 400, padding: "2px 0" }}>
              {o.es_correcta ? "✓" : "○"} {o.texto}
            </div>
          ))}
          <button className="btn ghost" style={{ padding: "6px 12px", fontSize: 12.5, marginTop: 10 }} onClick={() => onDel(qi)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}

// ---------- config del certificado: tipos + firmantes con firma ----------
function CertEditor({
  emiteP, emiteC, signers, onEmite, onAddSigner, onDelSigner,
}: {
  emiteP: boolean; emiteC: boolean; signers: Signer[];
  onEmite: (f: "emite_participacion" | "emite_certificacion", v: boolean) => void;
  onAddSigner: (nombre: string, cargo: string, file: File | null) => Promise<void>;
  onDelSigner: (i: number) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!nombre.trim()) return;
    setBusy(true);
    await onAddSigner(nombre, cargo, file);
    setBusy(false);
    setNombre(""); setCargo(""); setFile(null);
  }

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Qué emite este curso</h3>
        <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: 14 }}>
          <input type="checkbox" checked={emiteP} onChange={(e) => onEmite("emite_participacion", e.target.checked)} />
          Constancia de <strong>participación</strong> (al completar el 100%, sin examen)
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={emiteC} onChange={(e) => onEmite("emite_certificacion", e.target.checked)} />
          Certificado de <strong>aprobación</strong> (al aprobar el examen, con nota)
        </label>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Firmantes</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          Nombre, cargo y firma digitalizada (imagen). Aparecen en el certificado y en la verificación pública.
        </p>
        {signers.length ? signers.map((s, i) => (
          <div className="blk-row" key={s.id}>
            {s.firma_url && <img src={s.firma_url} alt="" style={{ height: 34, objectFit: "contain", background: "#fff", borderRadius: 3, padding: 2 }} />}
            <span className="t"><strong>{s.nombre}</strong>{s.cargo ? ` · ${s.cargo}` : ""}</span>
            <button className="tx" onClick={() => onDelSigner(i)}>✕</button>
          </div>
        )) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Sin firmantes todavía.</p>}

        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12, display: "grid", gap: 8 }}>
          <input className="ed-inp" placeholder="Nombre del firmante" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="ed-inp" placeholder="Cargo (ej. Directora Académica)" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          <div>
            <label className="ed-lab">Firma digitalizada (PNG con fondo transparente, ideal)</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className="btn accent" style={{ padding: "8px 14px", fontSize: 13, justifySelf: "start" }} onClick={add} disabled={busy}>
            {busy ? "Subiendo…" : "+ Agregar firmante"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- capacitador: quién dicta el curso (identidad, sin login) ----------
function CapacitadorPicker({
  instructores, capacitadorId, onSelect, onCreate,
}: {
  instructores: Instructor[]; capacitadorId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (nombre: string, headline: string, bio: string, file: File | null) => Promise<void>;
}) {
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const actual = instructores.find((i) => i.id === capacitadorId) || null;

  async function crear() {
    if (!nombre.trim()) return;
    setBusy(true);
    await onCreate(nombre, headline, bio, file);
    setBusy(false);
    setNombre(""); setHeadline(""); setBio(""); setFile(null); setCreando(false);
  }

  return (
    <div>
      <label className="ed-lab">Capacitador · quién dicta este curso</label>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0, marginBottom: 10 }}>
        Le da identidad al curso. Se muestra en el catálogo y en la ficha del curso. No requiere que la persona tenga acceso al sistema.
      </p>

      {actual && (
        <div className="blk-row" style={{ marginBottom: 10 }}>
          {actual.foto_url && <img src={actual.foto_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />}
          <span className="t"><strong>{actual.nombre}</strong>{actual.headline ? ` · ${actual.headline}` : ""}</span>
          <button className="tx" onClick={() => onSelect(null)}>✕</button>
        </div>
      )}

      {!creando ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="ed-inp" style={{ margin: 0, maxWidth: 280 }}
            value={capacitadorId ?? ""}
            onChange={(e) => onSelect(e.target.value || null)}
          >
            <option value="">Sin capacitador asignado</option>
            {instructores.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
          <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setCreando(true)}>
            + Nuevo capacitador
          </button>
        </div>
      ) : (
        <div style={{ padding: 14, border: "1px dashed var(--line-strong)", borderRadius: 4, background: "var(--surface-2)", display: "grid", gap: 8 }}>
          <input className="ed-inp" style={{ margin: 0 }} placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="ed-inp" style={{ margin: 0 }} placeholder="Headline (ej. Especialista en PLAFTFP · ex-BCRA)" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <textarea className="ed-inp" style={{ margin: 0 }} rows={3} placeholder="Bio corta (opcional)" value={bio} onChange={(e) => setBio(e.target.value)} />
          <div>
            <label className="ed-lab">Foto (opcional)</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn accent" style={{ padding: "8px 14px", fontSize: 13 }} onClick={crear} disabled={busy}>
              {busy ? "Guardando…" : "Crear y asignar"}
            </button>
            <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setCreando(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- inscripción masiva: pegar lista, crea cuenta si falta + inscribe ----------
type ResultadoMasivo = { email: string; estado: string; detalle?: string };

function InscripcionMasivaTab({ courseId }: { courseId: string }) {
  const [lista, setLista] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoMasivo[] | null>(null);
  const [invalidas, setInvalidas] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true); setErr(null); setResultados(null); setInvalidas([]);
    try {
      const res = await fetch("/api/panel/inscripcion-masiva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lista }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "No se pudo procesar la lista"); return; }
      setResultados(data.resultados ?? []);
      setInvalidas(data.invalidas ?? []);
    } catch {
      setErr("No se pudo conectar con el servidor");
    } finally {
      setEnviando(false);
    }
  }

  const etiqueta: Record<string, string> = {
    creado_e_inscripto: "Cuenta creada e inscripto",
    inscripto: "Inscripto",
    ya_inscripto: "Ya estaba inscripto",
    error: "Error",
  };
  const colorEstado: Record<string, string> = {
    creado_e_inscripto: "var(--verify)", inscripto: "var(--verify)",
    ya_inscripto: "var(--muted)", error: "var(--danger)",
  };

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <label className="ed-lab">Inscripción masiva</label>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 0, marginBottom: 10 }}>
          Un alumno por línea: <code>email</code> o <code>email, Nombre Apellido</code>. Si el email no
          tiene cuenta en la academia, se crea automáticamente (con acceso vía &quot;Olvidé mi contraseña&quot;
          la primera vez). Pensado para inscripciones acordadas por fuera de la plataforma (convenio,
          transferencia, etc.) — no requiere pago en el sitio. La cuenta queda libre para inscribirse
          por su cuenta en cualquier otro curso.
        </p>
        <textarea
          className="ed-inp"
          rows={7}
          style={{ fontFamily: "monospace", fontSize: 13 }}
          placeholder={"maria.gonzalez@banco.com, María González\njuan.perez@banco.com, Juan Pérez\nlucia.fernandez@banco.com"}
          value={lista}
          onChange={(e) => setLista(e.target.value)}
        />
        {err && <div className="msg err" style={{ marginTop: 4 }}>{err}</div>}
        <button className="btn accent" style={{ marginTop: 10 }} onClick={enviar} disabled={enviando || !lista.trim()}>
          {enviando ? "Procesando…" : "Inscribir lista"}
        </button>
      </div>

      {invalidas.length > 0 && (
        <div className="msg err" style={{ marginBottom: 16 }}>
          {invalidas.length} línea(s) sin un email válido, se omitieron: {invalidas.join(" · ")}
        </div>
      )}

      {resultados && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {resultados.map((r, i) => (
            <div
              key={r.email}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "11px 16px", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13,
              }}
            >
              <span>{r.email}</span>
              <span style={{ color: colorEstado[r.estado], fontWeight: 600, fontSize: 12.5 }}>
                {etiqueta[r.estado] ?? r.estado}{r.detalle ? ` — ${r.detalle}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
