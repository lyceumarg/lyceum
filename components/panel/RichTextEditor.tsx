"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

// Editor de texto enriquecido para bloques "richtext": reemplaza el textarea
// de HTML crudo. Al pegar desde Word/Google Docs, el navegador entrega el
// contenido como HTML en el portapapeles — Tiptap lo interpreta y conserva
// negrita/itálica/listas/enlaces automáticamente, filtrando el resto.
export default function RichTextEditor({
  value, onChange, placeholder = "Escribí el contenido de la lección…",
}: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "rte-content" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  if (!editor) return null;

  function btn(label: string, active: boolean, onClick: () => void, title: string) {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // no perder el foco/selección del editor
        onClick={onClick}
        title={title}
        className={`rte-btn${active ? " on" : ""}`}
      >
        {label}
      </button>
    );
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace", prev || "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {btn("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Negrita")}
        {btn("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Itálica")}
        {btn("H", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Subtítulo")}
        {btn("•", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Lista")}
        {btn("1.", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Lista numerada")}
        {btn("🔗", editor.isActive("link"), setLink, "Enlace")}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
