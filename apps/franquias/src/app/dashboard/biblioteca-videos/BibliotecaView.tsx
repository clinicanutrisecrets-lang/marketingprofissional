"use client";

import { BibliotecaVideos, type VideoBiblioteca } from "@scanner/ui";
import {
  adicionarVideoBiblioteca,
  adicionarAoAcervoDoTime,
  removerVideoBiblioteca,
  atualizarTagsVideo,
  buscarPexels,
} from "@/lib/videos/actions";
import { sugerirTagsParaVideo } from "@/lib/videos/sugerir-tags";
import { uploadArquivo } from "@/lib/arquivos/actions";

/**
 * Biblioteca de b-roll do TIME no Marketing (a página só abre pra
 * bibliotecaDoTime). A tela em si mora em `@scanner/ui` (compartilhada com o
 * Studio Aline); aqui só ligamos as server actions deste produto.
 *
 * O upload nasce marcado pro ACERVO compartilhado, que alimenta os posts da
 * semana de todas as clientes (Aline 13/10). Clipe em que aparece alguém do
 * time é desmarcado e fica só na conta de quem subiu.
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
      acervoPorPadrao
      acoes={{
        upload: uploadArquivo,
        adicionar: adicionarVideoBiblioteca,
        adicionarAoAcervo: adicionarAoAcervoDoTime,
        remover: removerVideoBiblioteca,
        atualizarTags: atualizarTagsVideo,
        buscarPexels,
        sugerirTags: sugerirTagsParaVideo,
      }}
    />
  );
}
