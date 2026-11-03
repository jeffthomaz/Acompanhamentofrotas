// DADOS DE EXEMPLO. Substitua por dados reais quando a fonte estiver definida.
window.DADOS = {
  exemplo: true,
  periodo: "28/10/2026 a 03/11/2026",
  equipamentos: [
    { id: "TR-01", tipo: "Trator" },   { id: "TR-02", tipo: "Trator" },
    { id: "TR-03", tipo: "Trator" },   { id: "TR-04", tipo: "Trator" },
    { id: "CM-01", tipo: "Caminhão" }, { id: "CM-02", tipo: "Caminhão" },
    { id: "CM-03", tipo: "Caminhão" }, { id: "CM-04", tipo: "Caminhão" }
  ],
  dias: ["28/10", "29/10", "30/10", "31/10", "01/11", "02/11", "03/11"],

  // Ocorrências comportamentais. Estrutura (processo, responsável, nº de veículos) vem da planilha FROTAS;
  // as contagens são FICTÍCIAS e os responsáveis estão anonimizados enquanto o repositório for público.
  ocorrencias: {"tipos": [{"id": "vel1", "nome": "Até 20%", "grupo": "vel"}, {"id": "vel2", "nome": "De 20% até 50%", "grupo": "vel"}, {"id": "vel3", "nome": "Acima de 50%", "grupo": "vel"}, {"id": "celular", "nome": "Uso de celular"}, {"id": "cinto", "nome": "Sem cinto de segurança"}, {"id": "distracao", "nome": "Distração"}, {"id": "cigarro", "nome": "Uso de cigarro"}, {"id": "faixa", "nome": "Ultrapassagem em faixa contínua"}], "linhas": [
      {"processo": "APOIO BENFEITORIAS E FAZENDAS", "responsavel": "Responsável 18", "frotas": 1, "vel1": 1, "vel2": 2, "vel3": 0, "celular": 0, "cinto": 0, "distracao": 0, "cigarro": 1, "faixa": 0},
      {"processo": "AUTOMAÇÃO", "responsavel": "Responsável 16", "frotas": 2, "vel1": 8, "vel2": 2, "vel3": 3, "celular": 1, "cinto": 3, "distracao": 3, "cigarro": 1, "faixa": 1},
      {"processo": "COA", "responsavel": "Responsável 13", "frotas": 3, "vel1": 7, "vel2": 3, "vel3": 3, "celular": 2, "cinto": 3, "distracao": 4, "cigarro": 1, "faixa": 2},
      {"processo": "COMPRAS/AMOXARIFADO", "responsavel": "Responsável 12", "frotas": 3, "vel1": 10, "vel2": 3, "vel3": 1, "celular": 3, "cinto": 3, "distracao": 4, "cigarro": 2, "faixa": 1},
      {"processo": "DISTRIBUIÇÃO DE VINHAÇA", "responsavel": "Responsável 02", "frotas": 12, "vel1": 30, "vel2": 17, "vel3": 5, "celular": 5, "cinto": 14, "distracao": 13, "cigarro": 6, "faixa": 6},
      {"processo": "EXPERIMENTAÇÃO", "responsavel": "Responsável 10", "frotas": 6, "vel1": 18, "vel2": 0, "vel3": 1, "celular": 3, "cinto": 9, "distracao": 6, "cigarro": 3, "faixa": 1},
      {"processo": "FACILITIES", "responsavel": "Responsável 03", "frotas": 27, "vel1": 65, "vel2": 29, "vel3": 12, "celular": 20, "cinto": 22, "distracao": 31, "cigarro": 8, "faixa": 9},
      {"processo": "INDÚSTRIA", "responsavel": "Responsável 24", "frotas": 1, "vel1": 2, "vel2": 0, "vel3": 0, "celular": 0, "cinto": 2, "distracao": 1, "cigarro": 0, "faixa": 0},
      {"processo": "INDÚSTRIA", "responsavel": "Responsável 22", "frotas": 1, "vel1": 2, "vel2": 0, "vel3": 1, "celular": 0, "cinto": 1, "distracao": 1, "cigarro": 0, "faixa": 1},
      {"processo": "INDÚSTRIA", "responsavel": "Responsável 21", "frotas": 1, "vel1": 2, "vel2": 1, "vel3": 0, "celular": 0, "cinto": 0, "distracao": 0, "cigarro": 0, "faixa": 0},
      {"processo": "INDÚSTRIA", "responsavel": "Responsável 20", "frotas": 1, "vel1": 2, "vel2": 0, "vel3": 0, "celular": 0, "cinto": 2, "distracao": 1, "cigarro": 0, "faixa": 1},
      {"processo": "INDÚSTRIA", "responsavel": "Responsável 27", "frotas": 1, "vel1": 2, "vel2": 2, "vel3": 0, "celular": 1, "cinto": 1, "distracao": 1, "cigarro": 0, "faixa": 1},
      {"processo": "INDÚSTRIA", "responsavel": "Responsável 17", "frotas": 1, "vel1": 1, "vel2": 1, "vel3": 0, "celular": 0, "cinto": 1, "distracao": 1, "cigarro": 0, "faixa": 1},
      {"processo": "INDÚSTRIA", "responsavel": "Responsável 26", "frotas": 1, "vel1": 1, "vel2": 2, "vel3": 0, "celular": 0, "cinto": 0, "distracao": 0, "cigarro": 1, "faixa": 1},
      {"processo": "M.D.O APOIO A COLHEITA", "responsavel": "Responsável 04", "frotas": 25, "vel1": 56, "vel2": 34, "vel3": 12, "celular": 12, "cinto": 21, "distracao": 32, "cigarro": 8, "faixa": 6},
      {"processo": "MANUTENÇÃO AUTOMOTIVA", "responsavel": "Responsável 09", "frotas": 6, "vel1": 14, "vel2": 9, "vel3": 3, "celular": 4, "cinto": 5, "distracao": 7, "cigarro": 0, "faixa": 3},
      {"processo": "MANUTENÇÃO AUTOMOTIVA", "responsavel": "Responsável 11", "frotas": 3, "vel1": 9, "vel2": 2, "vel3": 0, "celular": 2, "cinto": 4, "distracao": 2, "cigarro": 1, "faixa": 0},
      {"processo": "MANUTENÇÃO AUTOMOTIVA", "responsavel": "Responsável 25", "frotas": 1, "vel1": 2, "vel2": 1, "vel3": 1, "celular": 1, "cinto": 2, "distracao": 1, "cigarro": 1, "faixa": 1},
      {"processo": "MANUTENÇÃO AUTOMOTIVA", "responsavel": "Responsável 05", "frotas": 16, "vel1": 30, "vel2": 12, "vel3": 8, "celular": 12, "cinto": 14, "distracao": 18, "cigarro": 6, "faixa": 5},
      {"processo": "MANUTENÇÃO AUTOMOTIVA", "responsavel": "Responsável 07", "frotas": 10, "vel1": 25, "vel2": 18, "vel3": 8, "celular": 11, "cinto": 9, "distracao": 15, "cigarro": 2, "faixa": 3},
      {"processo": "MANUTENÇÃO AUTOMOTIVA", "responsavel": "Sem responsável", "frotas": 5, "vel1": 13, "vel2": 5, "vel3": 2, "celular": 2, "cinto": 5, "distracao": 6, "cigarro": 3, "faixa": 4},
      {"processo": "PULVERIZADORES", "responsavel": "Responsável 23", "frotas": 1, "vel1": 0, "vel2": 2, "vel3": 0, "celular": 0, "cinto": 1, "distracao": 1, "cigarro": 0, "faixa": 1},
      {"processo": "PULVERIZADORES", "responsavel": "Responsável 06", "frotas": 12, "vel1": 31, "vel2": 13, "vel3": 5, "celular": 8, "cinto": 8, "distracao": 16, "cigarro": 2, "faixa": 6},
      {"processo": "SESMT", "responsavel": "Responsável 15", "frotas": 2, "vel1": 1, "vel2": 2, "vel3": 0, "celular": 0, "cinto": 3, "distracao": 0, "cigarro": 1, "faixa": 1},
      {"processo": "Sem processo", "responsavel": "Sem responsável", "frotas": 1, "vel1": 1, "vel2": 0, "vel3": 0, "celular": 0, "cinto": 0, "distracao": 2, "cigarro": 0, "faixa": 1},
      {"processo": "TRANSPORTE", "responsavel": "Responsável 01", "frotas": 75, "vel1": 168, "vel2": 83, "vel3": 42, "celular": 55, "cinto": 64, "distracao": 92, "cigarro": 26, "faixa": 27},
      {"processo": "TRATOS", "responsavel": "Responsável 14", "frotas": 3, "vel1": 0, "vel2": 2, "vel3": 0, "celular": 1, "cinto": 0, "distracao": 1, "cigarro": 0, "faixa": 0},
      {"processo": "TRATOS", "responsavel": "Responsável 02", "frotas": 17, "vel1": 22, "vel2": 12, "vel3": 4, "celular": 5, "cinto": 15, "distracao": 15, "cigarro": 5, "faixa": 4},
      {"processo": "TRATOS", "responsavel": "Responsável 19", "frotas": 1, "vel1": 3, "vel2": 2, "vel3": 1, "celular": 1, "cinto": 1, "distracao": 1, "cigarro": 1, "faixa": 0},
      {"processo": "TRATOS", "responsavel": "Responsável 08", "frotas": 10, "vel1": 8, "vel2": 3, "vel3": 0, "celular": 3, "cinto": 4, "distracao": 0, "cigarro": 4, "faixa": 0},
      {"processo": "VINHAÇA", "responsavel": "Responsável 02", "frotas": 17, "vel1": 49, "vel2": 22, "vel3": 7, "celular": 11, "cinto": 22, "distracao": 23, "cigarro": 6, "faixa": 5}]},

  // Motor ocioso: média diária de horas com motor ligado e parado
  motorOcioso: {
    metaPct: 15,
    porEquip: {
      "TR-01": { ligado: 9.8,  ocioso: 1.2 },
      "TR-02": { ligado: 10.4, ocioso: 2.9 },
      "TR-03": { ligado: 8.1,  ocioso: 0.7 },
      "TR-04": { ligado: 9.2,  ocioso: 1.9 },
      "CM-01": { ligado: 11.5, ocioso: 1.4 },
      "CM-02": { ligado: 10.9, ocioso: 3.6 },
      "CM-03": { ligado: 12.2, ocioso: 1.1 },
      "CM-04": { ligado: 9.6,  ocioso: 2.2 }
    },
    pctPorDia: [16.2, 15.1, 17.8, 14.9, 15.6, 18.3, 14.4]
  },

  // Tempo de permanência por local (minutos)
  permanencia: {
    locais: [
      { nome: "Portaria",               visitas: 74, mediaMin: 6,   limiteMin: 10 },
      { nome: "Posto de abastecimento", visitas: 31, mediaMin: 14,  limiteMin: 20 },
      { nome: "Área de carregamento",   visitas: 58, mediaMin: 27,  limiteMin: 30 },
      { nome: "Pátio",                  visitas: 46, mediaMin: 38,  limiteMin: 60 },
      { nome: "Oficina",                visitas: 12, mediaMin: 142, limiteMin: 180 }
    ],
    estadias: [
      { equip: "CM-02", local: "Área de carregamento",   entrada: "03/11 08:12", min: 52 },
      { equip: "TR-02", local: "Pátio",                  entrada: "03/11 07:40", min: 74 },
      { equip: "CM-01", local: "Posto de abastecimento", entrada: "03/11 07:05", min: 18 },
      { equip: "TR-04", local: "Oficina",                entrada: "02/11 14:30", min: 215 },
      { equip: "CM-04", local: "Portaria",               entrada: "03/11 06:48", min: 12 },
      { equip: "CM-03", local: "Área de carregamento",   entrada: "03/11 06:20", min: 24 },
      { equip: "TR-01", local: "Pátio",                  entrada: "02/11 18:02", min: 41 },
      { equip: "CM-02", local: "Posto de abastecimento", entrada: "02/11 16:15", min: 27 },
      { equip: "TR-03", local: "Oficina",                entrada: "02/11 09:10", min: 128 },
      { equip: "CM-01", local: "Portaria",               entrada: "02/11 05:55", min: 5 }
    ]
  }
};
