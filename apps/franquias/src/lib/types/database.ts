// AUTO-GERADO do Supabase (projeto scanner-franquia-plataforma).
// Regenerar: MCP Supabase generate_typescript_types (project mfldshdxulqxskwcoxrl)
// NÃO editar à mão.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          auth_user_id: string
          criado_em: string | null
          email: string
          id: string
          nome: string
          papel: string | null
        }
        Insert: {
          auth_user_id: string
          criado_em?: string | null
          email: string
          id?: string
          nome: string
          papel?: string | null
        }
        Update: {
          auth_user_id?: string
          criado_em?: string | null
          email?: string
          id?: string
          nome?: string
          papel?: string | null
        }
        Relationships: []
      }
      ads_audit_log: {
        Row: {
          acao: string
          anuncio_id: string | null
          ator: string
          ator_user_id: string | null
          criado_em: string | null
          detalhes: Json | null
          estado_antes: Json | null
          estado_depois: Json | null
          franqueada_id: string
          id: string
          meta_campaign_id: string | null
          motivo: string | null
        }
        Insert: {
          acao: string
          anuncio_id?: string | null
          ator: string
          ator_user_id?: string | null
          criado_em?: string | null
          detalhes?: Json | null
          estado_antes?: Json | null
          estado_depois?: Json | null
          franqueada_id: string
          id?: string
          meta_campaign_id?: string | null
          motivo?: string | null
        }
        Update: {
          acao?: string
          anuncio_id?: string | null
          ator?: string
          ator_user_id?: string | null
          criado_em?: string | null
          detalhes?: Json | null
          estado_antes?: Json | null
          estado_depois?: Json | null
          franqueada_id?: string
          id?: string
          meta_campaign_id?: string | null
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_audit_log_anuncio_id_fkey"
            columns: ["anuncio_id"]
            isOneToOne: false
            referencedRelation: "anuncios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_audit_log_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      angulos_criativos: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          descricao_tema: string
          franqueada_id: string
          id: string
          melhor_cpl: number | null
          melhor_ctr: number | null
          nome: string
          publico_alvo: string | null
          usado_quantas_vezes: number | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao_tema: string
          franqueada_id: string
          id?: string
          melhor_cpl?: number | null
          melhor_ctr?: number | null
          nome: string
          publico_alvo?: string | null
          usado_quantas_vezes?: number | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao_tema?: string
          franqueada_id?: string
          id?: string
          melhor_cpl?: number | null
          melhor_ctr?: number | null
          nome?: string
          publico_alvo?: string | null
          usado_quantas_vezes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "angulos_criativos_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      anuncios: {
        Row: {
          angulo_salvo_id: string | null
          atualizado_em: string | null
          avaliacao_vs_benchmark: string | null
          bannerbear_design_id: string | null
          budget_diario: number | null
          budget_total: number | null
          cliques: number | null
          copy_cta_botao: string | null
          copy_headline: string | null
          copy_texto: string | null
          cpl: number | null
          criado_em: string | null
          criativo_aprovado_em: string | null
          data_fim: string | null
          data_inicio: string | null
          franqueada_id: string
          funil_destino_id: string | null
          funil_variante: string | null
          gasto_total: number | null
          id: string
          impressoes: number | null
          leads: number | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_audience_id: string | null
          meta_campaign_id: string | null
          meta_destination: string | null
          meta_lookalike_id: string | null
          meta_objective: string | null
          meta_optimization: string | null
          nome: string | null
          objetivo_negocio: string | null
          publico_descricao: string | null
          publico_meta_json: Json | null
          roas: number | null
          status: string | null
          tema_criativo: string | null
          url_destino: string | null
          url_midia: string | null
        }
        Insert: {
          angulo_salvo_id?: string | null
          atualizado_em?: string | null
          avaliacao_vs_benchmark?: string | null
          bannerbear_design_id?: string | null
          budget_diario?: number | null
          budget_total?: number | null
          cliques?: number | null
          copy_cta_botao?: string | null
          copy_headline?: string | null
          copy_texto?: string | null
          cpl?: number | null
          criado_em?: string | null
          criativo_aprovado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          franqueada_id: string
          funil_destino_id?: string | null
          funil_variante?: string | null
          gasto_total?: number | null
          id?: string
          impressoes?: number | null
          leads?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_audience_id?: string | null
          meta_campaign_id?: string | null
          meta_destination?: string | null
          meta_lookalike_id?: string | null
          meta_objective?: string | null
          meta_optimization?: string | null
          nome?: string | null
          objetivo_negocio?: string | null
          publico_descricao?: string | null
          publico_meta_json?: Json | null
          roas?: number | null
          status?: string | null
          tema_criativo?: string | null
          url_destino?: string | null
          url_midia?: string | null
        }
        Update: {
          angulo_salvo_id?: string | null
          atualizado_em?: string | null
          avaliacao_vs_benchmark?: string | null
          bannerbear_design_id?: string | null
          budget_diario?: number | null
          budget_total?: number | null
          cliques?: number | null
          copy_cta_botao?: string | null
          copy_headline?: string | null
          copy_texto?: string | null
          cpl?: number | null
          criado_em?: string | null
          criativo_aprovado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          franqueada_id?: string
          funil_destino_id?: string | null
          funil_variante?: string | null
          gasto_total?: number | null
          id?: string
          impressoes?: number | null
          leads?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_audience_id?: string | null
          meta_campaign_id?: string | null
          meta_destination?: string | null
          meta_lookalike_id?: string | null
          meta_objective?: string | null
          meta_optimization?: string | null
          nome?: string | null
          objetivo_negocio?: string | null
          publico_descricao?: string | null
          publico_meta_json?: Json | null
          roas?: number | null
          status?: string | null
          tema_criativo?: string | null
          url_destino?: string | null
          url_midia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_angulo_salvo_id_fkey"
            columns: ["angulo_salvo_id"]
            isOneToOne: false
            referencedRelation: "angulos_criativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncios_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncios_funil_destino_id_fkey"
            columns: ["funil_destino_id"]
            isOneToOne: false
            referencedRelation: "funis_destino"
            referencedColumns: ["id"]
          },
        ]
      }
      aprovacoes_semanais: {
        Row: {
          alerta_deadline_enviado: string | null
          aprovada_em: string | null
          comentario_geral: string | null
          criado_em: string | null
          deadline: string | null
          edicoes_feitas: Json | null
          enviada_em: string | null
          franqueada_id: string
          id: string
          link_acesso: string | null
          semana_ref: string
          status: string | null
          total_posts: number | null
        }
        Insert: {
          alerta_deadline_enviado?: string | null
          aprovada_em?: string | null
          comentario_geral?: string | null
          criado_em?: string | null
          deadline?: string | null
          edicoes_feitas?: Json | null
          enviada_em?: string | null
          franqueada_id: string
          id?: string
          link_acesso?: string | null
          semana_ref: string
          status?: string | null
          total_posts?: number | null
        }
        Update: {
          alerta_deadline_enviado?: string | null
          aprovada_em?: string | null
          comentario_geral?: string | null
          criado_em?: string | null
          deadline?: string | null
          edicoes_feitas?: Json | null
          enviada_em?: string | null
          franqueada_id?: string
          id?: string
          link_acesso?: string | null
          semana_ref?: string
          status?: string | null
          total_posts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_semanais_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos_franqueada: {
        Row: {
          altura_px: number | null
          aprovado_admin: boolean | null
          criado_em: string | null
          descricao: string | null
          formato: string | null
          franqueada_id: string
          fundo_transparente: boolean | null
          id: string
          largura_px: number | null
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo: string
          url_storage: string
        }
        Insert: {
          altura_px?: number | null
          aprovado_admin?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          formato?: string | null
          franqueada_id: string
          fundo_transparente?: boolean | null
          id?: string
          largura_px?: number | null
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo: string
          url_storage: string
        }
        Update: {
          altura_px?: number | null
          aprovado_admin?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          formato?: string | null
          franqueada_id?: string
          fundo_transparente?: boolean | null
          id?: string
          largura_px?: number | null
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo?: string
          url_storage?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_franqueada_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditorias_conteudo: {
        Row: {
          criado_em: string | null
          erros_recorrentes: Json | null
          fonte_dados_posts: Json | null
          franqueada_id: string
          ia_custo_usd: number | null
          ia_modelo: string | null
          ia_tokens_cached: number | null
          ia_tokens_input: number | null
          ia_tokens_output: number | null
          id: string
          ideias_aproveitadas: Json | null
          ideias_por_gap: Json | null
          lacunas_autoridade: Json | null
          lacunas_narrativa: Json | null
          latencia_ms: number | null
          oportunidades_prova: Json | null
          oportunidades_viralizacao: Json | null
          padroes_conteudo_converte: Json | null
          padroes_conteudo_prende: Json | null
          periodo_fim: string | null
          periodo_inicio: string | null
          qtd_posts_analisados: number | null
          status: string | null
          temas_saturados: Json | null
          temas_subexplorados: Json | null
        }
        Insert: {
          criado_em?: string | null
          erros_recorrentes?: Json | null
          fonte_dados_posts?: Json | null
          franqueada_id: string
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          ideias_aproveitadas?: Json | null
          ideias_por_gap?: Json | null
          lacunas_autoridade?: Json | null
          lacunas_narrativa?: Json | null
          latencia_ms?: number | null
          oportunidades_prova?: Json | null
          oportunidades_viralizacao?: Json | null
          padroes_conteudo_converte?: Json | null
          padroes_conteudo_prende?: Json | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          qtd_posts_analisados?: number | null
          status?: string | null
          temas_saturados?: Json | null
          temas_subexplorados?: Json | null
        }
        Update: {
          criado_em?: string | null
          erros_recorrentes?: Json | null
          fonte_dados_posts?: Json | null
          franqueada_id?: string
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          ideias_aproveitadas?: Json | null
          ideias_por_gap?: Json | null
          lacunas_autoridade?: Json | null
          lacunas_narrativa?: Json | null
          latencia_ms?: number | null
          oportunidades_prova?: Json | null
          oportunidades_viralizacao?: Json | null
          padroes_conteudo_converte?: Json | null
          padroes_conteudo_prende?: Json | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          qtd_posts_analisados?: number | null
          status?: string | null
          temas_saturados?: Json | null
          temas_subexplorados?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auditorias_conteudo_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmarks_mercado: {
        Row: {
          atualizado_em: string | null
          fonte: string | null
          id: string
          metrica: string
          nicho: string
          objetivo_anuncio: string
          observacoes: string | null
          regiao: string
          valor_bom: number
          valor_excelente: number
          valor_mediano: number
          valor_ruim: number
        }
        Insert: {
          atualizado_em?: string | null
          fonte?: string | null
          id?: string
          metrica: string
          nicho: string
          objetivo_anuncio: string
          observacoes?: string | null
          regiao?: string
          valor_bom: number
          valor_excelente: number
          valor_mediano: number
          valor_ruim: number
        }
        Update: {
          atualizado_em?: string | null
          fonte?: string | null
          id?: string
          metrica?: string
          nicho?: string
          objetivo_anuncio?: string
          observacoes?: string | null
          regiao?: string
          valor_bom?: number
          valor_excelente?: number
          valor_mediano?: number
          valor_ruim?: number
        }
        Relationships: []
      }
      briefings_franqueada: {
        Row: {
          angulo_sugerido: string | null
          cancelado_em: string | null
          criado_em: string | null
          formato_preferido: string | null
          franqueada_id: string
          id: string
          observacoes: string | null
          post_gerado_id: string | null
          semana_alvo: string | null
          status: string
          tema: string
          usado_em: string | null
        }
        Insert: {
          angulo_sugerido?: string | null
          cancelado_em?: string | null
          criado_em?: string | null
          formato_preferido?: string | null
          franqueada_id: string
          id?: string
          observacoes?: string | null
          post_gerado_id?: string | null
          semana_alvo?: string | null
          status?: string
          tema: string
          usado_em?: string | null
        }
        Update: {
          angulo_sugerido?: string | null
          cancelado_em?: string | null
          criado_em?: string | null
          formato_preferido?: string | null
          franqueada_id?: string
          id?: string
          observacoes?: string | null
          post_gerado_id?: string | null
          semana_alvo?: string | null
          status?: string
          tema?: string
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefings_franqueada_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_franqueada_post_gerado_id_fkey"
            columns: ["post_gerado_id"]
            isOneToOne: false
            referencedRelation: "posts_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      conversoes_registradas: {
        Row: {
          anuncio_id: string | null
          capi_enviado: boolean | null
          capi_erro: string | null
          capi_resposta: Json | null
          capi_tentativas: number | null
          criado_em: string | null
          currency: string | null
          email_hash: string | null
          event_id: string
          event_time: string
          external_id_hash: string | null
          fbclid: string | null
          fbp: string | null
          franqueada_id: string
          funil_variante: string | null
          id: string
          origem: string
          payload_origem: Json | null
          phone_hash: string | null
          tipo: string
          value: number | null
        }
        Insert: {
          anuncio_id?: string | null
          capi_enviado?: boolean | null
          capi_erro?: string | null
          capi_resposta?: Json | null
          capi_tentativas?: number | null
          criado_em?: string | null
          currency?: string | null
          email_hash?: string | null
          event_id: string
          event_time?: string
          external_id_hash?: string | null
          fbclid?: string | null
          fbp?: string | null
          franqueada_id: string
          funil_variante?: string | null
          id?: string
          origem: string
          payload_origem?: Json | null
          phone_hash?: string | null
          tipo: string
          value?: number | null
        }
        Update: {
          anuncio_id?: string | null
          capi_enviado?: boolean | null
          capi_erro?: string | null
          capi_resposta?: Json | null
          capi_tentativas?: number | null
          criado_em?: string | null
          currency?: string | null
          email_hash?: string | null
          event_id?: string
          event_time?: string
          external_id_hash?: string | null
          fbclid?: string | null
          fbp?: string | null
          franqueada_id?: string
          funil_variante?: string | null
          id?: string
          origem?: string
          payload_origem?: Json | null
          phone_hash?: string | null
          tipo?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversoes_registradas_anuncio_id_fkey"
            columns: ["anuncio_id"]
            isOneToOne: false
            referencedRelation: "anuncios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversoes_registradas_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_franqueadas: {
        Row: {
          aceito_em: string | null
          aceito_por: string | null
          criado_em: string
          email: string
          enviado_por: string | null
          expira_em: string
          id: string
          nome_completo: string
          plano: string
          status: string
          token: string
        }
        Insert: {
          aceito_em?: string | null
          aceito_por?: string | null
          criado_em?: string
          email: string
          enviado_por?: string | null
          expira_em?: string
          id?: string
          nome_completo: string
          plano?: string
          status?: string
          token: string
        }
        Update: {
          aceito_em?: string | null
          aceito_por?: string | null
          criado_em?: string
          email?: string
          enviado_por?: string | null
          expira_em?: string
          id?: string
          nome_completo?: string
          plano?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_franqueadas_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      custos_geracao: {
        Row: {
          aprovacao_semanal_id: string | null
          briefing_id: string | null
          cache_creation_input_tokens: number | null
          cache_read_input_tokens: number | null
          criado_em: string | null
          custo_usd: number
          erro: string | null
          franqueada_id: string | null
          id: string
          input_tokens: number | null
          latencia_ms: number | null
          metadata: Json | null
          modelo: string | null
          operacao: string
          output_tokens: number | null
          post_agendado_id: string | null
          servico: string
          sucesso: boolean | null
        }
        Insert: {
          aprovacao_semanal_id?: string | null
          briefing_id?: string | null
          cache_creation_input_tokens?: number | null
          cache_read_input_tokens?: number | null
          criado_em?: string | null
          custo_usd?: number
          erro?: string | null
          franqueada_id?: string | null
          id?: string
          input_tokens?: number | null
          latencia_ms?: number | null
          metadata?: Json | null
          modelo?: string | null
          operacao: string
          output_tokens?: number | null
          post_agendado_id?: string | null
          servico: string
          sucesso?: boolean | null
        }
        Update: {
          aprovacao_semanal_id?: string | null
          briefing_id?: string | null
          cache_creation_input_tokens?: number | null
          cache_read_input_tokens?: number | null
          criado_em?: string | null
          custo_usd?: number
          erro?: string | null
          franqueada_id?: string | null
          id?: string
          input_tokens?: number | null
          latencia_ms?: number | null
          metadata?: Json | null
          modelo?: string | null
          operacao?: string
          output_tokens?: number | null
          post_agendado_id?: string | null
          servico?: string
          sucesso?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "custos_geracao_aprovacao_semanal_id_fkey"
            columns: ["aprovacao_semanal_id"]
            isOneToOne: false
            referencedRelation: "aprovacoes_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_geracao_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings_franqueada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_geracao_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_geracao_post_agendado_id_fkey"
            columns: ["post_agendado_id"]
            isOneToOne: false
            referencedRelation: "posts_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      datas_comemorativas: {
        Row: {
          ativo: boolean | null
          categoria: string
          criado_em: string | null
          data_dia: number
          data_mes: number
          descricao: string | null
          hashtags_sugeridas: string[] | null
          id: string
          ideias_angulo: string | null
          nome: string
          prioridade: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          criado_em?: string | null
          data_dia: number
          data_mes: number
          descricao?: string | null
          hashtags_sugeridas?: string[] | null
          id?: string
          ideias_angulo?: string | null
          nome: string
          prioridade?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          criado_em?: string | null
          data_dia?: number
          data_mes?: number
          descricao?: string | null
          hashtags_sugeridas?: string[] | null
          id?: string
          ideias_angulo?: string | null
          nome?: string
          prioridade?: number | null
        }
        Relationships: []
      }
      depoimentos_franqueada: {
        Row: {
          anonimo: boolean | null
          ativo: boolean | null
          atualizado_em: string | null
          autorizacao_uso: boolean | null
          criado_em: string | null
          fonte: string | null
          franqueada_id: string
          genero: string | null
          id: string
          idade_aproximada: number | null
          midia_url: string | null
          objecoes_relatadas: string | null
          ponto_ruptura: string | null
          problema_inicial: string
          quem_era: string | null
          regiao: string | null
          resultado: string
          solucao_aplicada: string
          titulo: string
          usado_em_ads: Json | null
          usado_em_posts: Json | null
        }
        Insert: {
          anonimo?: boolean | null
          ativo?: boolean | null
          atualizado_em?: string | null
          autorizacao_uso?: boolean | null
          criado_em?: string | null
          fonte?: string | null
          franqueada_id: string
          genero?: string | null
          id?: string
          idade_aproximada?: number | null
          midia_url?: string | null
          objecoes_relatadas?: string | null
          ponto_ruptura?: string | null
          problema_inicial: string
          quem_era?: string | null
          regiao?: string | null
          resultado: string
          solucao_aplicada: string
          titulo: string
          usado_em_ads?: Json | null
          usado_em_posts?: Json | null
        }
        Update: {
          anonimo?: boolean | null
          ativo?: boolean | null
          atualizado_em?: string | null
          autorizacao_uso?: boolean | null
          criado_em?: string | null
          fonte?: string | null
          franqueada_id?: string
          genero?: string | null
          id?: string
          idade_aproximada?: number | null
          midia_url?: string | null
          objecoes_relatadas?: string | null
          ponto_ruptura?: string | null
          problema_inicial?: string
          quem_era?: string | null
          regiao?: string | null
          resultado?: string
          solucao_aplicada?: string
          titulo?: string
          usado_em_ads?: Json | null
          usado_em_posts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "depoimentos_franqueada_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosticos_perfil: {
        Row: {
          acao_em: string | null
          clareza_posicionamento: string | null
          criado_em: string | null
          diagnostico_primeira_impressao: string | null
          erros_percepcao: Json | null
          feedback_nutri: string | null
          fonte_dados_ig: Json | null
          fonte_dados_onboarding: Json | null
          forcas: Json | null
          franqueada_id: string
          fraquezas: Json | null
          gargalos_conversao: Json | null
          gargalos_crescimento: Json | null
          ia_custo_usd: number | null
          ia_modelo: string | null
          ia_tokens_cached: number | null
          ia_tokens_input: number | null
          ia_tokens_output: number | null
          id: string
          ideias_reposicionamento: Json | null
          latencia_ms: number | null
          linha_editorial_atual: string | null
          mudancas_priorizadas: Json | null
          oportunidades_rapidas: Json | null
          status: string | null
          sugestoes_bio: Json | null
          sugestoes_destaques: Json | null
          sugestoes_linha_editorial: string | null
          visualizado_em: string | null
        }
        Insert: {
          acao_em?: string | null
          clareza_posicionamento?: string | null
          criado_em?: string | null
          diagnostico_primeira_impressao?: string | null
          erros_percepcao?: Json | null
          feedback_nutri?: string | null
          fonte_dados_ig?: Json | null
          fonte_dados_onboarding?: Json | null
          forcas?: Json | null
          franqueada_id: string
          fraquezas?: Json | null
          gargalos_conversao?: Json | null
          gargalos_crescimento?: Json | null
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          ideias_reposicionamento?: Json | null
          latencia_ms?: number | null
          linha_editorial_atual?: string | null
          mudancas_priorizadas?: Json | null
          oportunidades_rapidas?: Json | null
          status?: string | null
          sugestoes_bio?: Json | null
          sugestoes_destaques?: Json | null
          sugestoes_linha_editorial?: string | null
          visualizado_em?: string | null
        }
        Update: {
          acao_em?: string | null
          clareza_posicionamento?: string | null
          criado_em?: string | null
          diagnostico_primeira_impressao?: string | null
          erros_percepcao?: Json | null
          feedback_nutri?: string | null
          fonte_dados_ig?: Json | null
          fonte_dados_onboarding?: Json | null
          forcas?: Json | null
          franqueada_id?: string
          fraquezas?: Json | null
          gargalos_conversao?: Json | null
          gargalos_crescimento?: Json | null
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          ideias_reposicionamento?: Json | null
          latencia_ms?: number | null
          linha_editorial_atual?: string | null
          mudancas_priorizadas?: Json | null
          oportunidades_rapidas?: Json | null
          status?: string | null
          sugestoes_bio?: Json | null
          sugestoes_destaques?: Json | null
          sugestoes_linha_editorial?: string | null
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnosticos_perfil_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          criado_em: string | null
          franqueada_id: string | null
          html: string
          id: string
          last_error: string | null
          reply_to: string | null
          resend_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          tipo: string
          to_email: string
        }
        Insert: {
          attempts?: number
          criado_em?: string | null
          franqueada_id?: string | null
          html: string
          id?: string
          last_error?: string | null
          reply_to?: string | null
          resend_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject: string
          tipo: string
          to_email: string
        }
        Update: {
          attempts?: number
          criado_em?: string | null
          franqueada_id?: string | null
          html?: string
          id?: string
          last_error?: string | null
          reply_to?: string | null
          resend_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          tipo?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      franqueadas: {
        Row: {
          aceita_plano_saude: boolean | null
          anos_experiencia: number | null
          aprovacao_deadline_hora: string | null
          aprovacao_dia_envio: number | null
          aprovacao_hora_envio: string | null
          aprovacao_modo: string | null
          atualizado_em: string | null
          auth_user_id: string | null
          bairro: string | null
          bannerbear_project_id: string | null
          bio_instagram: string | null
          budget_alerta_percentual: number | null
          budget_anuncio_mensal: number | null
          budget_diario_maximo: number | null
          cidade: string | null
          concorrentes_nao_citar: string | null
          cor_fundo_hex: string | null
          cor_primaria_hex: string | null
          cor_secundaria_hex: string | null
          cor_terciaria_hex: string | null
          cor_texto_hex: string | null
          cpf: string | null
          criado_em: string | null
          crn_estado: string | null
          crn_numero: string | null
          data_inicio_servico: string | null
          data_proxima_revisao: string | null
          depoimentos_formato: string | null
          descricao_longa: string | null
          dias_post_semana: number[] | null
          diferenciais: string | null
          email: string
          endereco_clinica: string | null
          especializacoes: string[] | null
          estado: string | null
          estilo_visual: string | null
          exame_precisao_ativo: boolean | null
          facebook_pagina_id: string | null
          fallback_sem_aprovacao: string | null
          faz_anuncio_pago: boolean | null
          fonte_titulo: string | null
          frequencia_reels: string | null
          frequencia_stories: string | null
          hashtags_favoritas: string[] | null
          historia_pessoal: string | null
          horario_preferido_post: string | null
          id: string
          instagram_access_token: string | null
          instagram_conta_id: string | null
          instagram_handle: string | null
          instagram_tipo_conta: string | null
          instagram_token_expiry: string | null
          kiwify_product_id: string | null
          kiwify_product_synced_em: string | null
          link_agendamento: string | null
          link_cta_anuncio: string | null
          linktree_ou_similar: string | null
          mensagem_inicial_whatsapp: string | null
          meta_ads_access_token: string | null
          meta_ads_account_id: string | null
          meta_ads_token_expiry: string | null
          modalidade_atendimento: string | null
          nicho_principal: string | null
          nicho_secundario: string | null
          nome_clinica: string | null
          nome_comercial: string | null
          nome_completo: string
          nota_interna_admin: string | null
          notificacao_canais: string[] | null
          numero_pacientes_atendidos: number | null
          objetivo_anuncio: string | null
          onboarding_completo: boolean | null
          onboarding_percentual: number | null
          pais: string | null
          palavras_chave_usar: string[] | null
          palavras_evitar: string | null
          plano: string | null
          planos_aceitos: string[] | null
          plataforma_agendamento: string | null
          publico_alvo_descricao: string | null
          responsavel_admin: string | null
          resultado_transformacao: string | null
          scanner_saas_user_id: string | null
          site_proprio: string | null
          sofia_slug: string | null
          status: string | null
          tagline: string | null
          tem_depoimentos: boolean | null
          texto_cta_botao: string | null
          tiktok_handle: string | null
          tipo_cta_anuncio: string | null
          tom_comunicacao: string | null
          valor_consulta_inicial: number | null
          valor_consulta_retorno: number | null
          valor_pacote_mensal: number | null
          whatsapp: string | null
          youtube_canal: string | null
        }
        Insert: {
          aceita_plano_saude?: boolean | null
          anos_experiencia?: number | null
          aprovacao_deadline_hora?: string | null
          aprovacao_dia_envio?: number | null
          aprovacao_hora_envio?: string | null
          aprovacao_modo?: string | null
          atualizado_em?: string | null
          auth_user_id?: string | null
          bairro?: string | null
          bannerbear_project_id?: string | null
          bio_instagram?: string | null
          budget_alerta_percentual?: number | null
          budget_anuncio_mensal?: number | null
          budget_diario_maximo?: number | null
          cidade?: string | null
          concorrentes_nao_citar?: string | null
          cor_fundo_hex?: string | null
          cor_primaria_hex?: string | null
          cor_secundaria_hex?: string | null
          cor_terciaria_hex?: string | null
          cor_texto_hex?: string | null
          cpf?: string | null
          criado_em?: string | null
          crn_estado?: string | null
          crn_numero?: string | null
          data_inicio_servico?: string | null
          data_proxima_revisao?: string | null
          depoimentos_formato?: string | null
          descricao_longa?: string | null
          dias_post_semana?: number[] | null
          diferenciais?: string | null
          email: string
          endereco_clinica?: string | null
          especializacoes?: string[] | null
          estado?: string | null
          estilo_visual?: string | null
          exame_precisao_ativo?: boolean | null
          facebook_pagina_id?: string | null
          fallback_sem_aprovacao?: string | null
          faz_anuncio_pago?: boolean | null
          fonte_titulo?: string | null
          frequencia_reels?: string | null
          frequencia_stories?: string | null
          hashtags_favoritas?: string[] | null
          historia_pessoal?: string | null
          horario_preferido_post?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_conta_id?: string | null
          instagram_handle?: string | null
          instagram_tipo_conta?: string | null
          instagram_token_expiry?: string | null
          kiwify_product_id?: string | null
          kiwify_product_synced_em?: string | null
          link_agendamento?: string | null
          link_cta_anuncio?: string | null
          linktree_ou_similar?: string | null
          mensagem_inicial_whatsapp?: string | null
          meta_ads_access_token?: string | null
          meta_ads_account_id?: string | null
          meta_ads_token_expiry?: string | null
          modalidade_atendimento?: string | null
          nicho_principal?: string | null
          nicho_secundario?: string | null
          nome_clinica?: string | null
          nome_comercial?: string | null
          nome_completo: string
          nota_interna_admin?: string | null
          notificacao_canais?: string[] | null
          numero_pacientes_atendidos?: number | null
          objetivo_anuncio?: string | null
          onboarding_completo?: boolean | null
          onboarding_percentual?: number | null
          pais?: string | null
          palavras_chave_usar?: string[] | null
          palavras_evitar?: string | null
          plano?: string | null
          planos_aceitos?: string[] | null
          plataforma_agendamento?: string | null
          publico_alvo_descricao?: string | null
          responsavel_admin?: string | null
          resultado_transformacao?: string | null
          scanner_saas_user_id?: string | null
          site_proprio?: string | null
          sofia_slug?: string | null
          status?: string | null
          tagline?: string | null
          tem_depoimentos?: boolean | null
          texto_cta_botao?: string | null
          tiktok_handle?: string | null
          tipo_cta_anuncio?: string | null
          tom_comunicacao?: string | null
          valor_consulta_inicial?: number | null
          valor_consulta_retorno?: number | null
          valor_pacote_mensal?: number | null
          whatsapp?: string | null
          youtube_canal?: string | null
        }
        Update: {
          aceita_plano_saude?: boolean | null
          anos_experiencia?: number | null
          aprovacao_deadline_hora?: string | null
          aprovacao_dia_envio?: number | null
          aprovacao_hora_envio?: string | null
          aprovacao_modo?: string | null
          atualizado_em?: string | null
          auth_user_id?: string | null
          bairro?: string | null
          bannerbear_project_id?: string | null
          bio_instagram?: string | null
          budget_alerta_percentual?: number | null
          budget_anuncio_mensal?: number | null
          budget_diario_maximo?: number | null
          cidade?: string | null
          concorrentes_nao_citar?: string | null
          cor_fundo_hex?: string | null
          cor_primaria_hex?: string | null
          cor_secundaria_hex?: string | null
          cor_terciaria_hex?: string | null
          cor_texto_hex?: string | null
          cpf?: string | null
          criado_em?: string | null
          crn_estado?: string | null
          crn_numero?: string | null
          data_inicio_servico?: string | null
          data_proxima_revisao?: string | null
          depoimentos_formato?: string | null
          descricao_longa?: string | null
          dias_post_semana?: number[] | null
          diferenciais?: string | null
          email?: string
          endereco_clinica?: string | null
          especializacoes?: string[] | null
          estado?: string | null
          estilo_visual?: string | null
          exame_precisao_ativo?: boolean | null
          facebook_pagina_id?: string | null
          fallback_sem_aprovacao?: string | null
          faz_anuncio_pago?: boolean | null
          fonte_titulo?: string | null
          frequencia_reels?: string | null
          frequencia_stories?: string | null
          hashtags_favoritas?: string[] | null
          historia_pessoal?: string | null
          horario_preferido_post?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_conta_id?: string | null
          instagram_handle?: string | null
          instagram_tipo_conta?: string | null
          instagram_token_expiry?: string | null
          kiwify_product_id?: string | null
          kiwify_product_synced_em?: string | null
          link_agendamento?: string | null
          link_cta_anuncio?: string | null
          linktree_ou_similar?: string | null
          mensagem_inicial_whatsapp?: string | null
          meta_ads_access_token?: string | null
          meta_ads_account_id?: string | null
          meta_ads_token_expiry?: string | null
          modalidade_atendimento?: string | null
          nicho_principal?: string | null
          nicho_secundario?: string | null
          nome_clinica?: string | null
          nome_comercial?: string | null
          nome_completo?: string
          nota_interna_admin?: string | null
          notificacao_canais?: string[] | null
          numero_pacientes_atendidos?: number | null
          objetivo_anuncio?: string | null
          onboarding_completo?: boolean | null
          onboarding_percentual?: number | null
          pais?: string | null
          palavras_chave_usar?: string[] | null
          palavras_evitar?: string | null
          plano?: string | null
          planos_aceitos?: string[] | null
          plataforma_agendamento?: string | null
          publico_alvo_descricao?: string | null
          responsavel_admin?: string | null
          resultado_transformacao?: string | null
          scanner_saas_user_id?: string | null
          site_proprio?: string | null
          sofia_slug?: string | null
          status?: string | null
          tagline?: string | null
          tem_depoimentos?: boolean | null
          texto_cta_botao?: string | null
          tiktok_handle?: string | null
          tipo_cta_anuncio?: string | null
          tom_comunicacao?: string | null
          valor_consulta_inicial?: number | null
          valor_consulta_retorno?: number | null
          valor_pacote_mensal?: number | null
          whatsapp?: string | null
          youtube_canal?: string | null
        }
        Relationships: []
      }
      franquia_onboardings: {
        Row: {
          criado_em: string | null
          email: string
          email_enviado_em: string | null
          franqueada_id: string | null
          id: string
          nome: string
          onboarding_concluido_em: string | null
          onboarding_iniciado_em: string | null
          onboarding_token: string
          origem_payload: Json | null
          plano_anterior: string | null
          scanner_user_id: string
          status: string | null
          whatsapp: string | null
        }
        Insert: {
          criado_em?: string | null
          email: string
          email_enviado_em?: string | null
          franqueada_id?: string | null
          id?: string
          nome: string
          onboarding_concluido_em?: string | null
          onboarding_iniciado_em?: string | null
          onboarding_token: string
          origem_payload?: Json | null
          plano_anterior?: string | null
          scanner_user_id: string
          status?: string | null
          whatsapp?: string | null
        }
        Update: {
          criado_em?: string | null
          email?: string
          email_enviado_em?: string | null
          franqueada_id?: string | null
          id?: string
          nome?: string
          onboarding_concluido_em?: string | null
          onboarding_iniciado_em?: string | null
          onboarding_token?: string
          origem_payload?: Json | null
          plano_anterior?: string | null
          scanner_user_id?: string
          status?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franquia_onboardings_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      funis_destino: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          franqueada_id: string
          id: string
          lp_url: string | null
          nome: string
          pagina_revenda_teste: string | null
          secretaria_telefone: string | null
          tipo: string
          wa_mensagem_inicial: string | null
          wa_numero: string | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          franqueada_id: string
          id?: string
          lp_url?: string | null
          nome: string
          pagina_revenda_teste?: string | null
          secretaria_telefone?: string | null
          tipo: string
          wa_mensagem_inicial?: string | null
          wa_numero?: string | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          franqueada_id?: string
          id?: string
          lp_url?: string | null
          nome?: string
          pagina_revenda_teste?: string | null
          secretaria_telefone?: string | null
          tipo?: string
          wa_mensagem_inicial?: string | null
          wa_numero?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funis_destino_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_images: {
        Row: {
          b64: string
          created_at: string | null
          id: string
        }
        Insert: {
          b64: string
          created_at?: string | null
          id: string
        }
        Update: {
          b64?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          arquivada: boolean | null
          criado_em: string | null
          cta_label: string | null
          cta_url: string | null
          enviada_email: boolean | null
          enviada_whatsapp: boolean | null
          franqueada_id: string
          id: string
          lida: boolean | null
          lida_em: string | null
          mensagem: string
          prioridade: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          arquivada?: boolean | null
          criado_em?: string | null
          cta_label?: string | null
          cta_url?: string | null
          enviada_email?: boolean | null
          enviada_whatsapp?: boolean | null
          franqueada_id: string
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          mensagem: string
          prioridade?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          arquivada?: boolean | null
          criado_em?: string | null
          cta_label?: string | null
          cta_url?: string | null
          enviada_email?: boolean | null
          enviada_whatsapp?: boolean | null
          franqueada_id?: string
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          mensagem?: string
          prioridade?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      planejamentos_estrategicos: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          franqueada_id: string
          ia_custo_usd: number | null
          ia_modelo: string | null
          ia_tokens_cached: number | null
          ia_tokens_input: number | null
          ia_tokens_output: number | null
          id: string
          input: Json
          latencia_ms: number | null
          mecanismo_eleito: string | null
          output: Json
          status: string | null
          tipo: string
          vigente_ate: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          franqueada_id: string
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          input: Json
          latencia_ms?: number | null
          mecanismo_eleito?: string | null
          output: Json
          status?: string | null
          tipo: string
          vigente_ate?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          franqueada_id?: string
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          input?: Json
          latencia_ms?: number | null
          mecanismo_eleito?: string | null
          output?: Json
          status?: string | null
          tipo?: string
          vigente_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planejamentos_estrategicos_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      post_midias: {
        Row: {
          altura_px: number | null
          criado_em: string | null
          duracao_seg: number | null
          id: string
          largura_px: number | null
          ordem: number
          post_id: string
          tamanho_bytes: number | null
          tipo: string
          url: string
        }
        Insert: {
          altura_px?: number | null
          criado_em?: string | null
          duracao_seg?: number | null
          id?: string
          largura_px?: number | null
          ordem: number
          post_id: string
          tamanho_bytes?: number | null
          tipo: string
          url: string
        }
        Update: {
          altura_px?: number | null
          criado_em?: string | null
          duracao_seg?: number | null
          id?: string
          largura_px?: number | null
          ordem?: number
          post_id?: string
          tamanho_bytes?: number | null
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_midias_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_agendados: {
        Row: {
          alcance: number | null
          angulo_copy: string | null
          aprovacao_semanal_id: string | null
          aprovado_individual: boolean | null
          atualizado_em: string | null
          bannerbear_design_id: string | null
          bannerbear_template_id: string | null
          bloqueado_horario: boolean | null
          briefing_id: string | null
          briefing_nutri: string | null
          cliques_link: number | null
          comentarios: number | null
          compartilhamentos: number | null
          copy_cta: string | null
          copy_cta_ia_original: string | null
          copy_legenda: string | null
          copy_legenda_ia_original: string | null
          criado_em: string | null
          criado_por: string | null
          curtidas: number | null
          data_hora_agendada: string | null
          data_hora_postado: string | null
          edicoes_log: Json | null
          editado_pela_nutri: boolean | null
          engajamento: number | null
          franqueada_id: string
          hashtags: string[] | null
          hashtags_ia_original: string[] | null
          ia_model_usado: string | null
          ia_tokens_cached: number | null
          ia_tokens_input: number | null
          ia_tokens_output: number | null
          id: string
          imagem_upload_url: string | null
          impressoes: number | null
          instagram_post_id: string | null
          legenda_gerada_ia: boolean | null
          metricas_atualizadas_em: string | null
          origem: string | null
          prioridade: number | null
          redistribuido_de: string | null
          salvamentos: number | null
          semana_ref: string | null
          status: string | null
          tipo_post: string | null
          url_imagem_final: string | null
          url_video_final: string | null
          video_upload_url: string | null
        }
        Insert: {
          alcance?: number | null
          angulo_copy?: string | null
          aprovacao_semanal_id?: string | null
          aprovado_individual?: boolean | null
          atualizado_em?: string | null
          bannerbear_design_id?: string | null
          bannerbear_template_id?: string | null
          bloqueado_horario?: boolean | null
          briefing_id?: string | null
          briefing_nutri?: string | null
          cliques_link?: number | null
          comentarios?: number | null
          compartilhamentos?: number | null
          copy_cta?: string | null
          copy_cta_ia_original?: string | null
          copy_legenda?: string | null
          copy_legenda_ia_original?: string | null
          criado_em?: string | null
          criado_por?: string | null
          curtidas?: number | null
          data_hora_agendada?: string | null
          data_hora_postado?: string | null
          edicoes_log?: Json | null
          editado_pela_nutri?: boolean | null
          engajamento?: number | null
          franqueada_id: string
          hashtags?: string[] | null
          hashtags_ia_original?: string[] | null
          ia_model_usado?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          imagem_upload_url?: string | null
          impressoes?: number | null
          instagram_post_id?: string | null
          legenda_gerada_ia?: boolean | null
          metricas_atualizadas_em?: string | null
          origem?: string | null
          prioridade?: number | null
          redistribuido_de?: string | null
          salvamentos?: number | null
          semana_ref?: string | null
          status?: string | null
          tipo_post?: string | null
          url_imagem_final?: string | null
          url_video_final?: string | null
          video_upload_url?: string | null
        }
        Update: {
          alcance?: number | null
          angulo_copy?: string | null
          aprovacao_semanal_id?: string | null
          aprovado_individual?: boolean | null
          atualizado_em?: string | null
          bannerbear_design_id?: string | null
          bannerbear_template_id?: string | null
          bloqueado_horario?: boolean | null
          briefing_id?: string | null
          briefing_nutri?: string | null
          cliques_link?: number | null
          comentarios?: number | null
          compartilhamentos?: number | null
          copy_cta?: string | null
          copy_cta_ia_original?: string | null
          copy_legenda?: string | null
          copy_legenda_ia_original?: string | null
          criado_em?: string | null
          criado_por?: string | null
          curtidas?: number | null
          data_hora_agendada?: string | null
          data_hora_postado?: string | null
          edicoes_log?: Json | null
          editado_pela_nutri?: boolean | null
          engajamento?: number | null
          franqueada_id?: string
          hashtags?: string[] | null
          hashtags_ia_original?: string[] | null
          ia_model_usado?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          imagem_upload_url?: string | null
          impressoes?: number | null
          instagram_post_id?: string | null
          legenda_gerada_ia?: boolean | null
          metricas_atualizadas_em?: string | null
          origem?: string | null
          prioridade?: number | null
          redistribuido_de?: string | null
          salvamentos?: number | null
          semana_ref?: string | null
          status?: string | null
          tipo_post?: string | null
          url_imagem_final?: string | null
          url_video_final?: string | null
          video_upload_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_agendados_aprovacao_semanal_id_fkey"
            columns: ["aprovacao_semanal_id"]
            isOneToOne: false
            referencedRelation: "aprovacoes_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_agendados_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings_franqueada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_agendados_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_semanais: {
        Row: {
          analise_claude: string | null
          criado_em: string | null
          custo_por_lead: number | null
          enviado_nutri: boolean | null
          franqueada_id: string
          gasto_anuncio: number | null
          id: string
          insight_manual_vs_ia: string | null
          leads_gerados: number | null
          melhor_dia_semana: number | null
          melhor_formato: string | null
          melhor_horario: string | null
          melhor_post_id: string | null
          posts_ia_performance: Json | null
          posts_manual_performance: Json | null
          receita_comissao: number | null
          recomendacoes: string[] | null
          semana_fim: string
          semana_inicio: string
          taxa_engajamento: number | null
          testes_vendidos: number | null
          total_alcance: number | null
          total_engajamento: number | null
          total_posts: number | null
        }
        Insert: {
          analise_claude?: string | null
          criado_em?: string | null
          custo_por_lead?: number | null
          enviado_nutri?: boolean | null
          franqueada_id: string
          gasto_anuncio?: number | null
          id?: string
          insight_manual_vs_ia?: string | null
          leads_gerados?: number | null
          melhor_dia_semana?: number | null
          melhor_formato?: string | null
          melhor_horario?: string | null
          melhor_post_id?: string | null
          posts_ia_performance?: Json | null
          posts_manual_performance?: Json | null
          receita_comissao?: number | null
          recomendacoes?: string[] | null
          semana_fim: string
          semana_inicio: string
          taxa_engajamento?: number | null
          testes_vendidos?: number | null
          total_alcance?: number | null
          total_engajamento?: number | null
          total_posts?: number | null
        }
        Update: {
          analise_claude?: string | null
          criado_em?: string | null
          custo_por_lead?: number | null
          enviado_nutri?: boolean | null
          franqueada_id?: string
          gasto_anuncio?: number | null
          id?: string
          insight_manual_vs_ia?: string | null
          leads_gerados?: number | null
          melhor_dia_semana?: number | null
          melhor_formato?: string | null
          melhor_horario?: string | null
          melhor_post_id?: string | null
          posts_ia_performance?: Json | null
          posts_manual_performance?: Json | null
          receita_comissao?: number | null
          recomendacoes?: string[] | null
          semana_fim?: string
          semana_inicio?: string
          taxa_engajamento?: number | null
          testes_vendidos?: number | null
          total_alcance?: number | null
          total_engajamento?: number | null
          total_posts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_semanais_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_semanais_melhor_post_id_fkey"
            columns: ["melhor_post_id"]
            isOneToOne: false
            referencedRelation: "posts_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_exclusao: {
        Row: {
          criado_em: string
          email: string
          id: string
          instagram_handle: string | null
          motivo: string | null
          observacoes: string | null
          processada_em: string | null
          processada_por: string | null
          status: string
        }
        Insert: {
          criado_em?: string
          email: string
          id?: string
          instagram_handle?: string | null
          motivo?: string | null
          observacoes?: string | null
          processada_em?: string | null
          processada_por?: string | null
          status?: string
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          instagram_handle?: string | null
          motivo?: string | null
          observacoes?: string | null
          processada_em?: string | null
          processada_por?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_exclusao_processada_por_fkey"
            columns: ["processada_por"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      storytellings_gerados: {
        Row: {
          criado_em: string | null
          depoimento_id: string | null
          franqueada_id: string
          ia_custo_usd: number | null
          ia_modelo: string | null
          ia_tokens_cached: number | null
          ia_tokens_input: number | null
          ia_tokens_output: number | null
          id: string
          input: Json
          latencia_ms: number | null
          modo: string
          output: Json
          status: string | null
          versao_ad_125: string | null
          versao_post_curto: string | null
          versao_post_longo: string | null
          versao_reels_script: string | null
        }
        Insert: {
          criado_em?: string | null
          depoimento_id?: string | null
          franqueada_id: string
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          input: Json
          latencia_ms?: number | null
          modo: string
          output: Json
          status?: string | null
          versao_ad_125?: string | null
          versao_post_curto?: string | null
          versao_post_longo?: string | null
          versao_reels_script?: string | null
        }
        Update: {
          criado_em?: string | null
          depoimento_id?: string | null
          franqueada_id?: string
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          input?: Json
          latencia_ms?: number | null
          modo?: string
          output?: Json
          status?: string | null
          versao_ad_125?: string | null
          versao_post_curto?: string | null
          versao_post_longo?: string | null
          versao_reels_script?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storytellings_gerados_depoimento_id_fkey"
            columns: ["depoimento_id"]
            isOneToOne: false
            referencedRelation: "depoimentos_franqueada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storytellings_gerados_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      tendencias_diarias: {
        Row: {
          angulo_sugerido: string | null
          criado_em: string | null
          data_ref: string
          fonte: string
          hashtags_sugeridas: string[] | null
          id: string
          metadata: Json | null
          nicho: string
          relevancia_icp: number | null
          resumo: string | null
          tema: string
          url_referencia: string | null
        }
        Insert: {
          angulo_sugerido?: string | null
          criado_em?: string | null
          data_ref: string
          fonte: string
          hashtags_sugeridas?: string[] | null
          id?: string
          metadata?: Json | null
          nicho: string
          relevancia_icp?: number | null
          resumo?: string | null
          tema: string
          url_referencia?: string | null
        }
        Update: {
          angulo_sugerido?: string | null
          criado_em?: string | null
          data_ref?: string
          fonte?: string
          hashtags_sugeridas?: string[] | null
          id?: string
          metadata?: Json | null
          nicho?: string
          relevancia_icp?: number | null
          resumo?: string | null
          tema?: string
          url_referencia?: string | null
        }
        Relationships: []
      }
      tracao_conteudo: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          franqueada_id: string
          hooks_gerados: Json | null
          ia_custo_usd: number | null
          ia_modelo: string | null
          ia_tokens_cached: number | null
          ia_tokens_input: number | null
          ia_tokens_output: number | null
          id: string
          input: Json
          latencia_ms: number | null
          output: Json
          pilares_tracao: Json | null
          plano_semanal: Json | null
          regerado_apos_violacao: boolean | null
          status: string | null
          tipo: string
          vigente_ate: string | null
          vocabulario_violacoes: Json | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          franqueada_id: string
          hooks_gerados?: Json | null
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          input: Json
          latencia_ms?: number | null
          output: Json
          pilares_tracao?: Json | null
          plano_semanal?: Json | null
          regerado_apos_violacao?: boolean | null
          status?: string | null
          tipo: string
          vigente_ate?: string | null
          vocabulario_violacoes?: Json | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          franqueada_id?: string
          hooks_gerados?: Json | null
          ia_custo_usd?: number | null
          ia_modelo?: string | null
          ia_tokens_cached?: number | null
          ia_tokens_input?: number | null
          ia_tokens_output?: number | null
          id?: string
          input?: Json
          latencia_ms?: number | null
          output?: Json
          pilares_tracao?: Json | null
          plano_semanal?: Json | null
          regerado_apos_violacao?: boolean | null
          status?: string | null
          tipo?: string
          vigente_ate?: string | null
          vocabulario_violacoes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tracao_conteudo_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
      videos_franqueada: {
        Row: {
          altura_px: number | null
          ativo: boolean | null
          criado_em: string | null
          descricao: string | null
          duracao_seg: number | null
          fonte: string | null
          franqueada_id: string
          id: string
          largura_px: number | null
          pexels_video_id: string | null
          tags: string[]
          thumbnail_url: string | null
          titulo: string
          url: string
          usado_quantas_vezes: number | null
        }
        Insert: {
          altura_px?: number | null
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          duracao_seg?: number | null
          fonte?: string | null
          franqueada_id: string
          id?: string
          largura_px?: number | null
          pexels_video_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          titulo: string
          url: string
          usado_quantas_vezes?: number | null
        }
        Update: {
          altura_px?: number | null
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          duracao_seg?: number | null
          fonte?: string | null
          franqueada_id?: string
          id?: string
          largura_px?: number | null
          pexels_video_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          titulo?: string
          url?: string
          usado_quantas_vezes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_franqueada_franqueada_id_fkey"
            columns: ["franqueada_id"]
            isOneToOne: false
            referencedRelation: "franqueadas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

