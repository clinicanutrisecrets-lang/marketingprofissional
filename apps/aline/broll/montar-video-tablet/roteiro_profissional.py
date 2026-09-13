# Legenda da versao para nutricionista: como as camadas se cruzam.
import sys
from legenda_tab import chapeu, titulo, legenda, fecho, escrever

DNA, FIM = 59.20, 66.90
ev = []

# abertura
ev += [chapeu(0.5, 5.0, "PARA NUTRICIONISTAS"),
       titulo(0.6, 5.0, "GENE NÃO É CONDUTA", fs=76),
       legenda(1.1, 5.0, "laudo sozinho não prescreve", 78)]

# 1: camada genetica
ev += [chapeu(5.2, 13.0, "AS QUATRO CAMADAS · 1 DE 4"),
       titulo(5.3, 13.0, "A CAMADA GENÉTICA", fs=76),
       legenda(5.6, 9.2, "o polimorfismo diz a tendência,\\Nnão o desfecho", 74),
       legenda(9.6, 12.9, "a mesma variante se expressa\\Nou não, dependendo do resto", 70)]

# 2: camada bioquimica
ev += [chapeu(13.2, 21.0, "AS QUATRO CAMADAS · 2 DE 4"),
       titulo(13.3, 21.0, "A CAMADA BIOQUÍMICA", fs=74),
       legenda(13.6, 17.2, "o exame diz onde a tendência\\Nestá hoje", 74),
       legenda(17.6, 20.9, "valor ideal,\\Nnão intervalo de referência", 74)]

# 3: camada clinica
ev += [chapeu(21.2, 28.5, "AS QUATRO CAMADAS · 3 E 4 DE 4"),
       titulo(21.3, 28.5, "SINTOMA E ROTINA", fs=76),
       legenda(21.6, 25.0, "o sintoma diz se ela\\Nestá se expressando", 76),
       legenda(25.4, 28.4, "e a rotina diz o que\\Né possível prescrever", 76)]

# 4: o cruzamento
ev += [chapeu(28.7, 44.0, "O QUE O LAUDO NÃO FAZ SOZINHO"),
       titulo(28.8, 44.0, "O CRUZAMENTO", fs=80),
       legenda(29.1, 33.4, "gene, exame, sintoma e rotina\\Nlidos na mesma página", 70),
       legenda(33.8, 38.2, "é daí que sai a conduta,\\Ne não do laudo", 76),
       legenda(38.6, 43.9, "duas pessoas com o mesmo exame\\Nsaem com dois planos", 68)]

# 5: o prato
ev += [chapeu(44.2, 51.0, "A GENÉTICA NO CONJUNTO"),
       titulo(44.3, 51.0, "UM DOS CONVIDADOS", fs=76),
       legenda(44.6, 50.9, "sono, microbiota e estresse\\Nsentam na mesma mesa", 72)]

# 6: a trilha
ev += [chapeu(51.2, 58.8, "O ACOMPANHAMENTO"),
       titulo(51.3, 58.8, "NÃO É LAUDO, É TRILHA", fs=70),
       legenda(51.6, 58.6, "o laudo se atualiza,\\Na conduta se revisa", 76)]

fecho(ev, DNA, FIM,
      "NUTRIÇÃO TERAPÊUTICA E NUTRIGENÔMICA",
      "quatro camadas lidas\\Nna mesma página",
      chamada="DO GENE\\NÀ CONDUTA")

escrever(ev, sys.argv[1] if len(sys.argv) > 1 else "profissional.ass")
