/**
 * Traduz falha da API do Claude em mensagem que a nutri entende.
 *
 * Por que existe: o erro cru da Anthropic vazava inteiro pra tela. A Juliana
 * viu isto no editor de post, em vermelho, dentro do app:
 *
 *   400 {"type":"error","error":{"type":"invalid_request_error","message":
 *   "Your credit balance is too low to access the Anthropic API…"},"request_id":…}
 *
 * Além de incompreensível, expõe detalhe interno e faz parecer defeito do
 * post que ela escreveu. A causa (crédito da API acabou) é administrativa e
 * quem resolve é a equipe — a mensagem tem que dizer isso com todas as letras.
 */

export type FalhaGeracao = {
  /** Mensagem pronta pra mostrar na tela. */
  mensagem: string;
  /** true quando é problema de conta/infra (equipe resolve), não da nutri. */
  equipe: boolean;
};

export function traduzirErroClaude(e: unknown): FalhaGeracao {
  const bruto = e instanceof Error ? e.message : String(e ?? "");
  const t = bruto.toLowerCase();

  if (/credit balance|billing|insufficient|quota|payment/.test(t)) {
    return {
      equipe: true,
      mensagem:
        "A geração de texto está temporariamente indisponível (crédito da conta da plataforma esgotado). " +
        "A equipe Scanner já foi avisada — nada de errado com o seu post. Tente de novo mais tarde.",
    };
  }

  if (/rate limit|429|overloaded|529/.test(t)) {
    return {
      equipe: false,
      mensagem:
        "O gerador está sobrecarregado neste momento. Espere um minutinho e tente de novo — seu texto não se perdeu.",
    };
  }

  if (/api key|unauthorized|401|authentication/.test(t)) {
    return {
      equipe: true,
      mensagem:
        "A geração de texto está fora do ar por um problema de configuração da plataforma. A equipe Scanner precisa resolver — não é nada do seu lado.",
    };
  }

  if (/timeout|etimedout|econnreset|fetch failed|network/.test(t)) {
    return {
      equipe: false,
      mensagem:
        "A conexão com o gerador caiu no meio do caminho. Tente de novo — costuma funcionar na segunda.",
    };
  }

  return {
    equipe: false,
    mensagem:
      "Não consegui gerar o texto agora. Tente de novo — se continuar, avise a equipe Scanner.",
  };
}
