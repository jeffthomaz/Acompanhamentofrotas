# Painel de monitoramento

Site em JavaScript com as abas Comportamento, Motor ocioso, Permanência, Conectividade e Câmeras.
O acesso é por login: cada usuário só consegue abrir os dados dos processos do grupo dele.

- `index.html`: página, tela de login e estilos
- `login.js`: confere usuário e senha e destranca os dados do grupo no navegador
- `app.js`: monta as abas, gráficos e tabelas
- `acesso.js`: dados criptografados por grupo (gerado, não editar à mão)
- `ferramentas/gerar_acesso.py`: gera o `acesso.js` a partir da planilha de cadastros

## Como funciona o controle de acesso

A planilha `cadastros.xlsx` (fica só no computador, nunca no repositório) tem as colunas
USUARIO, PROCESSO e SENHA. PROCESSO = `todos` vê tudo; vários processos são separados por `;`.
Senhas precisam de pelo menos 10 caracteres.

Os dados de cada grupo são trancados com AES-256-GCM, e a chave do grupo é trancada com a
senha de cada usuário (PBKDF2-SHA256, 600 mil iterações). O `acesso.js` público não contém
senhas, nomes de usuário nem dados legíveis.

Atualizar usuários ou dados:

    python ferramentas/gerar_acesso.py cadastros.xlsx dados-fonte.json acesso.js

## Fontes dos dados

- Motor ocioso: dados reais do Power BI "Ociosidade Frota Leve" (veículos leves), extraídos com a
  consulta DAX descrita em `ferramentas/ociosidade_do_powerbi.py`. Filtrada por processo para cada grupo.
- Permanência: mapa de calor com dados reais da tabela Ocorrências (eventos PERMANENCIA_CERCA e
  PERMANENCIA_PONTO) do mesmo Power BI, extraídos com `ferramentas/permanencia_do_powerbi.py`.
  O local é a coluna CERCA ELETRÔNICA (sem cerca, usa o ponto de referência). Não leva motorista
  nem CPF; alarmes falsos e pontos de Liberação ficam de fora. Mapa com Leaflet (CDN) e camada de calor própria.
- Conectividade: base diária por veículo (`ferramentas/conectividade.py`), iniciada pelo Power BI "Conectividade"
  e atualizada com o arquivo "Localização da Frota" exportado do vFleets. Regras do BI: inativos fora, apelido
  MANUTENÇÃO/PARADO, OFFLINE com 2 dias ou mais sem conexão, processo pela tabela Frotas. O último dia é a
  referência para manutenção/parado; a planilha local `status_frotas.xlsx` informa quem entrou (PARADO/MANUTENÇÃO)
  ou saiu (OPERANDO). A base em texto puro fica só na pasta local do usuário (painel-dados).
- Comportamento: dados reais dos Power BI "Dados Monitoramento Comportamental Frotas Leves 2026"
  (tabela OCORRÊNCIAS FROTA LEVA PO.GE.03) e "... Frotas Pesadas 2026" (tabela Frota Pesada POLGE03),
  extraídos com `ferramentas/comportamento_do_powerbi.py`. Excesso de velocidade nas faixas da nova
  política (até 20%, 20% a 50%, acima de 50%). O processo da frota pesada vem da aba
  BASE DE INFORMAÇÃO da planilha "Ocorrências monitoramento 2026.B". Não leva motorista nem CPF.
- Câmeras: visualizador só do dia (sem histórico), alimentado pelo CSV "Saúde do Veículo - Análise"
  exportado do sistema, com `ferramentas/cameras.py`. Um quadro por tipo de câmera (motorista, pista,
  auditoria) e a lista de veículos com defeito ("Sim" ou quantidade acima de zero). O processo vem do
  cadastro de frotas já presente no dados-fonte.json, pelo prefixo. Na lista, a coluna Observação
  (Câmera ok, Intermitência temporária, Erro no relatório, Defeito confirmado) fica salva no navegador
  de quem marcou e vale para o relatório daquele dia; as três primeiras tiram a linha das pendências.

      python ferramentas/cameras.py "Saude_do_Veiculo_-_Analise_....csv" dados-fonte.json
      python ferramentas/gerar_acesso.py cadastros.xlsx dados-fonte.json acesso.js
