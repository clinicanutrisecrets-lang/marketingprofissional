export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admins: {
        Row: {
          auth_user_id: string;
          criado_em: string | null;
          email: string;
          id: string;
          nome: string;
          papel: string | null;
        };
        Insert: {
          auth_user_id: string;
          criado_em?: string | null;
          email: string;
          id?: string;
          nome: string;
          papel?: string | null;
        };
        Update: {
          auth_user_id?: string;
          criado_em?: string | null;
          email?: string;
          id?: string;
          nome?: string;
          papel?: string | null;
        };
        Relationships: [];
      };
      aprovacoes_semanais: {
        Row: {
          aprovada_em: string | null;
          comentario_geral: string | null;
          criado_em: string | null;
          deadline: string | null;
          edicoes_feitas: Json | null;
          enviada_em: string | null;
          franqueada_id: string;
          id: string;
          link_acesso: string | null;
          semana_ref: string;
          status: string | null;
          total_posts: number | null;
        };
        Insert: {
          aprovada_em?: string | null;
          comentario_geral?: string | null;
          criado_em?: string | null;
          deadline?: string | null;
          edicoes_feitas?: Json | null;
          enviada_em?: string | null;
          franqueada_id: string;
          id?: string;
          link_acesso?: string | null;
          semana_ref: string;
          status?: string | null;
          total_posts?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["aprovacoes_semanais"]["Insert"]>;
        Relationships: [];
      };
      arquivos_franqueada: {
        Row: {
          altura_px: number | null;
          aprovado_admin: boolean | null;
          criado_em: string | null;
          descricao: string | null;
          formato: string | null;
          franqueada_id: string;
          fundo_transparente: boolean | null;
          id: string;
          largura_px: number | null;
          nome_arquivo: string;
          tamanho_bytes: number | null;
          tipo: string;
          url_storage: string;
        };
        Insert: {
          altura_px?: number | null;
          aprovado_admin?: boolean | null;
          criado_em?: string | null;
          descricao?: string | null;
          formato?: string | null;
          franqueada_id: string;
          fundo_transparente?: boolean | null;
          id?: string;
          largura_px?: number | null;
          nome_arquivo: string;
          tamanho_bytes?: number | null;
          tipo: string;
          url_storage: string;
        };
        Update: Partial<Database["public"]["Tables"]["arquivos_franqueada"]["Insert"]>;
        Relationships: [];
      };
      franqueadas: {
        Row: {
          aceita_plano_saude: boolean | null;
          anos_experiencia: number | null;
          aprovacao_deadline_hora: string | null;
          aprovacao_dia_envio: number | null;
          aprovacao_hora_envio: string | null;
          aprovacao_modo: string | null;
          atualizado_em: string | null;
          auth_user_id: string | null;
          bairro: string | null;
          bannerbear_project_id: string | null;
          bio_instagram: string | null;
          budget_anuncio_mensal: number | null;
          cidade: string | null;
          concorrentes_nao_citar: string | null;
          cor_fundo_hex: string | null;
          cor_primaria_hex: string | null;
          cor_secundaria_hex: string | null;
          cor_terciaria_hex: string | null;
          cor_texto_hex: string | null;
          cpf: string | null;
          criado_em: string | null;
          crn_estado: string | null;
          crn_numero: string | null;
          data_inicio_servico: string | null;
          data_proxima_revisao: string | null;
          depoimentos_formato: string | null;
          descricao_longa: string | null;
          dias_post_semana: number[] | null;
          diferenciais: string | null;
          email: string;
          endereco_clinica: string | null;
          especializacoes: string[] | null;
          estado: string | null;
          estilo_visual: string | null;
          facebook_pagina_id: string | null;
          fallback_sem_aprovacao: string | null;
          faz_anuncio_pago: boolean | null;
          fonte_titulo: string | null;
          frequencia_reels: string | null;
          frequencia_stories: string | null;
          hashtags_favoritas: string[] | null;
          historia_pessoal: string | null;
          horario_preferido_post: string | null;
          id: string;
          instagram_access_token: string | null;
          instagram_conta_id: string | null;
          instagram_handle: string | null;
          instagram_tipo_conta: string | null;
          instagram_token_expiry: string | null;
          link_agendamento: string | null;
          link_cta_anuncio: string | null;
          linktree_ou_similar: string | null;
          mensagem_inicial_whatsapp: string | null;
          meta_ads_access_token: string | null;
          meta_ads_account_id: string | null;
          meta_ads_token_expiry: string | null;
          modalidade_atendimento: string | null;
          nicho_principal: string | null;
          nicho_secundario: string | null;
          nome_clinica: string | null;
          nome_comercial: string | null;
          nome_completo: string;
          nota_interna_admin: string | null;
          notificacao_canais: string[] | null;
          numero_pacientes_atendidos: number | null;
          objetivo_anuncio: string | null;
          onboarding_completo: boolean | null;
          onboarding_percentual: number | null;
          pais: string | null;
          palavras_chave_usar: string[] | null;
          palavras_evitar: string | null;
          plano: string | null;
          planos_aceitos: string[] | null;
          plataforma_agendamento: string | null;
          publico_alvo_descricao: string | null;
          responsavel_admin: string | null;
          resultado_transformacao: string | null;
          site_proprio: string | null;
          status: string | null;
          tagline: string | null;
          tem_depoimentos: boolean | null;
          texto_cta_botao: string | null;
          tiktok_handle: string | null;
          tipo_cta_anuncio: string | null;
          tom_comunicacao: string | null;
          valor_consulta_inicial: number | null;
          valor_consulta_retorno: number | null;
          valor_pacote_mensal: number | null;
          whatsapp: string | null;
          youtube_canal: string | null;
        };
        Insert: {
          email: string;
          nome_completo: string;
          [key: string]: unknown;
        };
        Update: {
          [key: string]: unknown;
        };
        Relationships: [];
      };
      notificacoes: {
        Row: {
          arquivada: boolean | null;
          criado_em: string | null;
          cta_label: string | null;
          cta_url: string | null;
          enviada_email: boolean | null;
          enviada_whatsapp: boolean | null;
          franqueada_id: string;
          id: string;
          lida: boolean | null;
          lida_em: string | null;
          mensagem: string;
          prioridade: string | null;
          tipo: string;
          titulo: string;
        };
        Insert: {
          franqueada_id: string;
          mensagem: string;
          tipo: string;
          titulo: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      posts_agendados: {
        Row: {
          alcance: number | null;
          angulo_copy: string | null;
          aprovacao_semanal_id: string | null;
          aprovado_individual: boolean | null;
          atualizado_em: string | null;
          bannerbear_design_id: string | null;
          bannerbear_template_id: string | null;
          bloqueado_horario: boolean | null;
          briefing_nutri: string | null;
          cliques_link: number | null;
          comentarios: number | null;
          compartilhamentos: number | null;
          copy_cta: string | null;
          copy_legenda: string | null;
          criado_em: string | null;
          criado_por: string | null;
          curtidas: number | null;
          data_hora_agendada: string | null;
          data_hora_postado: string | null;
          edicoes_log: Json | null;
          editado_pela_nutri: boolean | null;
          engajamento: number | null;
          franqueada_id: string;
          hashtags: string[] | null;
          id: string;
          imagem_upload_url: string | null;
          impressoes: number | null;
          instagram_post_id: string | null;
          legenda_gerada_ia: boolean | null;
          metricas_atualizadas_em: string | null;
          origem: string | null;
          prioridade: number | null;
          redistribuido_de: string | null;
          salvamentos: number | null;
          semana_ref: string | null;
          status: string | null;
          tipo_post: string | null;
          url_imagem_final: string | null;
          url_video_final: string | null;
          video_upload_url: string | null;
        };
        Insert: {
          franqueada_id: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      relatorios_semanais: {
        Row: {
          analise_claude: string | null;
          criado_em: string | null;
          custo_por_lead: number | null;
          enviado_nutri: boolean | null;
          franqueada_id: string;
          gasto_anuncio: number | null;
          id: string;
          insight_manual_vs_ia: string | null;
          leads_gerados: number | null;
          melhor_dia_semana: number | null;
          melhor_formato: string | null;
          melhor_horario: string | null;
          melhor_post_id: string | null;
          posts_ia_performance: Json | null;
          posts_manual_performance: Json | null;
          receita_comissao: number | null;
          recomendacoes: string[] | null;
          semana_fim: string;
          semana_inicio: string;
          taxa_engajamento: number | null;
          testes_vendidos: number | null;
          total_alcance: number | null;
          total_engajamento: number | null;
          total_posts: number | null;
        };
        Insert: {
          franqueada_id: string;
          semana_fim: string;
          semana_inicio: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
