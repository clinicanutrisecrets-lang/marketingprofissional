"use client";

import { BibliotecaVideos, type VideoBiblioteca } from "@scanner/ui";
import {
  adicionarVideoBiblioteca,
  adicionarAoAcervo,
  removerVideoBiblioteca,
  atualizarTagsVideoPerfil,
  buscarPexelsAline,
  uploadVideoPerfil,
} from "@/lib/videos/actions";

/**
 * Biblioteca de b-roll de um perfil do Studio. A tela mora em `@scanner/ui`
 * (mesma do Scanner Franquias); aqui só ligamos as server actions do Studio.
 */
export function BibliotecaPerfilView({
  perfilId,
  videos,
  acervo,
  corPrimaria,
}: {
  perfilId: string;
  videos: VideoBiblioteca[];
  acervo: VideoBiblioteca[];
  corPrimaria: string;
}) {
  return (
    <BibliotecaVideos
      videos={videos}
      acervo={acervo}
      corPrimaria={corPrimaria}
      acoes={{
        upload: uploadVideoPerfil,
        adicionar: (v) => adicionarVideoBiblioteca({ perfilId, ...v }),
        adicionarAoAcervo,
        remover: removerVideoBiblioteca,
        atualizarTags: atualizarTagsVideoPerfil,
        buscarPexels: buscarPexelsAline,
      }}
    />
  );
}
