/**
 * Templates HTML pra emails transacionais.
 * Visual minimalista e compatível com Gmail/Outlook (inline styles).
 */

const baseStyles = {
  body: "font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; background: #F5F7F5; margin: 0; padding: 20px 0;",
  container:
    "max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);",
  header: "background: #0BB8A8; color: white; padding: 24px 32px;",
  content: "padding: 32px;",
  footer:
    "padding: 20px 32px; font-size: 12px; color: #9CA3AF; text-align: center; border-top: 1px solid #F1F3F1;",
  button:
    "display: inline-block; background: #0BB8A8; color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;",
  h1: "font-size: 22px; margin: 0 0 12px; color: #182024;",
  p: "font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px;",
};

function wrap(conteudo: string, titulo = "Scanner da Saúde"): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo}</title>
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      <div style="font-size: 14px; opacity: 0.8; font-weight: 500;">SCANNER DA SAÚDE</div>
      <div style="font-size: 18px; font-weight: 700; margin-top: 2px;">Franquia Digital</div>
    </div>
    <div style="${baseStyles.content}">${conteudo}</div>
    <div style="${baseStyles.footer}">
      Scanner da Saúde · Plataforma Franquia Digital<br>
      <a href="https://app.scannerdasaude.com/privacidade" style="color: #9CA3AF;">Privacidade</a> ·
      <a href="https://app.scannerdasaude.com/termos" style="color: #9CA3AF;">Termos</a> ·
      <a href="https://app.scannerdasaude.com/deletar-dados" style="color: #9CA3AF;">Excluir dados</a>
    </div>
  </div>
</body>
</html>`;
}

export function emailBoasVindas(nome: string, linkOnboarding: string): { html: string; texto: string; assunto: string } {
  const conteudo = `
    <h1 style="${baseStyles.h1}">Bem-vinda ao Scanner da Saúde, ${nome}!</h1>
    <p style="${baseStyles.p}">
      Sua conta foi criada. Agora falta um passo: completar o onboarding para o sistema
      entender sua nutri e começar a gerar conteúdo pra você.
    </p>
    <p style="${baseStyles.p}">
      São cerca de 10 minutos pra preencher (pode salvar e voltar depois). Depois disso
      a IA começa a planejar sua primeira semana.
    </p>
    <p style="margin: 24px 0;">
      <a href="${linkOnboarding}" style="${baseStyles.button}">Completar onboarding →</a>
    </p>
    <p style="${baseStyles.p}">
      Qualquer coisa, responde esse email ou fala com nosso time em
      <a href="mailto:contato@scannerdasaude.com" style="color: #0BB8A8;">contato@scannerdasaude.com</a>.
    </p>
    <p style="${baseStyles.p}">
      <strong>Um abraço,</strong><br>
      Aline Quissak e time Scanner da Saúde
    </p>
  `;
  return {
    assunto: `Bem-vinda, ${nome}! Falta só o onboarding 👋`,
    html: wrap(conteudo),
    texto: `Bem-vinda ao Scanner da Saúde, ${nome}! Complete o onboarding: ${linkOnboarding}`,
  };
}

export function emailSemanaProntaAprovacao(nome: string, totalPosts: number, linkAprovar: string, deadline: string): {
  html: string;
  texto: string;
  assunto: string;
} {
  const conteudo = `
    <h1 style="${baseStyles.h1}">${totalPosts} posts prontos pra sua aprovação</h1>
    <p style="${baseStyles.p}">
      Oi, ${nome}! Sua semana foi gerada. Tá tudo alinhado com seu tom, seu público
      e com os temas em alta hoje no nicho de saúde integrativa.
    </p>
    <p style="${baseStyles.p}">
      Dá uma olhada, ajusta o que quiser e aprova. Se não aprovar até <strong>${deadline}</strong>,
      publicamos do jeito que está (melhor publicar bom do que perder a semana).
    </p>
    <p style="margin: 24px 0;">
      <a href="${linkAprovar}" style="${baseStyles.button}">Revisar e aprovar →</a>
    </p>
  `;
  return {
    assunto: `🎯 ${totalPosts} posts prontos pra aprovar`,
    html: wrap(conteudo),
    texto: `Sua semana foi gerada (${totalPosts} posts). Aprove antes de ${deadline}: ${linkAprovar}`,
  };
}

export function emailDeadlineAproximando(nome: string, horasRestantes: number, linkAprovar: string): {
  html: string;
  texto: string;
  assunto: string;
} {
  const conteudo = `
    <h1 style="${baseStyles.h1}">⏰ Faltam ${horasRestantes}h pra aprovar sua semana</h1>
    <p style="${baseStyles.p}">
      Oi, ${nome}. Seus posts ainda tão aguardando aprovação. Depois do prazo,
      publicamos automaticamente com o que tá lá — então se quiser ajustar alguma coisa,
      é agora.
    </p>
    <p style="margin: 24px 0;">
      <a href="${linkAprovar}" style="${baseStyles.button}">Revisar agora →</a>
    </p>
  `;
  return {
    assunto: `⏰ Faltam ${horasRestantes}h — sua semana aguarda aprovação`,
    html: wrap(conteudo),
    texto: `Faltam ${horasRestantes}h pra aprovar sua semana: ${linkAprovar}`,
  };
}

export function emailPostPublicado(nome: string, tipoPost: string, linkPost: string): {
  html: string;
  texto: string;
  assunto: string;
} {
  const conteudo = `
    <h1 style="${baseStyles.h1}">✨ Seu ${tipoPost} foi publicado</h1>
    <p style="${baseStyles.p}">
      ${nome}, seu post foi pro Instagram agora.
    </p>
    <p style="margin: 24px 0;">
      <a href="${linkPost}" style="${baseStyles.button}">Ver no Instagram →</a>
    </p>
    <p style="${baseStyles.p}" style="color: #9CA3AF; font-size: 13px;">
      As métricas começam a aparecer no dashboard em 24h.
    </p>
  `;
  return {
    assunto: `✨ Seu ${tipoPost} foi publicado`,
    html: wrap(conteudo),
    texto: `Seu ${tipoPost} foi publicado: ${linkPost}`,
  };
}

export function emailErroPublicacao(nome: string, erro: string, linkDashboard: string): {
  html: string;
  texto: string;
  assunto: string;
} {
  const conteudo = `
    <h1 style="${baseStyles.h1}">⚠️ Erro ao publicar seu post</h1>
    <p style="${baseStyles.p}">
      Oi, ${nome}. Um post ficou travado na hora de publicar no Instagram.
    </p>
    <p style="${baseStyles.p}">
      <strong>Detalhe do erro:</strong><br>
      <code style="background: #F9FAFB; padding: 8px 12px; border-radius: 6px; font-size: 13px; display: block; margin-top: 4px;">${erro}</code>
    </p>
    <p style="${baseStyles.p}">
      Normalmente é um dos seguintes:
    </p>
    <ul style="font-size: 14px; color: #374151; line-height: 1.7;">
      <li>Token Instagram expirou → reconecta em <a href="${linkDashboard}" style="color: #0BB8A8;">Integrações</a></li>
      <li>Imagem ou vídeo fora do padrão do Instagram</li>
      <li>Rate limit (publicamos automático em 30min)</li>
    </ul>
    <p style="margin: 24px 0;">
      <a href="${linkDashboard}" style="${baseStyles.button}">Abrir dashboard →</a>
    </p>
  `;
  return {
    assunto: "⚠️ Erro ao publicar — ação necessária",
    html: wrap(conteudo),
    texto: `Erro ao publicar: ${erro}. Veja em: ${linkDashboard}`,
  };
}

export function emailRevisaoAdsPronta(params: {
  nome: string;
  statusGeral: string;
  resumoExecutivo: string;
  qtdRecomendacoes: number;
  qtdAlertas: number;
  linkRevisao: string;
}): { html: string; texto: string; assunto: string } {
  const corStatus: Record<string, string> = {
    excelente: "#10B981",
    bom: "#0BB8A8",
    mediano: "#F59E0B",
    preocupante: "#F97316",
    critico: "#EF4444",
    sem_dados: "#9CA3AF",
  };
  const cor = corStatus[params.statusGeral] ?? "#0BB8A8";
  const conteudo = `
    <h1 style="${baseStyles.h1}">📊 Revisão semanal das suas campanhas</h1>
    <p style="${baseStyles.p}">
      Oi, ${params.nome}. Seu gestor de tráfego IA acabou de revisar suas campanhas dos últimos 7 dias.
    </p>
    <div style="background: ${cor}20; border-left: 4px solid ${cor}; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div style="font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Status geral</div>
      <div style="font-size: 22px; font-weight: 700; color: ${cor}; text-transform: capitalize; margin-top: 4px;">${params.statusGeral}</div>
    </div>
    <p style="${baseStyles.p}">${params.resumoExecutivo}</p>
    <p style="${baseStyles.p}">
      <strong>${params.qtdRecomendacoes}</strong> ${params.qtdRecomendacoes === 1 ? "recomendação" : "recomendações"}
      ${params.qtdAlertas > 0 ? ` · <strong style="color: #F97316;">${params.qtdAlertas}</strong> ${params.qtdAlertas === 1 ? "alerta" : "alertas"}` : ""}
    </p>
    <p style="margin: 24px 0;">
      <a href="${params.linkRevisao}" style="${baseStyles.button}">Ver revisão completa →</a>
    </p>
    <p style="font-size: 12px; color: #9CA3AF;">
      Próxima revisão automática na próxima segunda/quinta. Você também pode rodar manualmente no dashboard.
    </p>
  `;
  return {
    assunto: `📊 Revisão semanal Ads — ${params.statusGeral}`,
    html: wrap(conteudo),
    texto: `${params.resumoExecutivo}\n\nVer completa: ${params.linkRevisao}`,
  };
}
