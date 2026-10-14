"use client";

import { useEffect, useState } from "react";
import { FileUpload } from "@/components/ui/FileUpload";
import { listarArquivos } from "@/lib/arquivos/actions";

// Declarado à mão: o tipo gerado do banco está velho e devolve `never`.
type Arquivo = {
  id: string;
  tipo: string;
  nome_arquivo: string;
  url_storage: string;
  descricao_auto?: string | null;
  assuntos?: string[] | null;
};

// Em palavras dela: em que tipo de post a foto entra.
const ROTULO_ASSUNTO: Record<string, string> = {
  profissional: "você",
  atendimento: "atendimento",
  consultorio: "consultório",
  prato: "prato",
  ingrediente: "ingredientes",
  cozinha: "cozinha",
  kit: "kit do teste",
  coleta: "coleta",
  exame: "exames",
  suplemento: "suplemento",
  atividade: "movimento",
  bem_estar: "bem-estar",
};

/** As fotos que o pacote da semana usa (lib/geracao/fotos-banco.ts). */
export function FotosBanco() {
  const [fotosPost, setFotosPost] = useState<Arquivo[]>([]);
  const [fotosClinica, setFotosClinica] = useState<Arquivo[]>([]);
  const [fotoPerfil, setFotoPerfil] = useState<Arquivo[]>([]);

  async function recarregar() {
    const todos = (await listarArquivos()) as unknown as Arquivo[];
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
      <FotosDescritas fotos={[...fotosPost, ...fotosClinica, ...fotoPerfil]} />
    </div>
  );
}

/**
 * O que o Scanner viu em cada foto (Aline, 14/10/2026). É por estes assuntos
 * que a semana escolhe a foto de cada slide: a de atendimento vai no post da
 * consulta, a do prato no post de receita.
 */
function FotosDescritas({ fotos }: { fotos: Arquivo[] }) {
  if (fotos.length === 0) return null;
  return (
    <div className="border-t border-gray-100 pt-5">
      <h3 className="text-sm font-semibold text-gray-800">Em que posts cada foto entra</h3>
      <p className="mt-1 text-xs text-gray-500">
        Ao subir, o Scanner olha a foto e anota o que aparece nela. Na semana, cada slide pega a foto que combina com o
        assunto dele: a sua foto atendendo vai no post da consulta, a do prato no post de receita.
      </p>
      <ul className="mt-3 space-y-2">
        {fotos.map((f) => (
          <li key={f.id} className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url_storage} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
            <div className="min-w-0 text-xs">
              {f.descricao_auto ? (
                <>
                  <p className="text-gray-700">{f.descricao_auto}</p>
                  {f.assuntos?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {f.assuntos.map((a) => (
                        <span key={a} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                          {ROTULO_ASSUNTO[a] ?? a}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-gray-500">Ainda não olhada. Ela é lida na próxima montagem da semana.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
