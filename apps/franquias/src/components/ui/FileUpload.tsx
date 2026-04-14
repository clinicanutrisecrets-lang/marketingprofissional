"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadArquivo, removerArquivo, type TipoArquivo } from "@/lib/arquivos/actions";
import { cn } from "@/lib/utils";

type ArquivoExistente = {
  id: string;
  nome_arquivo: string;
  url_storage: string;
  tipo: string;
};

type FileUploadProps = {
  label: string;
  tipo: TipoArquivo;
  descricao?: string;
  aceitaVideo?: boolean;
  multiplos?: boolean;
  arquivosExistentes?: ArquivoExistente[];
  onUploadSucess?: (arquivo: { id: string; url: string }) => void;
  onRemover?: (id: string) => void;
};

export function FileUpload({
  label,
  tipo,
  descricao,
  aceitaVideo = false,
  multiplos = false,
  arquivosExistentes = [],
  onUploadSucess,
  onRemover,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      setErro(null);
      setProgresso(0);

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tipo", tipo);

        const resultado = await uploadArquivo(formData);
        if (!resultado.ok) {
          setErro(resultado.erro ?? "Erro no upload");
          setUploading(false);
          return;
        }
        setProgresso(Math.round(((i + 1) / acceptedFiles.length) * 100));
        if (resultado.url && resultado.id) {
          onUploadSucess?.({ id: resultado.id, url: resultado.url });
        }
      }

      setUploading(false);
    },
    [tipo, onUploadSucess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: aceitaVideo
      ? {
          "image/*": [".png", ".jpg", ".jpeg", ".webp"],
          "video/*": [".mp4", ".mov"],
        }
      : { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple: multiplos,
    disabled: uploading,
    maxSize: 50 * 1024 * 1024,
  });

  async function handleRemover(id: string) {
    const r = await removerArquivo(id);
    if (r.ok) onRemover?.(id);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-brand-text">
        {label}
      </label>
      {descricao && (
        <p className="mb-2 text-xs text-brand-text/60">{descricao}</p>
      )}

      {/* Lista de arquivos existentes */}
      {arquivosExistentes.length > 0 && (
        <div className="mb-3 space-y-2">
          {arquivosExistentes.map((arq) => (
            <div
              key={arq.id}
              className="flex items-center justify-between rounded-lg border border-brand-text/10 bg-white p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {arq.url_storage.match(/\.(png|jpg|jpeg|webp)/i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={arq.url_storage}
                    alt={arq.nome_arquivo}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-brand-primary/10 text-xs font-medium text-brand-primary">
                    {arq.nome_arquivo.split(".").pop()?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-brand-text">
                    {arq.nome_arquivo}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemover(arq.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone (só aparece se permite múltiplos ou não há arquivo ainda) */}
      {(multiplos || arquivosExistentes.length === 0) && (
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition",
            isDragActive
              ? "border-brand-primary bg-brand-primary/5"
              : "border-brand-text/15 hover:border-brand-primary/40",
            uploading && "opacity-60",
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <div className="text-sm font-medium text-brand-primary">
                Enviando... {progresso}%
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-text/10">
                <div
                  className="h-full bg-brand-primary transition-all"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-brand-text">
                {isDragActive
                  ? "Solte aqui..."
                  : multiplos
                    ? "Arraste arquivos ou clique para selecionar"
                    : "Arraste um arquivo ou clique para selecionar"}
              </div>
              <div className="mt-1 text-xs text-brand-text/50">
                {aceitaVideo ? "PNG, JPG, WEBP, MP4 · máx 50MB" : "PNG, JPG, WEBP · máx 50MB"}
              </div>
            </div>
          )}
        </div>
      )}

      {erro && (
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {erro}
        </div>
      )}
    </div>
  );
}
