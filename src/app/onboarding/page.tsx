export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-brand-muted p-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-brand-text">
          Onboarding da Franqueada
        </h1>
        <p className="mb-6 text-brand-text/70">
          Wizard de 10 etapas — em construção. Próxima entrega: formulário
          completo com salvamento automático e conexão OAuth do Instagram.
        </p>
        <ul className="space-y-2 text-sm text-brand-text/60">
          <li>1. Sobre você (identidade)</li>
          <li>2. Sua especialidade</li>
          <li>3. Atendimento e valores</li>
          <li>4. Sua história</li>
          <li>5. Identidade visual</li>
          <li>6. Redes sociais + OAuth Instagram</li>
          <li>7. Voz e comunicação</li>
          <li>8. Depoimentos e prova social</li>
          <li>9. Configurações de automação + CTA da Sofia</li>
          <li>10. Revisão e finalização</li>
        </ul>
      </div>
    </main>
  );
}
