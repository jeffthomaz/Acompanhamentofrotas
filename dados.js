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

  // Monitoramento comportamental: eventos no período e horas operadas
  comportamento: {
    pesos: { vel: 3, freada: 2, acel: 2, curva: 1.5 },
    tipos: { vel: "Excesso de velocidade", freada: "Frenagem brusca", acel: "Aceleração brusca", curva: "Curva brusca" },
    porEquip: {
      "TR-01": { vel: 4,  freada: 6,  acel: 3,  curva: 2, horas: 68 },
      "TR-02": { vel: 9,  freada: 11, acel: 7,  curva: 5, horas: 73 },
      "TR-03": { vel: 1,  freada: 2,  acel: 1,  curva: 0, horas: 57 },
      "TR-04": { vel: 5,  freada: 7,  acel: 4,  curva: 3, horas: 64 },
      "CM-01": { vel: 12, freada: 9,  acel: 8,  curva: 6, horas: 80 },
      "CM-02": { vel: 18, freada: 15, acel: 13, curva: 9, horas: 76 },
      "CM-03": { vel: 3,  freada: 4,  acel: 2,  curva: 1, horas: 85 },
      "CM-04": { vel: 8,  freada: 10, acel: 6,  curva: 7, horas: 67 }
    },
    eventosPorDia: [38, 42, 35, 47, 41, 29, 33]
  },

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
