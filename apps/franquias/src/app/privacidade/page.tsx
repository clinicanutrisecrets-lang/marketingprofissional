export const metadata = {
  title: "Política de Privacidade — Scanner da Saúde",
  description: "Política de privacidade da plataforma Scanner da Saúde.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="mx-auto max-w-3xl prose prose-slate">
        <h1>Política de Privacidade</h1>
        <p>
          <strong>Última atualização:</strong> 15 de abril de 2026
        </p>

        <p>
          Esta política descreve como a <strong>Clínica Nutri Secrets LTDA</strong>,
          operadora da plataforma <strong>Scanner da Saúde Franquia Digital</strong>,
          coleta, usa e protege dados pessoais dos nutricionistas franqueados
          (&ldquo;Usuários&rdquo;).
        </p>

        <h2>1. Dados que coletamos</h2>
        <ul>
          <li>
            <strong>Dados cadastrais:</strong> nome, CPF, CRN, email, telefone,
            endereço, nome comercial, CNPJ (se aplicável).
          </li>
          <li>
            <strong>Dados profissionais:</strong> nicho de atuação, público-alvo,
            diferenciais, histórico profissional, modalidade de atendimento.
          </li>
          <li>
            <strong>Dados de integração:</strong> tokens OAuth do Instagram/Meta
            (criptografados em AES-256-GCM), ID de contas Business do Instagram,
            dados de campanhas de anúncios.
          </li>
          <li>
            <strong>Conteúdo:</strong> textos, imagens, vídeos e criativos
            gerados/submetidos pelo Usuário.
          </li>
          <li>
            <strong>Dados técnicos:</strong> IP, navegador, logs de acesso,
            cookies de sessão.
          </li>
        </ul>

        <h2>2. Como usamos os dados</h2>
        <ul>
          <li>Gerar conteúdo personalizado (posts, legendas, criativos).</li>
          <li>Publicar conteúdo no Instagram do Usuário via Graph API.</li>
          <li>Exibir métricas e relatórios de performance.</li>
          <li>Gerenciar campanhas de anúncios Meta Ads.</li>
          <li>Comunicação transacional (emails de aprovação, alertas, deadline).</li>
          <li>
            Cumprir obrigações legais e regulatórias (compliance CFN, LGPD).
          </li>
        </ul>

        <h2>3. Integração com Meta/Instagram</h2>
        <p>
          A plataforma utiliza a <strong>Instagram Graph API</strong> e a{" "}
          <strong>Meta Marketing API</strong>. Ao conectar sua conta, você
          autoriza o app a:
        </p>
        <ul>
          <li>Publicar posts, reels, carrosséis e stories no seu feed.</li>
          <li>Ler métricas de posts e conta (insights).</li>
          <li>Gerenciar campanhas de anúncios quando ativado.</li>
        </ul>
        <p>
          Tokens de acesso são criptografados no banco e nunca expostos no
          cliente. Você pode revogar o acesso a qualquer momento em{" "}
          <a
            href="https://accountscenter.instagram.com/apps_and_websites/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Configurações do Instagram → Apps e sites
          </a>
          .
        </p>

        <h2>4. Compartilhamento com terceiros</h2>
        <p>Compartilhamos dados apenas com processadores essenciais:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — hospedagem do banco e storage
            (criptografia em trânsito e em repouso).
          </li>
          <li>
            <strong>Vercel</strong> — hospedagem da aplicação.
          </li>
          <li>
            <strong>Anthropic (Claude)</strong> — geração de conteúdo por IA.
          </li>
          <li>
            <strong>Creatomate / Bannerbear / HeyGen</strong> — composição
            visual de criativos.
          </li>
          <li>
            <strong>Meta Platforms Ireland Ltd.</strong> — publicação e anúncios.
          </li>
          <li>
            <strong>Pexels</strong> — biblioteca de vídeos stock.
          </li>
          <li>
            <strong>Resend</strong> — envio de emails transacionais.
          </li>
        </ul>
        <p>
          Não vendemos dados pessoais. Não compartilhamos com anunciantes,
          agências de dados ou terceiros sem base legal ou consentimento expresso.
        </p>

        <h2>5. Retenção de dados</h2>
        <ul>
          <li>
            Dados cadastrais e profissionais: enquanto houver contrato ativo + 5
            anos (obrigação fiscal).
          </li>
          <li>
            Posts publicados: mantidos indefinidamente (histórico da franqueada).
          </li>
          <li>Logs técnicos: 90 dias.</li>
          <li>
            Tokens OAuth: invalidados imediatamente em caso de descadastro.
          </li>
        </ul>

        <h2>6. Direitos do titular (LGPD)</h2>
        <p>Você pode a qualquer momento:</p>
        <ul>
          <li>Solicitar acesso aos dados que temos sobre você.</li>
          <li>Solicitar correção de dados incorretos.</li>
          <li>
            Solicitar exclusão completa da sua conta e todos os dados em{" "}
            <a href="/deletar-dados">nossa página de exclusão</a>.
          </li>
          <li>Solicitar portabilidade dos dados.</li>
          <li>Revogar consentimentos.</li>
        </ul>
        <p>
          Envie solicitações para{" "}
          <a href="mailto:privacidade@scannerdasaude.com">
            privacidade@scannerdasaude.com
          </a>
          .
        </p>

        <h2>7. Segurança</h2>
        <ul>
          <li>Comunicação HTTPS obrigatória.</li>
          <li>Criptografia AES-256-GCM para tokens sensíveis.</li>
          <li>Row Level Security (RLS) no banco — cada franqueada só acessa seus próprios dados.</li>
          <li>Senhas hasheadas (bcrypt).</li>
          <li>Logs de acesso monitorados.</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          Usamos apenas cookies essenciais (autenticação, sessão). Não usamos
          cookies de rastreamento publicitário próprios.
        </p>

        <h2>9. Alterações</h2>
        <p>
          Podemos atualizar esta política. Alterações materiais serão
          notificadas por email e exibidas no topo da plataforma com pelo menos
          15 dias de antecedência.
        </p>

        <h2>10. Contato do Encarregado (DPO)</h2>
        <p>
          Clínica Nutri Secrets LTDA
          <br />
          Email: <a href="mailto:privacidade@scannerdasaude.com">privacidade@scannerdasaude.com</a>
          <br />
          Cidade: Curitiba/PR, Brasil
        </p>
      </article>
    </main>
  );
}
