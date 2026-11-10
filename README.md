# Painel de monitoramento

Site em JavaScript com as abas Resumo, Comportamento, Motor ocioso, Permanência, Conectividade e Câmeras.

O Resumo é a primeira aba: a semana de segunda a domingo (a última fechada antes de hoje), comparada com a segunda a
domingo anterior, usando só os mesmos dias da semana que já têm dados, com diagnóstico, "O que pede atenção" e as maiores permanências. Usa os mesmos dados das outras
abas, então se atualiza junto com elas. No comportamento, só contam os dias que leves e pesadas já têm.
O motor ocioso guarda o período todo dia a dia por veículo (`ultDias`, `dl`, `do`), usado pelo Resumo e pelo filtro Dia da aba.
O acesso é por login: cada usuário só consegue abrir os dados dos processos do grupo dele.

- `index.html`: página, tela de login e estilos
- `login.js`: confere usuário e senha e destranca os dados do grupo no navegador
- `app.js`: monta as abas, gráficos e tabelas
- `acesso.js`: dados criptografados por grupo (gerado, não editar à mão)
- `ferramentas/gerar_acesso.py`: gera o `acesso.js` a partir da planilha de cadastros

## Como funciona o controle de acesso

A planilha `cadastros.xlsx` (fica só no computador, nunca no repositório) tem as colunas
USUARIO, PROCESSO e SENHA. PROCESSO = `todos` vê tudo; vários processos são separados por `;`.
Ao gerar, frota sem processo numa aba e com processo em outra recebe o processo da outra aba
(o que aparece em mais abas; empate: Conectividade, Comportamental, Motor ocioso, Permanência, Câmeras).
Para corrigir um processo errado, use `ferramentas/processos_frotas.json`, que tem prioridade.
Ocorrências do Comportamental resolvidas de forma errada saem por `ferramentas/ocorrencias_excluidas.json`.
Senhas precisam de pelo menos 10 caracteres.

Os dados de cada grupo são trancados com AES-256-GCM, e a chave do grupo é trancada com a
senha de cada usuário (PBKDF2-SHA256, 600 mil iterações). O `acesso.js` público não contém
senhas, nomes de usuário nem dados legíveis.

Atualizar usuários ou dados:

    python ferramentas/gerar_acesso.py cadastros.xlsx dados-fonte.json acesso.js

## Frotas excluídas

`ferramentas/frotas_excluidas.json` lista as frotas que ficam fora de todas as abas (inativas ou
equipamentos que não contam, ex.: 961313 e ZZSEE4G55). `gerar_acesso.py` e `cameras.py` leem essa
lista; a constante `EXCLUIR` do `app.js` (leitura de arquivos no navegador) deve ficar igual.

## Fontes dos dados

- Motor ocioso: arquivo diário "Boletim do Veículo" (um dia por arquivo), com `ferramentas/ociosidade.py`
  (`boletim` guarda TEMPO IGNIÇÃO LIGADA e PARADO LIGADO por veículo e dia em `ociosidade_base.json`, na
  pasta local; `montar` aplica a regra do relatório: PARADO LIGADO / TEMPO IGNIÇÃO LIGADA, só grupo
  VEÍCULOS LEVES, processo e responsável pelo cadastro de frotas). Mesmos números do Power BI
  "Ociosidade Frota Leve" (o `ociosidade_do_powerbi.py` antigo continua no repositório).
- Motor ocioso e Permanência têm filtro Dia (um dia específico) além do período todo.
- Permanência (desde 10/11/2026): base bruta de alertas, pasta "COA - BASE DE DADOS MONITORAMENTO
  COMPORTAMENTAL" (um CSV Historico_Alertas por dia), só eventos PERMANENCIA_CERCA e PERMANENCIA_PONTO:

      python ferramentas/permanencia_dos_csv.py "<pasta COA - BASE DE DADOS MONITORAMENTO COMPORTAMENTAL>" dados-fonte.json

  Incremental: lê só os CSVs novos ou alterados (base em painel-dados/permanencia_base.json); `--geral`
  relê tudo, só quando o usuário pedir.

Regra geral (10/11/2026): toda atualização lê só os arquivos novos, para economizar dados; atualização
geral só quando o usuário pedir.

- Permanência (até 09/11/2026): mapa de calor com dados reais da tabela Ocorrências (eventos PERMANENCIA_CERCA e
  PERMANENCIA_PONTO) do mesmo Power BI, extraídos com `ferramentas/permanencia_do_powerbi.py`.
  O local é a coluna CERCA ELETRÔNICA (sem cerca, usa o ponto de referência). Não leva motorista
  nem CPF; alarmes falsos e pontos de Liberação ficam de fora. Mapa com Leaflet (CDN) e camada de calor própria.
- Conectividade: base diária por veículo (`ferramentas/conectividade.py`), iniciada pelo Power BI "Conectividade"
  e atualizada com o arquivo "Localização da Frota" exportado do vFleets. Regras do BI: inativos fora, apelido
  MANUTENÇÃO/PARADO, OFFLINE com 2 dias ou mais sem conexão, processo pela tabela Frotas. O último dia é a
  referência para manutenção/parado; a planilha local `status_frotas.xlsx` informa quem entrou (PARADO/MANUTENÇÃO)
  ou saiu (OPERANDO). A base em texto puro fica só na pasta local do usuário (painel-dados).
  A cada atualização, `conectividade.py planilha` refaz a `status_frotas.xlsx` com as colunas FROTA, STATUS,
  DIAS OFFLINE, RESPONSÁVEL e OBSERVAÇÃO: os equipamentos em manutenção, parados ou offline 2+ dias, com o
  STATUS da última atualização para o usuário conferir (OFFLINE não muda nada; PARADO, MANUTENÇÃO e OPERANDO
  valem). A data em que um status passou a valer fica guardada na base (`manual_desde`).
- Comportamento (desde 10/11/2026): planilha "Ocorrências monitoramento comportamental Nova..xlsx"
  (abas Frota Leve, Frota Pesada e BASE DE INFORMAÇÃO), com `ferramentas/comportamento_da_planilha.py`:

      python ferramentas/comportamento_da_planilha.py "Ocorrências monitoramento comportamental Nova..xlsx" dados-fonte.json

  Ultrapassagem em faixa contínua não tem tipo próprio: conta a linha cujo ULTIMO_COMENTARIO é
  "ALARME VERDADEIRO - ULTRAPASSAGEM EM FAIXA CONTÍNUA", qualquer que seja o TIPO.
  Cada ocorrência guarda o turno pela HORA (5º item do `ev`: 0 = A 07:00–15:10, 1 = B 15:10–23:10,
  2 = C 23:10–07:00) e a hora cheia (6º item, 0–23). O Resumo mostra o balanço por turno da semana,
  comparado com a semana anterior, e logo abaixo as horas de pico (gráfico das 24 horas e as 3 maiores).
- Comportamento (até 09/11/2026): dados reais dos Power BI "Dados Monitoramento Comportamental Frotas Leves 2026"
  (tabela OCORRÊNCIAS FROTA LEVA PO.GE.03) e "... Frotas Pesadas 2026" (tabela Frota Pesada POLGE03),
  extraídos com `ferramentas/comportamento_do_powerbi.py`. Excesso de velocidade nas faixas da nova
  política (até 20%, 20% a 50%, acima de 50%). O processo da frota pesada vem da aba
  BASE DE INFORMAÇÃO da planilha "Ocorrências monitoramento 2026.B". Não leva motorista nem CPF.
  Ultrapassagem em faixa contínua vem das tabelas de e-mail ("Email enviado PO.GE.03" no PBI leves,
  "Notificação de email POL.GE.03" no PBI pesadas), com `comportamento_do_powerbi.py --faixa`, depois
  da extração principal.
- Câmeras: visualizador só do dia (sem histórico), alimentado pelo CSV "Saúde do Veículo - Análise"
  exportado do sistema, com `ferramentas/cameras.py`. Um quadro por tipo de câmera (motorista, pista,
  auditoria) e a lista de veículos com defeito ("Sim" ou quantidade acima de zero). O processo vem do
  cadastro de frotas já presente no dados-fonte.json, pelo prefixo. Na lista, a coluna Observação
  (Câmera ok, Intermitência temporária, Erro no relatório, Defeito confirmado) fica salva no navegador
  de quem marcou e vale para o relatório daquele dia; as três primeiras tiram a linha das pendências.

      python ferramentas/cameras.py "Saude_do_Veiculo_-_Analise_....csv" dados-fonte.json
      python ferramentas/gerar_acesso.py cadastros.xlsx dados-fonte.json acesso.js

## Atualização automática (pasta de envio)

Qualquer usuário pode atualizar as abas Conectividade e Câmeras. No fim de cada aba, "Carregar arquivo"
lê o arquivo exportado no próprio navegador e mostra a aba atualizada na hora, só para quem carregou
(mesmas regras dos scripts; na conectividade, parado/manutenção continuam como no último dia, sem
consultar a planilha). Para todos verem, o botão "Enviar para todos" leva à pasta `painel-dados/entrada` (link "Solicitar arquivos" do OneDrive,
constante `LINK_ENVIO` em `app.js`). Lá vão, sem mudar o nome, o "Localização da Frota" (vFleets)
e o "Saúde do Veículo - Análise" (Platform Science).

Uma tarefa agendada confere a pasta de exportação (EXPORTAR PASTAS, no OneDrive do COA) às 11h, 13h e 14h, em dias úteis. Para cada arquivo novo
(controle em `painel-dados/entrada_processados.json`) roda `conectividade.py vfleets` + `montar` ou
`cameras.py`, depois `gerar_acesso.py`, e publica o `acesso.js`. Depende do computador ligado.
