"use client";

import { useEffect, useState } from "react";
import { FileUpload } from "@/components/ui/FileUpload";
import { listarArquivos } from "@/lib/arquivos/actions";

type Arquivo = Awaited<ReturnType<typeof listarArquivos>>[number];

/** As fotos que o pacote da semana usa (lib/geracao/fotos-banco.ts). */
export function FotosBanco() {
  const [fotosPost, setFotosPost] = useState<Arquivo[]>([]);
  const [fotosClinica, setFotosClinica] = useState<Arquivo[]>([]);
  const [fotoPerfil, setFotoPerfil] = useState<Arquivo[]>([]);

  async function recarregar() {
    const todos = await listarArquivos();
    setFotosPost(todos.filter((a) => a.tipo === "foto_post"));
    setFotosClinica(todos.filter((a) => a.tipo === "foto_clinica" || a.tipo === "foto_atendimento"));
    setFotoPerfil(todos.filter((a) => a.tipo === "foto_profissional"));
  }

  useEffect(() => {
    recarregar();
  }, []);

  return (
    <div className="space-y-6 rounded-2xl bg-white p-5 shadow-sm">
      <FileUpload
        label="Suas fotos e dos seus pratos"
        tipo="foto_post"
        descricao="Você cozinhando, seus pratos, você atendendo, o seu dia a dia. Quanto mais fotos, menos a mesma aparece. Foto em pé ou quadrada, com boa luz."
        multiplos
        arquivosExistentes={fotosPost}
        onUploadSucess={recarregar}
        onRemover={recarregar}
      />
      <FileUpload
        label="Fotos do consultório"
        tipo="foto_clinica"
        descricao="Também entram na rotação dos posts."
        multiplos
        arquivosExistentes={fotosClinica}
        onUploadSucess={recarregar}
        onRemover={recarregar}
      />
      <FileUpload
        label="Sua foto profissional"
        tipo="foto_profissional"
        descricao="A do seu perfil. Também entra na rotação."
        arquivosExistentes={fotoPerfil}
        onUploadSucess={recarregar}
        onRemover={recarregar}
      />
    </div>
  );
}
