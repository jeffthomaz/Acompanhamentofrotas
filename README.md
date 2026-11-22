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
Responsável informado frota a frota (desde 16/11/2026, ex.: frotas do Cristiano Colucci) fica em
`ferramentas/responsaveis_frotas.json` e tem prioridade sobre o responsável fixo do processo e o cadastro (vazio = sem responsável).
Responsável fixo por processo (Transporte = Ednaldo, Tratos Culturais = Ghetter, Facilities = Fernando Azevedo,
desde 13/11/2026) fica em `ferramentas/responsaveis_processo.json` e vale sobre o cadastro em todas as abas e na status_frotas.
Ocorrências do Comportamental resolvidas de forma errada saem por `ferramentas/ocorrencias_excluidas.json`.
Senhas precisam de pelo menos 10 caracteres.

Os dados de cada grupo são trancados com AES-256-GCM, e a chave do grupo é trancada com a
senha de cada usuário (PBKDF2-SHA256, 600 mil iterações). O `acesso.js` público não contém
senhas, nomes de usuário nem dados legíveis.

Atualizar usuários ou dados:

    python ferramentas/gerar_acesso.py cadastros.xlsx dados-fonte.json acesso.js

## Frotas ativas e inativas no Motor ocioso

Desde 22/11/2026 a aba Motor ocioso mostra, em qualquer filtro de período, processo ou hierarquia, quantos dos
veículos leves estão ativos e quantos inativos (ex.: "155 veículos leves (139 ativos, 16 inativos)"). A fonte é
`ferramentas/frotas_ativas.json` (SIM/NÃO da tabela unificada, corrigida pelo usuário); `gerar_acesso.py` marca
`inativa: 1` nos veículos com NÃO. Frota fora da lista conta como ativa.

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
  referência para manutenção/parado; a planilha `status_frotas.xlsx` (desde 11/11/2026 na pasta
  `...\DP-AGR-COA - COA\Monitoramento\Safra 2026\SAFRA 2026 MONIT COMPORTAMENTAL`) informa quem entrou (PARADO/MANUTENÇÃO)
  ou saiu (OPERANDO). A base em texto puro fica só na pasta local do usuário (painel-dados).
  A cada atualização, `conectividade.py planilha` refaz a `status_frotas.xlsx` com as colunas FROTA, STATUS,
  DIAS OFFLINE, RESPONSÁVEL e OBSERVAÇÃO: os equipamentos em manutenção, parados ou offline 2+ dias, com o
  STATUS da última atualização para o usuário conferir (OFFLINE não muda nada; PARADO, MANUTENÇÃO e OPERANDO
  valem). A data em que um status passou a valer fica guardada na base (`manual_desde`).
- Comportamento (desde 10/11/2026): planilha "Ocorrências monitoramento comportamental Nova..xlsx"
  (abas Frota Leve, Frota Pesada e BASE DE INFORMAÇÃO), com `ferramentas/comportamento_da_planilha.py`:

      python ferramentas/comportamento_da_planilha.py "Ocorrências monitoramento comportamental Nova..xlsx" dados-fonte.json

  02/01 a 31/07/2026 (teste de 11/11/2026): vêm da planilha antiga "Ocorrências monitoramento 2026.xlsx", juntadas
  uma vez com `ferramentas/comportamento_historico_2026.py`. A planilha Nova começa em 01/08, então as atualizações
  normais mantêm esses dias (contagens e pontos do mapa de calor) e usam o processo atual de cada frota.

  Mapa de calor (aba Comportamental, no fim): latitude/longitude e local (cerca, ou via + cidade) de cada
  ocorrência, sem bocejo; o gerar_acesso.py compacta em células de ~500 m, faixas de período e grupos
  (tipo de frota, processo, gerência) em comportamento.mapa.
  Ultrapassagem em faixa contínua não tem tipo próprio: conta a linha cujo ULTIMO_COMENTARIO é
  "ALARME VERDADEIRO - ULTRAPASSAGEM EM FAIXA CONTÍNUA", qualquer que seja o TIPO.
  Cada ocorrência guarda o turno pela HORA (5º item do `ev`: 0 = A 07:00–15:10, 1 = B 15:10–23:10,
  2 = C 23:10–07:00) e a hora cheia (6º item, 0–23). O Resumo mostra o balanço por turno da semana,
  comparado com a semana anterior, e logo abaixo as horas de pico (gráfico das 24 horas e as 3 maiores).
  Desde 16/11/2026 os quadros de turno e de horas de pico ficam logo abaixo dos cards, no Resumo e no Comportamental.

## Filtro de período

- **Últimos 7 dias**: de ontem (D-1) até 7 dias atrás (D-7), pela data de hoje (os dados chegam sempre D-1).
- **Resumo (semana do WhatsApp)**: a última semana fechada, de segunda a domingo, igual à mensagem semanal.
- Últimas 4 semanas, Todo o período e Escolher datas continuam como antes.
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

## Botão "Atualizar dados" (desde 15/11/2026)

- Aparece só para usuários com `ATUALIZA = SIM` na planilha de cadastros (coluna opcional).
- O usuário escolhe uma vez, no computador dele (Chrome ou Edge), as **duas pastas** de onde vêm os dados:
  a do Comportamental (**SAFRA 2026 MONIT COMPORTAMENTAL**, com a planilha Nova e a EXPORTAR PASTAS) e a dos
  alertas (**COA - BASE DE DADOS MONITORAMENTO COMPORTAMENTAL**). Cada uma pelo link "escolher" abaixo do botão;
  o navegador guarda as duas. Ao clicar, `painel-atualizar.js` lê dali só o que mudou (planilha Nova do Comportamental, alertas de
  permanência novos, Boletins do Veículo novos, Localização da Frota e Saúde do Veículo mais recentes e a status_frotas.xlsx), **tira os dados pessoais no próprio navegador**
  (motorista, CPF, documento, comentários; cercas com nome de pessoa viram iniciais, com as regras de
  `ferramentas/regras_locais.json`, as mesmas do Python) e grava `entrada/pedido.json.gz` no repositório
  **privado** `jeffthomaz/painel-frotas-dados`.
- O botão **lê** a status_frotas.xlsx (vale o que o usuário marcou) e, desde 16/11/2026, **grava de volta** a
  planilha refeita pelo servidor (manutenção, parados e offline há 2 dias ou mais, mantendo STATUS e observações
  da equipe). Só grava se a planilha não mudou durante a atualização e não está aberta no Excel; o navegador pede
  permissão para editar a pasta. A refeita fica em `base/status_frotas.xlsx` do repositório privado e as assinaturas
  (SHA-256) em `base/indice.json`, para o botão não reprocessar a Conectividade à toa.
- Lá, o workflow `atualizar.yml` roda `ferramentas/atualizar_da_entrada.py` (os mesmos scripts de sempre),
  regera `acesso.js` com `gerar_acesso.py --dados` (chaves dos grupos em `base/chaves_grupos.json`, sem
  senhas) e publica aqui. Testado em 15/11/2026: o resultado é idêntico ao de rodar os scripts direto nas planilhas.
- Token do botão: *fine-grained*, só do repositório `painel-frotas-dados`, com **Contents** e **Actions**
  em Read and write. Fica em `token_atualizar.txt` (pasta painel-dados do computador; nunca em repositório)
  e vai para `acesso.js` trancado com a senha de cada usuário autorizado.
- O workflow publica com o segredo `PUBLICAR_TOKEN` do repositório privado (token só deste repositório,
  Contents: Read and write).
- **A base oficial passou a ser o repositório privado** (`base/`). As atualizações feitas na conversa e a
  atualização automática das 12h e 13h leem e gravam lá; a pasta painel-dados do computador vira cópia.
