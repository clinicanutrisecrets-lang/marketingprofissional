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
      angulos_criativos: {
        Row: {
          ativo: boolean | null;
          criado_em: string | null;
          descricao_tema: string;
          franqueada_id: string;
          id: string;
          melhor_cpl: number | null;
          melhor_ctr: number | null;
          nome: string;
          publico_alvo: string | null;
          usado_quantas_vezes: number | null;
        };
        Insert: {
          ativo?: boolean | null;
          criado_em?: string | null;
          descricao_tema: string;
          franqueada_id: string;
          id?: string;
          melhor_cpl?: number | null;
          melhor_ctr?: number | null;
          nome: string;
          publico_alvo?: string | null;
          usado_quantas_vezes?: number | null;
        };
        Update: {
          ativo?: boolean | null;
          criado_em?: string | null;
          descricao_tema?: string;
          franqueada_id?: string;
          id?: string;
          melhor_cpl?: number | null;
          melhor_ctr?: number | null;
          nome?: string;
          publico_alvo?: string | null;
          usado_quantas_vezes?: number | null;
        };
        Relationships: [];
      };
      anuncios: {
        Row: { [key: string]: unknown };
        Insert: { franqueada_id: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
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
          franqueada_id: string;
          semana_ref: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
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
          franqueada_id: string;
          nome_arquivo: string;
          tipo: string;
          url_storage: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      benchmarks_mercado: {
        Row: {
          atualizado_em: string | null;
          fonte: string | null;
          id: string;
          metrica: string;
          nicho: string;
          objetivo_anuncio: string;
          observacoes: string | null;
          regiao: string;
          valor_bom: number;
          valor_excelente: number;
          valor_mediano: number;
          valor_ruim: number;
        };
        Insert: {
          metrica: string;
          nicho: string;
          objetivo_anuncio: string;
          valor_bom: number;
          valor_excelente: number;
          valor_mediano: number;
          valor_ruim: number;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      franqueadas: {
        Row: {
          atualizado_em: string | null;
          auth_user_id: string | null;
          cidade: string | null;
          cor_primaria_hex: string | null;
          cor_secundaria_hex: string | null;
          criado_em: string | null;
          descricao_longa: string | null;
          diferenciais: string | null;
          email: string;
          estado: string | null;
          estilo_visual: string | null;
          facebook_pagina_id: string | null;
          historia_pessoal: string | null;
          id: string;
          instagram_access_token: string | null;
          instagram_conta_id: string | null;
          instagram_handle: string | null;
          instagram_token_expiry: string | null;
          link_agendamento: string | null;
          link_cta_anuncio: string | null;
          mensagem_inicial_whatsapp: string | null;
          modalidade_atendimento: string | null;
          nicho_principal: string | null;
          nome_clinica: string | null;
          nome_comercial: string | null;
          nome_completo: string;
          onboarding_completo: boolean | null;
          onboarding_percentual: number | null;
          plano: string | null;
          publico_alvo_descricao: string | null;
          status: string | null;
          tagline: string | null;
          texto_cta_botao: string | null;
          tipo_cta_anuncio: string | null;
          tom_comunicacao: string | null;
          whatsapp: string | null;
          [key: string]: unknown;
        };
        Insert: {
          email: string;
          nome_completo: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      funis_destino: {
        Row: {
          ativo: boolean | null;
          criado_em: string | null;
          franqueada_id: string;
          id: string;
          lp_url: string | null;
          nome: string;
          pagina_revenda_teste: string | null;
          secretaria_telefone: string | null;
          tipo: string;
          wa_mensagem_inicial: string | null;
          wa_numero: string | null;
        };
        Insert: {
          franqueada_id: string;
          nome: string;
          tipo: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
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
      post_midias: {
        Row: {
          altura_px: number | null;
          criado_em: string | null;
          duracao_seg: number | null;
          id: string;
          largura_px: number | null;
          ordem: number;
          post_id: string;
          tamanho_bytes: number | null;
          tipo: string;
          url: string;
        };
        Insert: {
          ordem: number;
          post_id: string;
          tipo: string;
          url: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      posts_agendados: {
        Row: { [key: string]: unknown };
        Insert: { franqueada_id: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      relatorios_semanais: {
        Row: { [key: string]: unknown };
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
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
