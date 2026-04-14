type Arquivo = {
  id: string;
  tipo: string;
  nome_arquivo: string;
  url_storage: string;
  formato: string | null;
  criado_em: string | null;
};

export function ArquivosSection({ arquivos }: { arquivos: Arquivo[] }) {
  const agrupados = arquivos.reduce<Record<string, Arquivo[]>>((acc, a) => {
    if (!acc[a.tipo]) acc[a.tipo] = [];
    acc[a.tipo].push(a);
    return acc;
  }, {});

  const labels: Record<string, string> = {
    logo_principal: "Logos",
    foto_profissional: "Fotos profissionais",
    foto_clinica: "Fotos da clínica",
    depoimento_print: "Prints de depoimento",
    depoimento_video: "Vídeos de depoimento",
    certificado: "Certificados",
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">
        Arquivos ({arquivos.length})
      </h3>
      {arquivos.length === 0 ? (
        <p className="text-xs text-brand-text/60">
          Nenhum arquivo enviado ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(agrupados).map(([tipo, lista]) => (
            <div key={tipo}>
              <div className="mb-1 text-xs font-medium text-brand-text/70">
                {labels[tipo] ?? tipo} ({lista.length})
              </div>
              <ul className="space-y-1">
                {lista.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <a
                      href={a.url_storage}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-brand-secondary hover:underline"
                    >
                      {a.nome_arquivo}
                    </a>
                    <span className="text-brand-text/40">{a.formato}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
