# Parecer de go-live do departamento de marketing da Nutri Secrets (06/11/2026)

> Revisão pedida pela Aline: *"como se fosse um gestor de marketing sênior, ver se todas as etapas,
> configurações e linhas de estratégia estão adequadas. É como se a gente estivesse criando um
> departamento de marketing para a Nutri Secrets."* **Nada vai ao ar sem ela aprovar.**
> Duas leituras independentes: estratégia e configuração (sessão), textos e conformidade (agente de copy,
> sem ver as conclusões da sessão).

## Veredito

**Ainda não liga.** A estrutura está certa (trilho post → direct → página → botão → venda, closer com
catálogo vivo, reconhecimento de cliente, travas de segurança). O que impede são **textos das regras**
(que são dela e ela aprova) e **três pendências operacionais** (e-mail de alerta, decisão sobre a porta
do profissional, semana 1 sem trilho).

## 1. Já corrigido nesta revisão (código, testado; regras continuam desligadas)

| O quê | Por quê |
|---|---|
| Regra **BEBÊ** presa ao post de origem (os 11 comentários "bebê" vêm de um post só) | com a maternidade no feed, "que bebê lindo" receberia material técnico |
| Passo de sequência (o "conseguiu olhar?" de 23 h depois) não perde mais a janela de 24 h | a trava de madrugada fazia o convite do teste grátis ser cancelado pra quem tocou entre 22h e 10h |
| Vendedor no direct não dispara AGENDAR | duas plataformas de outubro receberiam o WhatsApp da Helô; nenhuma paciente do histórico é pega |
| Prompt do direct com **uma voz só** (primeira pessoa, a Aline) | estava "como a equipe responderia" e "como a Aline" ao mesmo tempo |
| Sem "a equipe confirma o detalhe" | prometia retorno que ninguém faria; agora manda pra Helô ou encaminha |
| Closer sem "corre", sem urgência, sem "de graça" repetido, sem marca de remédio; licença com "as nutricionistas que eu formei, o método é o mesmo" | regras de marca |
| Texto de **crise** sem promessa de retorno; **sintoma agudo** manda ligar 192 agora | "vale procurar" era fraco pra dor no peito |
| **Crise avisa a Aline por e-mail na hora** | antes só existiria o relatório do dia seguinte (que nem sai, ver item 3) |

## 2. Textos das regras: reescritas prontas, esperando o OK dela

Legenda: 🔴 bloqueia ir ao ar · 🟡 melhora.

| Regra | Problema | Reescrita proposta |
|---|---|---|
| GLP1 e SOMP, resposta pública | 🔴 "Corre no direct" | `Mandei tudo no seu direct, dá uma olhada lá 💛` |
| GLP1, botão paciente | 🔴 "manter o resultado, sem efeito sanfona" é promessa | `o que comer em cada fase, como proteger a massa magra e como cuidar da fase de manutenção depois` |
| GLP1, pergunta inicial | 🟡 pergunta sim/não com 3 botões | `você é nutri, outra profissional da saúde ou está cuidando da sua própria saúde?` |
| GLP1/SOMP, "protocolo" | 🟡 palavra da lista proibida; o material se chama "Conduta" | `essa conduta é meu presente pra você`; botão `Só o material` |
| GLP1/SOMP, follow-up de 23 h | 🔴 lista de funções, "6 minutos", "30 segundos" sem prova, "por" (pôr) | `Conseguiu olhar a conduta? 🌱 Uma pergunta, porque muda o que eu te mando: hoje você cruza exame, questionário e laudo genético num sistema ou faz à mão?` + botão "Faço à mão" com o teste grátis e o que fazer no 1º dia |
| SOMP, privada | 🔴 "Ahh que bom" sem pergunta antes, "vitalício", não separa paciente/profissional; "diagnóstico nutricional" | `Oi, {primeiro_nome}! Aqui está o guia clínico da SOMP que eu montei… [link] Depois me conta o que achou. E me diz: você atende pacientes ou está cuidando da sua saúde?` |
| BEBÊ, privada | 🔴 fala com profissional e com mãe ao mesmo tempo; ✨ | `Esse é o material da minha aula de microbiota e genética na alimentação infantil depois dos 6 meses. Foi feito para profissionais de saúde e não substitui o acompanhamento do seu bebê. Toca no botão que eu te mando o link.` |
| CANETA e DESMAME | 🟡 uma variação só na resposta pública; DESMAME sem caminho de paciente | 3 variações; repetir a pergunta "você cuida de você ou atende pacientes?" |
| POST ANTIGO, nutri | 🔴 cinco links + teste grátis juntos | com a decisão de 06/11 o teste grátis É o CTA: deixar 2 materiais (GLP-1 e intestino) e fechar com o teste grátis do Scanner como único próximo passo |
| QUADRO DE SAÚDE | 🔴 palavras amplas ("cansaço", "exame") roubam a conversa da closer e das respostas de story | **desligar a regra e deixar a closer conversar**; texto novo só se ela quiser manter |

## 3. Pendências operacionais (bloqueiam)

1. **E-mail de alerta**: `RESEND_API_KEY` (e `RELATORIO_INSTAGRAM_EMAIL`) na Vercel do `studio-aline`.
   Sem isso não chega o relatório da manhã nem o aviso de crise. Só ela/o time consegue pôr.
2. **Quem olha a fila "esperando uma pessoa"** todo dia, inclusive fim de semana (Helô?). Sem dono, o
   robô encaminha pra ninguém.
3. ✅ **Porta do profissional — decidida (06/11):** tudo sai pelo **@nutri_secrets** (o @scannerdasaude
   fica de lado por enquanto) e **todo CTA de profissional leva ao Scanner da Saúde** (teste grátis de
   14 dias ou login). A jornada de setembro (material → Formação) fica substituída nesse ponto. Já
   aplicado: catálogo e regra da closer; guias de profissional (intestino, sono, bebê) com botão pro
   cadastro. Falta (outros repositórios, fora desta sessão): `glp1.scannerdasaude.com` leva à home sem
   UTM e o `somp.scannerdasaude.com` não tem botão pro Scanner.

## 4. Estratégia (as linhas do departamento)

| Linha | Situação | Recomendação |
|---|---|---|
| Posicionamento por perfil | ✅ decidido 06/11: tudo pelo @nutri_secrets, paciente e profissional; profissional sempre termina no Scanner da Saúde | o robô separa na 1ª pergunta (paciente × profissional) |
| Escada de produto | epigenético (entrada) → nutrigenética (principal) → Lótus (método) | certo; a closer já respeita quem já tem genético |
| Semana 1 do plano (09/11, epigenético) | 🔴 sem regra CABELO e sem guia: quem comentar fica sem trilho | adiar a semana do epigenético pra 16/11 e abrir com INTESTINO/SONO, que já têm guia |
| Stories "responde só o número" | 🟡 não tem mapa número → tema; "responde SIM que eu te conto" é promessa | trocar por perguntas abertas curtas ("qual é o seu maior incômodo hoje?") que a closer sabe conduzir |
| Semana 3 com CANETA num post de mapa genético | 🟡 CANETA entrega o guia de GLP-1 | usar DNA (regra a criar) |
| Black Friday | página em prévia, compra desligada | só com página no ar e prazo real |
| Medição | comentário e direct medidos; abertura de página e venda não | link rastreado e mensagem pré-escrita no WhatsApp da Helô também nos links do direct (hoje só os guias têm) |
| Prova social | regra: só depoimento real aprovado | criar o banco de depoimentos aprovados antes das semanas de venda |

## 5. Dúvidas de produto (só ela responde)

- Consulta Nutrigenética: retorno em **60 dias** (lista da loja) ou **3 meses** (descrição)?
- Acompanhamento por mensagem (R$ 800) com ela atendendo, durante a licença: segue à venda?
- "Supervisão da Aline" sobre o time: é verdade operacional hoje? (o catálogo diz isso)
- Existe versão do guia do bebê para mães?
- Lótus: o que vem junto (consulta inclusa?) e quem responde dúvida do Lótus no direct.

## 6. Ordem pra ligar (depois do OK)

1. Ela aprova/ajusta as reescritas do item 2 → a sessão aplica nas regras (desligadas).
2. Item 3 resolvido (e-mail, dono da fila, porta do profissional).
3. Merge e deploy: Scanner primeiro (catálogo, cliente, guias), depois o Estúdio.
4. Teste no simulador (agora simula a closer com a chave desligada) e com a conta de uma amiga.
5. Troca do ManyChat no mesmo minuto (só as regras de comentário).
6. Uma semana lendo "últimas interações" duas vezes por dia; depois liga a closer ("responder direct").
