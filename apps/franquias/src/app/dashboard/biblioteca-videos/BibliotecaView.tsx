"use client";

import { BibliotecaVideos, type VideoBiblioteca } from "@scanner/ui";
import {
  adicionarVideoBiblioteca,
  removerVideoBiblioteca,
  atualizarTagsVideo,
  buscarPexels,
} from "@/lib/videos/actions";
import { sugerirTagsParaVideo } from "@/lib/videos/sugerir-tags";
import { uploadArquivo } from "@/lib/arquivos/actions";

/**
 * Biblioteca de b-roll da franqueada. A tela em si mora em `@scanner/ui`
 * (compartilhada com o Studio Aline); aqui só ligamos as server actions
 * deste produto.
 */
export function BibliotecaView({
  videos,
  acervo,
}: {
  videos: VideoBiblioteca[];
  acervo: VideoBiblioteca[];
}) {
  return (
    <BibliotecaVideos
      videos={videos}
      acervo={acervo}
      corPrimaria="#0BB8A8"
      acoes={{
        upload: uploadArquivo,
        adicionar: adicionarVideoBiblioteca,
        remover: removerVideoBiblioteca,
        atualizarTags: atualizarTagsVideo,
        buscarPexels,
        sugerirTags: sugerirTagsParaVideo,
      }}
    />
  );
}
