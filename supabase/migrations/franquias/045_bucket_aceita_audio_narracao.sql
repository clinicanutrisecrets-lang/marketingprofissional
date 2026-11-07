-- ============================================================
-- MIGRATION 045: o bucket franqueadas-assets passa a aceitar a voz gravada
-- ============================================================
-- A narração em karaokê (037, e a das parceiras em 043) sobe o áudio gravado
-- no navegador para `franqueadas-assets`. O bucket só aceitava imagem, vídeo
-- e PDF, então TODO envio era recusado pelo Storage com
--   415 invalid_mime_type: "mime type audio/webm is not supported"
-- e a tela mostrava "a gravação não subiu, confira a internet". Nenhuma
-- narração chegou a montar: em 07/11/2026 as 4 linhas de narracoes_video
-- estavam paradas em 'enviando' (3 contas, uma delas cliente, de 04/11).
-- Visto ao gravar o tutorial dos vídeos da Black Friday.
--
-- Os formatos são os que o gravador pede ao MediaRecorder
-- (GravadorNarracao.tsx, mimeDeGravacao): Chrome/Android gravam webm, o
-- iPhone grava mp4/aac. ogg entra porque o servidor já trata a extensão.
--
-- Aditiva: só ACRESCENTA tipos à lista, nada que era aceito deixa de ser.
-- Não depende de deploy (o código no ar já manda esses tipos). Rodar de novo
-- é seguro: a lista final não repete tipo.

UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(allowed_mime_types, ARRAY[]::text[])
      || ARRAY['audio/webm', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/ogg']
    )
    ORDER BY 1
  )
)
WHERE id = 'franqueadas-assets'
  AND allowed_mime_types IS NOT NULL;

-- Conferência:
-- select allowed_mime_types from storage.buckets where id = 'franqueadas-assets';
