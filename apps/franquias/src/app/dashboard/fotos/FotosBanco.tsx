"use client";

import { useEffect, useState } from "react";
import { FileUpload } from "@/components/ui/FileUpload";
import { listarArquivos, nomearFoto, salvarReceitaFoto } from "@/lib/arquivos/actions";

// Declarado à mão: o tipo gerado do banco está velho e devolve `never`.
type Arquivo = {
  id: string;
  tipo: string;
  nome_arquivo: string;
  url_storage: string;
  descricao_auto?: string | null;
  assuntos?: string[] | null;
  descricao?: string | null;
  eh_receita?: boolean | null;
  receita_ingredientes?: string | null;
  receita_modo_preparo?: string | null;
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
  const [fotosComida, setFotosComida] = useState<Arquivo[]>([]);
  const [fotosClinica, setFotosClinica] = useState<Arquivo[]>([]);
  const [fotoPerfil, setFotoPerfil] = useState<Arquivo[]>([]);

  async function recarregar() {
    const todos = (await listarArquivos()) as unknown as Arquivo[];
    setFotosPost(todos.filter((a) => a.tipo === "foto_post"));
    setFotosComida(todos.filter((a) => a.tipo === "foto_comida"));
    setFotosClinica(todos.filter((a) => a.tipo === "foto_clinica" || a.tipo === "foto_atendimento"));
    setFotoPerfil(todos.filter((a) => a.tipo === "foto_profissional"));
  }

  useEffect(() => {
    recarregar();
  }, []);

  return (
    <div className="space-y-6 rounded-2xl bg-white p-5 shadow-sm">
      <FileUpload
        label="Fotos suas"
        tipo="foto_post"
        descricao="Você atendendo, no consultório, se exercitando, no seu dia a dia. Suba de preferência mais de uma: as artes vão alternando entre elas, inclusive os posts para fixar no perfil. Foto em pé ou quadrada, com boa luz."
        multiplos
        arquivosExistentes={fotosPost}
        onUploadSucess={recarregar}
        onRemover={recarregar}
      />
      <FileUpload
        label="Fotos de comida e das suas receitas"
        tipo="foto_comida"
        descricao="Pratos de que você gosta, sucos e receitas que você fez. Depois de subir, escreva embaixo o que é cada uma (ex.: suco de acerola): é por esse nome que a foto vai pro post certo. Se for uma receita sua, conte a receita: ela pode virar o carrossel de sinergia da semana."
        multiplos
        arquivosExistentes={fotosComida}
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
      <FotosDescritas fotos={[...fotosComida, ...fotosPost, ...fotosClinica, ...fotoPerfil]} />
    </div>
  );
}

/**
 * O que está em cada foto (Aline, 14/10/2026). O nome que ela escreve vale
 * mais que a leitura automática; é por ele e pelos assuntos que a semana
 * escolhe a foto de cada slide. Foto de comida não é lida sozinha: o nome
 * dela é o que conta.
 */
function FotosDescritas({ fotos }: { fotos: Arquivo[] }) {
  if (fotos.length === 0) return null;
  return (
    <div className="border-t border-gray-100 pt-5">
      <h3 className="text-sm font-semibold text-gray-800">O que tem em cada foto</h3>
      <p className="mt-1 text-xs text-gray-500">
        Escreva o que é cada foto, principalmente as de comida. Quando um post fala de acerola, a foto que você chamou
        de &quot;suco de acerola&quot; vai pra ele. O que você escreve vale mais que o que o Scanner reconheceu.
      </p>
      <ul className="mt-3 space-y-3">
        {fotos.map((f) => (
          <LinhaFoto key={f.id} f={f} />
        ))}
      </ul>
    </div>
  );
}

function LinhaFoto({ f }: { f: Arquivo }) {
  const [nome, setNome] = useState(f.descricao ?? "");
  const [salvo, setSalvo] = useState(f.descricao ?? "");
  const [estado, setEstado] = useState<"" | "salvando" | "ok" | "erro">("");
  const [erro, setErro] = useState("");
  const comida = f.tipo === "foto_comida";
  const mudou = nome.trim() !== salvo.trim();

  async function salvar() {
    setEstado("salvando");
    const r = await nomearFoto(f.id, nome);
    if (r.ok) {
      setSalvo(nome.trim());
      setEstado("ok");
      setTimeout(() => setEstado(""), 2000);
    } else {
      setErro(r.erro ?? "Não consegui salvar.");
      setEstado("erro");
    }
  }

  return (
    <li className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.url_storage} alt="" className="h-14 w-14 flex-none rounded-lg object-cover" />
      <div className="min-w-0 flex-1 text-xs">
        <label htmlFor={`nome-${f.id}`} className="font-medium text-gray-700">
          {comida ? "O que é?" : "O que é? (opcional)"}
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={`nome-${f.id}`}
            value={nome}
            maxLength={80}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mudou) salvar();
            }}
            placeholder={comida ? "ex.: suco de acerola" : "ex.: atendendo no consultório"}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={salvar}
            disabled={!mudou || estado === "salvando"}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {estado === "salvando" ? "Salvando…" : "Salvar"}
          </button>
        </div>
        {estado === "ok" && <p className="mt-1 text-emerald-700">Salvo.</p>}
        {estado === "erro" && <p className="mt-1 text-red-600">{erro}</p>}
        {!salvo && !comida && f.descricao_auto && (
          <p className="mt-1 text-gray-500">O Scanner reconheceu: {f.descricao_auto}</p>
        )}
        {!salvo && comida && <p className="mt-1 text-amber-700">Sem nome, esta foto entra em qualquer post de comida.</p>}
        {comida && <ReceitaDaFoto f={f} titulo={salvo} />}
        {f.assuntos?.length && !comida ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {f.assuntos.map((a) => (
              <span key={a} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                {ROTULO_ASSUNTO[a] ?? a}
              </span>
            ))}
          </div>
        ) : null}
        {!comida && !f.descricao_auto && !salvo && (
          <p className="mt-1 text-gray-500">Ainda não olhada. Ela é lida na próxima montagem da semana.</p>
        )}
      </div>
    </li>
  );
}

/**
 * "Esta é uma receita sua?" (Aline, 16/10/2026). Sim: ela escreve a receita e
 * a foto pode virar o carrossel de sinergia da semana (no lugar das receitas
 * do nosso banco). Não: a foto fica só de ilustração nos posts de alimentação.
 */
function ReceitaDaFoto({ f, titulo }: { f: Arquivo; titulo: string }) {
  const [resposta, setResposta] = useState<boolean | null>(f.eh_receita ?? null);
  const [ingredientes, setIngredientes] = useState(f.receita_ingredientes ?? "");
  const [modo, setModo] = useState(f.receita_modo_preparo ?? "");
  const [estado, setEstado] = useState<"" | "salvando" | "ok" | "erro">("");
  const [erro, setErro] = useState("");
  const [salvaComoReceita, setSalvaComoReceita] = useState(f.eh_receita === true);

  async function salvar(ehReceita: boolean) {
    setEstado("salvando");
    const r = await salvarReceitaFoto(f.id, { eh_receita: ehReceita, ingredientes, modo_preparo: modo });
    if (r.ok) {
      setSalvaComoReceita(ehReceita);
      setEstado("ok");
      setTimeout(() => setEstado(""), 2500);
    } else {
      setErro(r.erro ?? "Não consegui salvar.");
      setEstado("erro");
    }
  }

  const botao = (ativo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${ativo ? "bg-brand-primary text-white" : "border border-gray-200 bg-white text-gray-700"}`;

  return (
    <div className="mt-2 rounded-lg bg-gray-50 p-2">
      <p className="font-medium text-gray-700">Esta é uma receita sua?</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setResposta(true);
            setEstado("");
          }}
          className={botao(resposta === true)}
        >
          Sim, vou escrever a receita
        </button>
        <button
          type="button"
          onClick={() => {
            setResposta(false);
            salvar(false);
          }}
          className={botao(resposta === false)}
        >
          Não, é só uma foto ilustrativa
        </button>
      </div>
      {resposta === false && (
        <p className="mt-1 text-gray-500">Ela entra como ilustração nos posts que falam de alimentação.</p>
      )}
      {resposta === true && (
        <div className="mt-2 space-y-2">
          {!titulo && <p className="text-amber-700">Escreva antes o nome da receita no campo &quot;O que é?&quot; acima.</p>}
          <label className="block">
            <span className="font-medium text-gray-700">Ingredientes (um por linha)</span>
            <textarea
              value={ingredientes}
              onChange={(e) => setIngredientes(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={"1 xícara de lentilha cozida\n1 colher de sopa de azeite\nsuco de meio limão"}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="font-medium text-gray-700">Modo de preparo</span>
            <textarea
              value={modo}
              onChange={(e) => setModo(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="Misture tudo numa tigela e tempere com o limão e o azeite."
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => salvar(true)}
            disabled={estado === "salvando"}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {estado === "salvando" ? "Salvando…" : "Salvar receita"}
          </button>
          {salvaComoReceita && estado !== "erro" && (
            <p className="text-emerald-700">
              Receita guardada. Ela pode virar o carrossel de sinergia de uma das próximas semanas, com esta foto.
            </p>
          )}
        </div>
      )}
      {estado === "ok" && !salvaComoReceita && <p className="mt-1 text-emerald-700">Salvo.</p>}
      {estado === "erro" && <p className="mt-1 text-red-600">{erro}</p>}
    </div>
  );
}
