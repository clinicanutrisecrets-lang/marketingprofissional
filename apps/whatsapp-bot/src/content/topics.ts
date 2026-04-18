export type Topic = {
  slug: string;
  pillar:
    | "nutrigenetica"
    | "nutrigenomica"
    | "microbiota"
    | "exames-sintomas"
    | "sinergia-bioativos";
  title: string;
  // Query do PubMed (inglês, termos MeSH + keywords).
  pubmedQuery: string;
  // Hook-detetive que entra no prompt de geração.
  angle: string;
};

export const TOPICS: Topic[] = [
  // === NUTRIGENÉTICA ===
  {
    slug: "mthfr-homocisteina",
    pillar: "nutrigenetica",
    title: "MTHFR C677T: quando o exame de homocisteína vira pista",
    pubmedQuery:
      "(MTHFR C677T) AND (homocysteine OR folate OR methylfolate) AND (clinical OR trial OR supplementation)",
    angle:
      "Paciente com homocisteína elevada + cansaço + enxaqueca: como o polimorfismo MTHFR muda a conduta e quais doses de metilfolato/B12 a evidência suporta.",
  },
  {
    slug: "apoe-gordura-saturada",
    pillar: "nutrigenetica",
    title: "APOE ε4: resposta individual à gordura saturada",
    pubmedQuery:
      "(APOE polymorphism) AND (saturated fat OR dietary fat) AND (LDL OR lipid OR cardiovascular)",
    angle:
      "LDL alto que não cede mesmo com dieta: o papel do genótipo APOE e como ajustar proporção de gordura saturada vs. monoinsaturada.",
  },
  {
    slug: "fto-saciedade",
    pillar: "nutrigenetica",
    title: "FTO e saciedade: por que alguns pacientes sentem mais fome",
    pubmedQuery:
      "(FTO gene) AND (appetite OR satiety OR obesity OR weight loss) AND (intervention OR trial)",
    angle:
      "Paciente que come bem mas nunca sacia: polimorfismo FTO, grelina e estratégia de proteína/fibra por refeição.",
  },

  // === NUTRIGENÔMICA ===
  {
    slug: "sulforafano-nrf2",
    pillar: "nutrigenomica",
    title: "Sulforafano e via Nrf2: brócolis como modulador epigenético",
    pubmedQuery:
      "(sulforaphane) AND (Nrf2 OR NFE2L2) AND (human OR clinical) AND (inflammation OR detoxification)",
    angle:
      "Paciente com inflamação de baixo grau e GGT levemente alterada: dose de sulforafano via broto de brócolis vs. suplementação e sinergia com curcumina.",
  },
  {
    slug: "omega3-inflamacao",
    pillar: "nutrigenomica",
    title: "EPA/DHA: modulação gênica de citocinas inflamatórias",
    pubmedQuery:
      "(omega-3 OR EPA OR DHA) AND (gene expression OR NF-kB) AND (inflammation) AND (human trial)",
    angle:
      "PCR-us levemente elevada sem causa clara: doses de EPA+DHA que modulam NF-κB na evidência e sinergia com polifenóis.",
  },
  {
    slug: "resveratrol-sirt1",
    pillar: "nutrigenomica",
    title: "Resveratrol e SIRT1: além da moda antienvelhecimento",
    pubmedQuery:
      "(resveratrol) AND (SIRT1 OR sirtuin) AND (human OR clinical trial) AND (metabolic OR insulin)",
    angle:
      "Resistência à insulina incipiente: evidência real de resveratrol em SIRT1/sensibilidade insulínica e dose efetiva.",
  },

  // === MICROBIOTA INTESTINAL ===
  {
    slug: "akkermansia-metabolica",
    pillar: "microbiota",
    title: "Akkermansia muciniphila: a bactéria da barreira intestinal",
    pubmedQuery:
      "(Akkermansia muciniphila) AND (metabolic syndrome OR insulin sensitivity OR gut barrier) AND (human OR clinical)",
    angle:
      "Paciente com resistência à insulina + intestino 'preguiçoso': como cranberry, uvas e polifenóis elevam Akkermansia — doses alimentares realistas.",
  },
  {
    slug: "fibras-scfa",
    pillar: "microbiota",
    title: "AGCC (butirato, propionato, acetato): o elo fibra-intestino-cérebro",
    pubmedQuery:
      "(short-chain fatty acids OR butyrate) AND (dietary fiber) AND (human OR clinical) AND (inflammation OR mood OR glucose)",
    angle:
      "Humor oscilante + constipação + TOTG borderline: combinação de fibras fermentáveis (psyllium, aveia, banana-verde) com gramagens por refeição.",
  },
  {
    slug: "disbiose-histamina",
    pillar: "microbiota",
    title: "Disbiose e histamina: quando sintomas 'alérgicos' vêm do intestino",
    pubmedQuery:
      "(histamine intolerance) AND (gut microbiota OR DAO OR diamine oxidase) AND (diet OR nutritional)",
    angle:
      "Urticária, dor de cabeça pós-refeição e reflux: triagem de histamina, alimentos gatilho e suporte com B6/cobre/vitamina C em doses de evidência.",
  },

  // === EXAMES DE SANGUE × SINTOMAS ===
  {
    slug: "ferritina-fadiga",
    pillar: "exames-sintomas",
    title: "Ferritina, TIBC e fadiga: o detetive além da hemoglobina",
    pubmedQuery:
      "(ferritin) AND (fatigue OR iron deficiency without anemia) AND (supplementation OR intervention)",
    angle:
      "Hemoglobina normal mas ferritina <30: protocolo de ferro bisglicinato + vitamina C + horário e dose de evidência.",
  },
  {
    slug: "tsh-t3-reverso",
    pillar: "exames-sintomas",
    title: "TSH no limite + T3 reverso alto: o cenário que muda tudo",
    pubmedQuery:
      "(reverse T3 OR rT3) AND (selenium OR zinc OR iodine) AND (thyroid function)",
    angle:
      "Paciente com TSH 3.8, cansaço e ganho de peso: valor real do T3 reverso, doses de selênio (castanha-do-Pará) e zinco pra conversão T4→T3.",
  },
  {
    slug: "vitaminad-25oh",
    pillar: "exames-sintomas",
    title: "25(OH)D entre 30 e 40: o alvo real pra nutri clínica",
    pubmedQuery:
      "(25-hydroxyvitamin D) AND (optimal level OR dose response) AND (supplementation OR clinical trial)",
    angle:
      "Paciente com 25(OH)D = 32 e sintomas difusos: qual alvo defender, dose de ataque vs. manutenção, sinergia com K2-MK7 e magnésio.",
  },

  // === SINERGIA DE BIOATIVOS ===
  {
    slug: "curcuma-pimenta",
    pillar: "sinergia-bioativos",
    title: "Curcumina + piperina + gordura: a sinergia que muda biodisponibilidade",
    pubmedQuery:
      "(curcumin) AND (piperine OR bioavailability) AND (inflammation) AND (human OR clinical trial)",
    angle:
      "Dor articular crônica com exames limpos: dose de curcumina que funciona, por que sem piperina + gordura o efeito cai, e receita prática.",
  },
  {
    slug: "magnesio-b6-gaba",
    pillar: "sinergia-bioativos",
    title: "Magnésio + B6 + glicina: protocolo de sono e ansiedade de base científica",
    pubmedQuery:
      "(magnesium glycinate OR magnesium taurate) AND (sleep OR anxiety OR GABA) AND (human trial)",
    angle:
      "Insônia de manutenção + bruxismo + ansiedade: formas de magnésio com evidência (glicinato, treonato), doses e janela de administração.",
  },
  {
    slug: "vitc-flavonoides",
    pillar: "sinergia-bioativos",
    title: "Vitamina C + flavonoides cítricos: além do 'tomar laranja'",
    pubmedQuery:
      "(ascorbic acid) AND (flavonoids OR hesperidin OR rutin) AND (bioavailability OR oxidative stress)",
    angle:
      "Sinergia vitamina C + hesperidina + rutina em estresse oxidativo: combos alimentares gostosos (laranja-bahia + acerola, goiaba + caqui) e gramagens.",
  },
];

/** Retorna o próximo tópico ainda não enviado, ou o mais antigo se todos já foram. */
export function pickNextTopic(history: string[]): Topic {
  const used = new Set(history);
  const unused = TOPICS.filter((t) => !used.has(t.slug));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)]!;
  }
  // Ciclou todos — pega o mais antigo (primeiro do histórico)
  const oldestSlug = history[0];
  return TOPICS.find((t) => t.slug === oldestSlug) ?? TOPICS[0]!;
}
