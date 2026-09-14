# Legenda do video da consulta nutrigenetica, versao tablet, para paciente.
import sys
from legenda_tab import chapeu, titulo, legenda, fecho, escrever

DNA, FIM = 59.20, 66.90
ev = []

# abertura
ev += [chapeu(0.5, 4.7, "CONSULTA NUTRIGENÉTICA"),
       titulo(0.6, 4.7, "NÃO É SÓ UMA DIETA", fs=76),
       legenda(1.1, 4.7, "é o manual do seu corpo", 80)]

# 1 de 5
ev += [chapeu(4.9, 20.0, "O QUE VOCÊ RECEBE · 1 DE 5"),
       titulo(5.0, 20.0, "SEU PLANO ALIMENTAR", fs=76),
       legenda(5.2, 8.2, "não é cardápio pronto:\\Né o seu metabolismo", 76),
       legenda(8.5, 11.8, "os seus exames de sangue\\Nno valor ideal,\\Nnão só na referência", 68),
       legenda(12.1, 15.4, "os sintomas que você marcou\\Ne me contou na consulta", 72),
       legenda(15.7, 17.7, "tudo isso entra\\Nno mesmo prato", 86),
       legenda(17.9, 19.9, "consulta integrativa\\Nde verdade", 80)]

# 2 de 5
ev += [chapeu(20.2, 26.0, "O QUE VOCÊ RECEBE · 2 DE 5"),
       titulo(20.3, 26.0, "SUA SUPLEMENTAÇÃO", fs=76),
       legenda(20.6, 25.9, "cada item com o motivo\\Nescrito do lado", 78)]

# 3 de 5
ev += [chapeu(26.2, 38.5, "O QUE VOCÊ RECEBE · 3 DE 5"),
       titulo(26.3, 38.5, "SUA GENÉTICA MAPEADA", fs=72),
       legenda(26.6, 32.4, "cada gene tem dois alelos:\\Num do pai, um da mãe", 74),
       legenda(32.8, 38.4, "gene de risco não é sentença:\\Nele pode estar ligado\\Nou silenciado", 68)]

# 4 de 5
ev += [chapeu(38.7, 46.5, "O QUE VOCÊ RECEBE · 4 DE 5", y=80),
       titulo(38.8, 46.5, "SEU METABOLISMO\\NDESVENDADO", fs=66, y=236),
       legenda(39.1, 46.4, "não é informação:\\Né o seu corpo explicado", 78)]

# 5 de 5
ev += [chapeu(46.7, 58.8, "O QUE VOCÊ RECEBE · 5 DE 5"),
       titulo(46.8, 58.8, "A SUA TRILHA", fs=76),
       legenda(47.1, 52.3, "o mapa inteiro já é seu:\\Nhoje a gente abre\\Nos 10 primeiros", 70),
       legenda(52.7, 58.6, "e a cada consulta\\Na gente sobe um degrau", 78)]

fecho(ev, DNA, FIM,
      "NUTRIÇÃO TERAPÊUTICA E NUTRIGENÔMICA",
      "precisão na sua saúde,\\Nexcelência no seu cuidado")

escrever(ev, sys.argv[1] if len(sys.argv) > 1 else "paciente.ass")
