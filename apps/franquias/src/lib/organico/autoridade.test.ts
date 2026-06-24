import { describe, it, expect } from "vitest";
import { scoreAutoridade, rankingAngulosPorAutoridade } from "./autoridade";

describe("scoreAutoridade", () => {
  it("retorna sem_dados quando não há alcance ou ações", () => {
    expect(scoreAutoridade({ alcance: 0, curtidas: 0, comentarios: 0, compartilhamentos: 0, salvamentos: 0, cliques_link: 0 }).classe).toBe("sem_dados");
    expect(scoreAutoridade({ alcance: 100, curtidas: 0, comentarios: 0, compartilhamentos: 0, salvamentos: 0, cliques_link: 0 }).classe).toBe("sem_dados");
  });

  it("classifica como autoridade quando salva/compartilha muito vs curtidas", () => {
    const s = scoreAutoridade({ alcance: 1000, curtidas: 50, comentarios: 10, compartilhamentos: 8, salvamentos: 12, cliques_link: 5 });
    expect(s.classe).toBe("autoridade"); // (12+8)/50 = 0.4 >= 0.15
    expect(s.pontos).toBeGreaterThan(0);
    expect(s.taxa).toBeGreaterThan(0);
  });

  it("classifica como vaidade quando só tem curtidas", () => {
    const s = scoreAutoridade({ alcance: 1000, curtidas: 200, comentarios: 0, compartilhamentos: 1, salvamentos: 1, cliques_link: 0 });
    expect(s.classe).toBe("vaidade"); // (1+1)/200 = 0.01 < 0.05
  });

  it("classifica como equilibrado na faixa do meio", () => {
    const s = scoreAutoridade({ alcance: 1000, curtidas: 100, comentarios: 5, compartilhamentos: 4, salvamentos: 4, cliques_link: 2 });
    expect(s.classe).toBe("equilibrado"); // (4+4)/100 = 0.08
  });
});

describe("rankingAngulosPorAutoridade", () => {
  it("ordena ângulos pela taxa de autoridade média (maior primeiro)", () => {
    const r = rankingAngulosPorAutoridade([
      { angulo_copy: "educativo_ciencia", alcance: 1000, curtidas: 10, comentarios: 5, compartilhamentos: 20, salvamentos: 30, cliques_link: 10 },
      { angulo_copy: "prova_social", alcance: 1000, curtidas: 200, comentarios: 1, compartilhamentos: 1, salvamentos: 1, cliques_link: 0 },
    ]);
    expect(r[0]!.angulo).toBe("educativo_ciencia");
    expect(r[0]!.taxaMedia).toBeGreaterThan(r[1]!.taxaMedia);
  });

  it("ignora posts sem dados e agrupa por ângulo", () => {
    const r = rankingAngulosPorAutoridade([
      { angulo_copy: "x", alcance: 0, curtidas: 0, comentarios: 0, compartilhamentos: 0, salvamentos: 0, cliques_link: 0 },
      { angulo_copy: "x", alcance: 500, curtidas: 10, comentarios: 2, compartilhamentos: 5, salvamentos: 5, cliques_link: 2 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.posts).toBe(1);
  });
});
