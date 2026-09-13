# -*- coding: utf-8 -*-
"""Carrosséis 2 da rodada de setembro, todos @nutri_secrets, público paciente.

🔴 Todo número aqui foi conferido antes de escrever: TACO e IF-Rating vieram da
base do Scanner (`alimentos_taco`), e as referências do PubMed estão nomeadas no
slide de fonte. Nada de "estudos mostram" sem quem e sem quando.
"""
from slides import MAG
M = lambda t: f'<b style="color:{MAG}">{t}</b>'

ACEROLA = {"slug": "acerola-1609", "perfil": "@nutri_secrets", "slides": [
 {"soco": "A fruta<br>de todo dia", "fundo": "capa", "eyebrow": "o que eu como todo dia",
  "titulo": f'A fruta que você deveria consumir todos os dias {M("se vive com dor e inflamação")}.',
  "sub": "E não, não é a laranja."},

 {"fundo": "branco", "eyebrow": "você reconhece?",
  "titulo": "A inflamação que não aparece no exame",
  "corpo": ["Você acorda com o corpo pesado, mesmo tendo dormido.",
            "Sente as articulações travadas nos primeiros passos do dia.",
            "A barriga incha do nada, e some do nada.",
            "E quando você faz exame, está tudo ali, no limite do normal."]},

 {"fundo": "tiff", "eyebrow": "o que muda",
  "titulo": "Nem toda fruta joga do mesmo lado",
  "corpo": ["Existe uma régua que mede se um alimento empurra o corpo pro lado inflamatório ou pro anti-inflamatório. Na prática? É o placar de cada garfada.",
            f'A acerola marca {M("+708")} nessa régua. O goji seco faz 577. A uva, 371.'],
  "fecho": "Entre as frutas, ela é a primeira da fila."},

 {"fundo": "creme", "eyebrow": "o número que surpreende",
  "titulo": "941 contra 54",
  "corpo": ["100 g de acerola têm <b>941 mg de vitamina C</b>. A mesma quantidade de laranja pêra tem <b>54</b>.",
            "São quase 18 vezes mais, grama por grama.",
            "E com <b>33 kcal</b> e pouquíssimo açúcar, ela não mexe na sua glicemia."],
  "fonte": "Tabela TACO, acerola crua e laranja pêra crua."},

 {"fundo": "branco", "eyebrow": "onde a ciência chega, e onde ela para",
  "titulo": "O que ela faz de verdade",
  "corpo": ["Uma revisão de 18 ensaios mostrou que vitamina C em dose alta <b>reduz a IL-6 e a peroxidação lipídica</b>, dois marcadores de inflamação.",
            f'O mesmo trabalho {M("não achou efeito sobre o cortisol")} com vitamina C sozinha.'],
  "fecho": "Eu te conto os dois lados. É assim que se sabe em quem confiar.",
  "fonte": "Righi et al., Eur J Nutr 2020 · Santos de Lima et al., Crit Rev Food Sci Nutr 2022. Buscado no PubMed."},

 {"fundo": "tiff", "eyebrow": "como tomar",
  "titulo": "O erro que joga tudo fora",
  "corpo": ["Vitamina C oxida com luz, com ar e com calor. Suco batido de manhã e tomado à tarde já não é o mesmo suco.",
            "<b>Bata e beba.</b> Não coa se não precisar: a fibra segura o açúcar.",
            "E junte com o feijão ou com a folha verde escura no almoço: a vitamina C multiplica o ferro que você absorve daquela refeição."],
  "fecho": "Fruta certa, na hora errada, é fruta desperdiçada."},

 {"fundo": "cta", "corpo": ["Comenta ACEROLA que eu te mando como eu tomo.",
   "Salva pra lembrar na próxima feira.",
   "Manda pra quem vive dizendo que o exame não deu nada."],
  "arroba": "@nutri_secrets"}]}


FOME = {"slug": "fome-1709", "perfil": "@nutri_secrets", "slides": [
 {"soco": "Não é falta<br>de vontade", "fundo": "capa", "eyebrow": "o aviso que chega atrasado",
  "titulo": f'Você não come demais. O seu corpo é que {M("avisa tarde")} que já foi o suficiente.',
  "sub": "E isso está escrito no seu DNA."},

 {"fundo": "branco", "eyebrow": "você reconhece?",
  "titulo": "Você come, e vinte minutos depois entende",
  "corpo": ["Você termina o prato e ainda não sente que comeu.",
            "Repete. E aí, um tempo depois, vem aquele peso de quem comeu demais.",
            "Sua amiga come metade e para sozinha, sem esforço nenhum.",
            "E você acha que o problema é a sua força de vontade."]},

 {"fundo": "tiff", "eyebrow": "o que acontece por dentro",
  "titulo": "O freio existe. Ele só é mais lento.",
  "corpo": ["A saciedade não é decisão: é um aviso que o intestino manda pro cérebro. Na prática? É o <b>freio</b> do carro.",
            f'Em algumas pessoas esse freio {M("responde mais devagar")}. O carro anda mais alguns metros antes de parar. Não é o motorista, é o freio.']},

 {"fundo": "creme", "eyebrow": "o gene",
  "titulo": "FTO: o mais estudado da fome",
  "corpo": ["Um estudo acompanhou crianças e mediu o que separava quem carregava a variante de risco.",
            f'A diferença de peso {M("passava pela resposta de saciedade")}: quem tinha a variante registrava menos o sinal de "já chega" e respondia mais à comida na frente.',
            "O gene não engorda ninguém. Ele muda a hora em que o aviso chega."],
  "fonte": "Emond et al., Appetite 2017. Buscado no PubMed."},

 {"fundo": "branco", "eyebrow": "como detetive da saúde",
  "titulo": "Eu não olho o gene sozinho",
  "corpo": ["🧬 No <b>DNA</b>: como está a sua regulação de apetite.",
            "🩸 No <b>exame</b>: glicemia, insulina e o quanto o seu corpo está sensível a ela.",
            "🦠 Na <b>microbiota</b>: quem fermenta a sua fibra também conversa com esse freio.",
            "🧠 No <b>sono e no estresse</b>: duas noites ruins derrubam a saciedade de qualquer genética."],
  "fecho": "Sintoma isolado não se trata. Se investiga."},

 {"fundo": "tiff", "eyebrow": "o que fazer com isso",
  "titulo": "Dar tempo ao freio",
  "corpo": ["<b>Proteína e fibra primeiro.</b> Elas são o que de fato aciona o aviso. Comece o prato por elas, não pelo arroz.",
            "<b>Vinte minutos de mesa.</b> Se o aviso é lento, comer rápido garante que ele chegue depois do prato repetido.",
            "<b>Volume antes da caloria.</b> Salada, sopa, legume: enchem sem pesar.",
            "Nada disso é força de vontade. É engenharia."],
  "fecho": "Você não precisa de mais disciplina. Precisa de mais informação."},

 {"fundo": "cta", "corpo": ["Comenta FOME que eu te explico como isso aparece no seu caso.",
   "Salva pra ler antes do almoço de amanhã.",
   "Marca aquela amiga que vive se culpando por isso."],
  "arroba": "@nutri_secrets"}]}


TRES = {"slug": "tres-respostas-2509", "perfil": "@nutri_secrets", "slides": [
 {"soco": "Mesma dieta.<br>Outro corpo.", "fundo": "capa", "eyebrow": "por que comparar não funciona",
  "titulo": f'Você, sua amiga e sua prima na mesma dieta. Por que {M("só uma")} está vendo resultado?',
  "sub": "Não é força de vontade. É informação."},

 {"fundo": "branco", "eyebrow": "a cena de sempre",
  "titulo": "Três pessoas, o mesmo cardápio",
  "corpo": ["Uma emagrece na primeira semana e segue firme.",
            "A outra emagrece, mas vive com fome e desiste no mês seguinte.",
            "E a terceira faz tudo igual, direitinho, e não sai do lugar.",
            "Mesmo prato. Mesma explicação. Três corpos diferentes."]},

 {"fundo": "tiff", "eyebrow": "a primeira diferença",
  "titulo": "A hora em que a saciedade chega",
  "corpo": ["Existe variação genética em quanto o seu cérebro registra o aviso de saciedade. Quem registra menos come mais sem perceber.",
            f'Pra essa pessoa, "coma menos" é conselho inútil. O que funciona é {M("mudar a ordem do prato")}: proteína e fibra primeiro.']},

 {"fundo": "creme", "eyebrow": "a segunda diferença",
  "titulo": "Quanto tempo a motivação dura",
  "corpo": ["Tem gente que se empolga na segunda e larga na quarta. E tem gente que executa igual relógio, mas trava em qualquer imprevisto.",
            f'Isso também tem gene: o que {M("recicla a dopamina")} no cérebro. Um perfil precisa de recompensa perto. O outro precisa de menos estímulo, não de mais.'],
  "fonte": "Humińska-Lisowska, Int J Mol Sci 2024 (revisão). Buscado no PubMed."},

 {"fundo": "branco", "eyebrow": "a terceira diferença",
  "titulo": "Se a vitamina que você toma serve pra você",
  "corpo": ["Boa parte da população tem uma variação que dificulta ativar o folato sintético dos suplementos comuns.",
            f'Pra essas pessoas, a forma {M("já ativa")} muda o resultado. É a diferença entre tomar e aproveitar.'],
  "fecho": "Suplemento que o corpo não ativa é dinheiro no ralo."},

 {"fundo": "tiff", "eyebrow": "o que isso muda pra você",
  "titulo": "Parar de comparar é o primeiro passo",
  "corpo": ["A dieta da sua amiga não falhou com você. Ela foi feita pro corpo dela.",
            "Quando eu leio o seu DNA junto com o seu exame e a sua queixa, eu paro de chutar e começo a escolher.",
            "É por isso que eu me chamo Detetive da Saúde: eu junto as peças antes de decidir."],
  "fecho": "O seu corpo não é teimoso. Ele é específico."},

 {"fundo": "cta", "corpo": ["Qual das três é você? Comenta 1,&nbsp;2 ou&nbsp;3.",
   "Salva pra mandar na próxima vez que te compararem.",
   "Quer investigar a SUA história? Eu sou a Detetive da Saúde."],
  "arroba": "@nutri_secrets"}]}

NOVOS = [ACEROLA, FOME, TRES]
