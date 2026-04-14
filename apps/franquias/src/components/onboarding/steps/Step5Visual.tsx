"use client";

import { useEffect, useState } from "react";
import { CardPicker, Field, FormWrapper } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
import { ESTILOS_VISUAIS } from "@/lib/onboarding/steps";
import { listarArquivos } from "@/lib/arquivos/actions";
import type { StepFormProps } from "../Wizard";

type Arquivo = Awaited<ReturnType<typeof listarArquivos>>[number];

export function Step5Visual({ dados, atualizar }: StepFormProps) {
  const [logos, setLogos] = useState<Arquivo[]>([]);
  const [fotos, setFotos] = useState<Arquivo[]>([]);
  const [fotosClinica, setFotosClinica] = useState<Arquivo[]>([]);

  async function recarregar() {
    const todos = await listarArquivos();
    setLogos(todos.filter((a) => a.tipo === "logo_principal"));
    setFotos(todos.filter((a) => a.tipo === "foto_profissional"));
    setFotosClinica(todos.filter((a) => a.tipo === "foto_clinica"));
  }

  useEffect(() => {
    recarregar();
  }, []);

  return (
    <FormWrapper
      title="Identidade visual"
      descricao="Cores, estilo e arquivos de marca."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Cor primária"
          name="cor_primaria_hex"
          type="color"
          value={dados.cor_primaria_hex as string}
          onChange={(v) => atualizar({ cor_primaria_hex: v })}
          required
        />
        <Field
          label="Cor secundária"
          name="cor_secundaria_hex"
          type="color"
          value={dados.cor_secundaria_hex as string}
          onChange={(v) => atualizar({ cor_secundaria_hex: v })}
        />
        <Field
          label="Cor de acento"
          name="cor_terciaria_hex"
          type="color"
          value={dados.cor_terciaria_hex as string}
          onChange={(v) => atualizar({ cor_terciaria_hex: v })}
        />
      </div>

      <CardPicker
        label="Estilo visual"
        value={dados.estilo_visual as string}
        onChange={(v) => atualizar({ estilo_visual: v })}
        options={ESTILOS_VISUAIS}
        required
      />

      <FileUpload
        label="Logo principal"
        tipo="logo_principal"
        descricao="PNG com fundo transparente (preferível). Se não tiver, nossa equipe cria uma."
        arquivosExistentes={logos}
        onUploadSucess={recarregar}
        onRemover={recarregar}
      />

      <FileUpload
        label="Foto profissional"
        tipo="foto_profissional"
        descricao="Rosto, olhando pra câmera, luz natural. Essencial pra LP e posts."
        arquivosExistentes={fotos}
        onUploadSucess={recarregar}
        onRemover={recarregar}
      />

      <FileUpload
        label="Fotos da clínica / ambiente"
        tipo="foto_clinica"
        descricao="3 a 5 fotos (opcional, mas ajuda muito nos posts)"
        multiplos
        arquivosExistentes={fotosClinica}
        onUploadSucess={recarregar}
        onRemover={recarregar}
      />
    </FormWrapper>
  );
}
