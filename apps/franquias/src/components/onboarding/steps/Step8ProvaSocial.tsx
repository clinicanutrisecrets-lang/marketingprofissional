"use client";

import { useEffect, useState } from "react";
import { CardPicker, FormWrapper } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
import { listarArquivos } from "@/lib/arquivos/actions";
import type { StepFormProps } from "../Wizard";

type Arquivo = Awaited<ReturnType<typeof listarArquivos>>[number];

export function Step8ProvaSocial({ dados, atualizar }: StepFormProps) {
  const tem = dados.tem_depoimentos as boolean;
  const [prints, setPrints] = useState<Arquivo[]>([]);
  const [videos, setVideos] = useState<Arquivo[]>([]);

  async function recarregar() {
    const todos = await listarArquivos();
    setPrints(todos.filter((a) => a.tipo === "depoimento_print"));
    setVideos(todos.filter((a) => a.tipo === "depoimento_video"));
  }

  useEffect(() => {
    recarregar();
  }, []);

  return (
    <FormWrapper
      title="Depoimentos e prova social"
      descricao="Depoimentos reais elevam muito o engajamento dos posts."
    >
      <CardPicker
        label="Você tem depoimentos de pacientes?"
        value={tem === true ? "sim" : tem === false ? "nao" : ""}
        onChange={(v) => atualizar({ tem_depoimentos: v === "sim" })}
        options={[
          { value: "sim", label: "Sim, tenho" },
          { value: "nao", label: "Ainda não" },
        ]}
      />

      {tem && (
        <>
          <CardPicker
            label="Em que formato você tem?"
            value={dados.depoimentos_formato as string}
            onChange={(v) => atualizar({ depoimentos_formato: v })}
            options={[
              { value: "prints_whatsapp", label: "Prints de WhatsApp" },
              { value: "videos", label: "Vídeos" },
              { value: "texto_escrito", label: "Texto escrito" },
              { value: "misto", label: "Vários formatos" },
            ]}
          />

          <FileUpload
            label="Prints de conversas / depoimentos em texto"
            tipo="depoimento_print"
            descricao="Pode subir múltiplos — a IA analisa e usa como prova social nos posts"
            multiplos
            arquivosExistentes={prints}
            onUploadSucess={recarregar}
            onRemover={recarregar}
          />

          <FileUpload
            label="Vídeos de depoimento"
            tipo="depoimento_video"
            descricao="MP4, até 50MB cada. Ótimo pra reels e stories."
            aceitaVideo
            multiplos
            arquivosExistentes={videos}
            onUploadSucess={recarregar}
            onRemover={recarregar}
          />
        </>
      )}
    </FormWrapper>
  );
}
