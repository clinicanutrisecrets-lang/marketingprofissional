# -*- coding: utf-8 -*-
# ⚠️ Este exemplo soma 128 s e é ANTERIOR ao teto de 1min30 (01/09/2026):
# renderizado como está, o motor avisa no stdout e descarta as 5 últimas cenas
# (o reel sai sem o cta). Ele continua aqui como referência de FORMATO das
# cenas; pra um reel publicável, a soma dos "dur" tem que caber em 90 s.
SPEC = {
 "tema": "Menopausa",
 "cor_tema": "ROSE",
 "assinatura": "Aline Quissak · nutricionista · CRN8 10607",
 "cenas": [
  {"tipo":"hook","dur":4.4,
   "l1":"Não é frescura os sintomas.",
   "l2":"É o corpo pedindo ajuda."},

  # ---------------- 1. fogacho / COMT ----------------
  {"tipo":"sintoma","dur":5.4,"cor":"AMBER","calor":True,
   "eyebrow":"sintoma 01","titulo":"Fogacho",
   "texto":"Calor que sobe do peito para o rosto, sem aviso, várias vezes ao dia.",
   "alvo":"neck","alvo_off":(-30,18),"card_y":960,
   "figura":{"eye":"open","brow_tilt":0.4}},

  {"tipo":"gene","dur":6.2,"cor":"MUSTARD","cor2":"AMBER",
   "gene":"COMT","rs":"rs4680",
   "texto":"A faxineira que recolhe adrenalina. Na variante lenta ela limpa devagar, e o termostato do corpo demora a desligar."},

  {"tipo":"sinergia","dur":10.6,"cor":"TIFFANY",
   "titulo":"Magnésio para acordar a COMT",
   "itens":[
     {"glifo":"semente_abobora","nome":"Semente de abóbora","qtd":"30 g","freq":"5x por semana"},
     {"glifo":"espinafre","nome":"Espinafre cozido","qtd":"1 xícara","freq":"todos os dias"},
     {"glifo":"cacau","nome":"Cacau 70%","qtd":"20 g","freq":"todos os dias"},
   ],
   },

  {"tipo":"nota","dur":6.6,"cor":"TIFFANY",
   "glifos":["semente_abobora","espinafre","cacau"],
   "texto":"Juntos entregam cerca de 350 mg de magnésio, a chave de partida da enzima. Sem ele, a faxineira fica sem ferramenta."},

  # ---------------- 2. cansaço / MTHFR ----------------
  {"tipo":"sintoma","dur":5.6,"cor":"ROXO","close":True,
   "eyebrow":"sintoma 02","titulo":"Cansaço que o sono não resolve",
   "texto":"Acorda sem restauração, névoa mental, pavio curto no fim da tarde.",
   "alvo":"eyes","alvo_off":(0,8),"card_y":1030,
   "figura":{"eye":"tired","brow_tilt":1.0,"olheira_anim":True}},

  {"tipo":"gene","dur":6.2,"cor":"MUSTARD","cor2":"ROXO","giro":-1,
   "gene":"MTHFR","rs":"rs1801133",
   "texto":"Ativa o folato que abastece a metilação. No genótipo TT trabalha em marcha lenta e a homocisteína sobe."},

  {"tipo":"sinergia","dur":10.6,"cor":"CORAL",
   "titulo":"B2 e folato na mesma refeição",
   "itens":[
     {"glifo":"ovo","nome":"Ovo caipira","qtd":"2 unidades","freq":"todos os dias"},
     {"glifo":"amendoa","nome":"Amêndoas","qtd":"30 g","freq":"5x por semana"},
     {"glifo":"lentilha","nome":"Lentilha cozida","qtd":"1 xícara","freq":"3x por semana"},
   ],
   },

  {"tipo":"nota","dur":6.8,"cor":"CORAL",
   "glifos":["ovo","amendoa","lentilha"],
   "texto":"Ovo e amêndoa trazem a riboflavina que forma o FAD, o encaixe que segura a enzima de pé. A lentilha entra com o folato que ela vai ativar."},

  # ---------------- 3. osso / VDR ----------------
  {"tipo":"sintoma","dur":5.6,"cor":"CORAL",
   "eyebrow":"sintoma 03","titulo":"Osso que perde em silêncio",
   "texto":"Não dói e não avisa. A perda começa antes da última menstruação.",
   "alvo":"spine","alvo_off":(-18,0),"card_y":1060,
   "figura":{"eye":"open","undereye":0.15}},

  {"tipo":"gene","dur":6.2,"cor":"MUSTARD","cor2":"CORAL",
   "gene":"VDR","rs":"rs2228570",
   "texto":"A fechadura por onde a vitamina D entra na célula óssea. Mais dura, o mesmo exame rende menos osso."},

  {"tipo":"sinergia","dur":10.6,"cor":"CORAL",
   "titulo":"Cálcio com quem leva ele ao osso",
   "itens":[
     {"glifo":"sardinha","nome":"Sardinha com espinha","qtd":"1 lata","freq":"2x por semana"},
     {"glifo":"queijo","nome":"Queijo curado","qtd":"40 g","freq":"todos os dias"},
     {"glifo":"brocolis","nome":"Brócolis cozido","qtd":"1 xícara","freq":"4x por semana"},
   ],
   },

  {"tipo":"nota","dur":6.8,"cor":"CORAL",
   "glifos":["sardinha","queijo","brocolis"],
   "texto":"A sardinha entrega cálcio e vitamina D juntos. A K2 do queijo curado é o carteiro que leva esse cálcio para o osso, e não para a artéria."},

  # ---------------- exame e microbiota ----------------
  {"tipo":"marcadores","dur":12.4,"cor":"CORAL",
   "eyebrow":"no seu exame de sangue","titulo":"O que o sangue conta",
   "itens":[
     {"alto":True,"nome":"Homocisteína",
      "ludico":"O alarme de fumaça da metilação. Sobe quando o MTHFR está engasgado.",
      "alavanca":"folato, B2 e B12 juntos"},
     {"alto":False,"nome":"25(OH)D",
      "ludico":"A vitamina D circulante. Baixa com VDR difícil é osso perdendo por dois caminhos.",
      "alavanca":"sol e gordura boa na mesma refeição"},
     {"alto":False,"nome":"Magnésio eritrocitário",
      "ludico":"Mede o magnésio dentro da célula, onde a COMT trabalha. O do soro engana.",
      "alavanca":"semente, folha verde-escura e cacau"},
   ],
   "nota":"Marcadores interpretados sempre junto com o quadro clínico."},

  {"tipo":"marcadores","dur":11.6,"cor":"TIFFANY",
   "eyebrow":"no seu intestino","titulo":"Quem depende do estrogênio",
   "itens":[
     {"alto":False,"nome":"Estroboloma",
      "ludico":"O setor de reciclagem. O fígado embala o estrogênio para descarte e elas reabrem o pacote, devolvendo para circular. Com a atividade baixa, tudo vai direto para o lixo.",
      "alavanca":"edamame, linhaça e fibra solúvel"},
     {"alto":False,"nome":"Lactobacillus",
      "ludico":"Vivem do glicogênio que o estrogênio deposita na mucosa. Sem estrogênio, acabou o alimento delas, e o pH sobe.",
      "alavanca":"kefir e banana verde"},
   ],
   "nota":"Na pós-menopausa a reciclagem do estroboloma cai, não sobe."},

  {"tipo":"virada","dur":5.4,
   "l1":"O gene sempre esteve aí.","l2":"O estrogênio compensava.",
   "texto":"Quando ele cai, a variante deixa de ficar escondida. E o sintoma aparece."},

  {"tipo":"cta","dur":7.0},
 ],
}
