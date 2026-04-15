export const metadata = {
  title: "Termos de Uso — Scanner da Saúde",
  description: "Termos de uso da plataforma Scanner da Saúde.",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="mx-auto max-w-3xl prose prose-slate">
        <h1>Termos de Uso</h1>
        <p>
          <strong>Última atualização:</strong> 15 de abril de 2026
        </p>

        <p>
          Ao utilizar a plataforma <strong>Scanner da Saúde Franquia Digital</strong>{" "}
          (&ldquo;Plataforma&rdquo;), operada pela{" "}
          <strong>Clínica Nutri Secrets LTDA</strong>, o Usuário concorda com estes
          Termos.
        </p>

        <h2>1. Objeto</h2>
        <p>
          A Plataforma fornece serviços de marketing digital automatizado para
          nutricionistas franqueados, incluindo: geração de conteúdo por
          inteligência artificial, publicação automática no Instagram, gestão de
          campanhas Meta Ads, relatórios de performance e landing pages
          personalizadas.
        </p>

        <h2>2. Cadastro e Elegibilidade</h2>
        <ul>
          <li>
            O Usuário deve ser nutricionista regularmente inscrito no CRN e
            autorizado pela franqueadora.
          </li>
          <li>
            Informações cadastrais devem ser verdadeiras e atualizadas.
          </li>
          <li>
            O Usuário é responsável pela confidencialidade de suas credenciais
            de acesso.
          </li>
        </ul>

        <h2>3. Uso Permitido</h2>
        <p>O Usuário concorda em NÃO:</p>
        <ul>
          <li>
            Publicar conteúdo que viole o Código de Ética do Nutricionista
            (Resolução CFN 599/2018) ou a Resolução CFN 666/2020 sobre
            publicidade.
          </li>
          <li>
            Fazer promessas de resultados não comprovados, cura de doenças ou
            uso abusivo de &ldquo;antes e depois&rdquo;.
          </li>
          <li>Publicar conteúdo discriminatório, difamatório ou ilegal.</li>
          <li>
            Utilizar a plataforma para fins não relacionados à atividade
            profissional de nutrição.
          </li>
          <li>
            Compartilhar credenciais com terceiros ou revender serviços da
            Plataforma.
          </li>
        </ul>

        <h2>4. Conteúdo Gerado por IA</h2>
        <p>
          A Plataforma usa inteligência artificial (Claude, da Anthropic) para
          gerar textos, legendas e sugestões. <strong>O Usuário é o
          responsável final</strong> pelo conteúdo publicado em seu nome:
        </p>
        <ul>
          <li>
            É sua responsabilidade revisar antes de aprovar a publicação.
          </li>
          <li>
            A Plataforma implementa filtros de compliance CFN, mas não garante
            100% de conformidade.
          </li>
          <li>
            Desaconselhamos publicação automática sem revisão humana em temas
            sensíveis (doenças, medicamentos, casos clínicos).
          </li>
        </ul>

        <h2>5. Integrações Terceiras</h2>
        <p>
          O funcionamento depende de APIs de terceiros (Meta, Anthropic,
          Creatomate, etc). Não somos responsáveis por indisponibilidade,
          mudanças ou rejeições por parte dessas plataformas. Se a Meta bloquear
          o app, por exemplo, todas as publicações automáticas ficam
          interrompidas até normalização.
        </p>

        <h2>6. Propriedade Intelectual</h2>
        <ul>
          <li>
            A Plataforma (código, design, marca) pertence à Clínica Nutri
            Secrets LTDA.
          </li>
          <li>
            Conteúdo gerado (posts, legendas, imagens) pertence ao Usuário após
            publicação, ressalvados direitos de imagem de vídeos stock (Pexels,
            licença CC0) e do avatar digital (HeyGen).
          </li>
          <li>
            Ao submeter fotos próprias, o Usuário garante que detém os direitos
            de imagem.
          </li>
        </ul>

        <h2>7. Planos e Pagamento</h2>
        <p>
          Valores, ciclo de cobrança e regras de upgrade/downgrade são
          definidos no contrato de franquia firmado em separado. A Plataforma
          pode ser suspensa em caso de inadimplência superior a 15 dias.
        </p>

        <h2>8. Cancelamento</h2>
        <ul>
          <li>
            O Usuário pode cancelar a qualquer momento comunicando à
            franqueadora.
          </li>
          <li>
            Após cancelamento, o acesso é bloqueado em até 24h.
          </li>
          <li>
            Dados podem ser exportados em até 30 dias após cancelamento.
          </li>
          <li>
            Exclusão total de dados via{" "}
            <a href="/deletar-dados">página de exclusão</a>.
          </li>
        </ul>

        <h2>9. Limitação de Responsabilidade</h2>
        <p>
          A Plataforma é fornecida &ldquo;como está&rdquo;. Não garantimos
          resultados específicos de marketing (número de seguidores, leads,
          vendas). Não respondemos por danos indiretos, lucros cessantes ou
          falhas de plataformas terceiras.
        </p>

        <h2>10. Alterações nos Termos</h2>
        <p>
          Estes termos podem ser atualizados. Alterações materiais serão
          notificadas por email com 30 dias de antecedência.
        </p>

        <h2>11. Foro</h2>
        <p>
          Fica eleito o foro da Comarca de Curitiba/PR para dirimir quaisquer
          controvérsias, com renúncia a qualquer outro.
        </p>

        <h2>12. Contato</h2>
        <p>
          Clínica Nutri Secrets LTDA
          <br />
          Email:{" "}
          <a href="mailto:contato@scannerdasaude.com">
            contato@scannerdasaude.com
          </a>
        </p>
      </article>
    </main>
  );
}
