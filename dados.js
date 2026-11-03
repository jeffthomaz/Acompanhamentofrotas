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
  // d: ocorrências por dia (7 dias, alinhado a 'dias'); ant: total do período anterior; sem: 3 semanas anteriores.
  ocorrencias: {
    tipos: [{"id":"vel1","nome":"Até 20%","grupo":"vel"},{"id":"vel2","nome":"De 20% até 50%","grupo":"vel"},{"id":"vel3","nome":"Acima de 50%","grupo":"vel"},{"id":"celular","nome":"Uso de celular"},{"id":"cinto","nome":"Sem cinto de segurança"},{"id":"distracao","nome":"Distração"},{"id":"cigarro","nome":"Uso de cigarro"},{"id":"faixa","nome":"Ultrapassagem em faixa contínua"}],
    linhas: [
      {"processo":"APOIO BENFEITORIAS E FAZENDAS","responsavel":"Responsável 18","frotas":1,"d":{"vel1":[0,0,1,0,0,0,0],"vel2":[1,0,0,0,1,0,0],"vel3":[0,0,1,0,0,0,0],"celular":[0,0,0,0,0,0,0],"cinto":[0,0,0,0,0,0,0],"distracao":[0,0,0,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,1,0,0,0]},"ant":{"vel1":1,"vel2":2,"vel3":1,"celular":0,"cinto":0,"distracao":0,"cigarro":0,"faixa":1},"sem":[5,5,5]},
      {"processo":"AUTOMAÇÃO","responsavel":"Responsável 16","frotas":2,"d":{"vel1":[1,0,1,0,0,0,0],"vel2":[0,0,1,0,0,1,0],"vel3":[0,0,0,1,0,0,0],"celular":[0,0,1,0,0,1,0],"cinto":[0,0,0,0,0,0,0],"distracao":[0,0,0,1,0,0,0],"cigarro":[0,1,0,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":2,"vel2":2,"vel3":1,"celular":3,"cinto":0,"distracao":1,"cigarro":1,"faixa":0},"sem":[13,11,9]},
      {"processo":"COA","responsavel":"Responsável 13","frotas":3,"d":{"vel1":[1,1,1,1,0,0,0],"vel2":[0,0,0,0,0,0,0],"vel3":[0,1,0,0,0,0,0],"celular":[1,0,0,1,0,1,0],"cinto":[1,0,0,0,0,0,1],"distracao":[0,1,0,0,1,0,0],"cigarro":[0,0,0,1,0,0,0],"faixa":[0,1,0,0,1,0,1]},"ant":{"vel1":4,"vel2":0,"vel3":1,"celular":4,"cinto":2,"distracao":2,"cigarro":1,"faixa":4},"sem":[19,17,16]},
      {"processo":"COMPRAS/AMOXARIFADO","responsavel":"Responsável 12","frotas":3,"d":{"vel1":[1,4,1,0,1,0,1],"vel2":[0,0,1,0,0,0,1],"vel3":[0,0,0,0,1,1,0],"celular":[0,0,0,0,0,0,0],"cinto":[1,0,0,0,1,1,0],"distracao":[0,3,0,0,0,0,1],"cigarro":[0,0,0,0,0,1,0],"faixa":[0,0,0,1,0,1,0]},"ant":{"vel1":10,"vel2":3,"vel3":2,"celular":0,"cinto":3,"distracao":4,"cigarro":1,"faixa":3},"sem":[31,25,22]},
      {"processo":"DISTRIBUIÇÃO DE VINHAÇA","responsavel":"Responsável 02","frotas":12,"d":{"vel1":[3,2,3,4,3,2,2],"vel2":[1,3,1,1,2,1,1],"vel3":[1,1,2,0,1,0,0],"celular":[2,0,1,1,1,2,1],"cinto":[1,2,0,2,1,1,0],"distracao":[3,1,2,2,2,1,3],"cigarro":[0,2,0,0,2,0,0],"faixa":[0,1,1,0,0,1,0]},"ant":{"vel1":24,"vel2":11,"vel3":7,"celular":11,"cinto":10,"distracao":16,"cigarro":4,"faixa":3},"sem":[116,96,79]},
      {"processo":"EXPERIMENTAÇÃO","responsavel":"Responsável 10","frotas":6,"d":{"vel1":[2,1,2,2,1,2,2],"vel2":[1,1,0,1,0,0,0],"vel3":[0,1,0,0,1,0,0],"celular":[0,1,0,0,1,0,1],"cinto":[0,0,2,2,0,0,2],"distracao":[0,1,1,0,1,1,0],"cigarro":[1,0,0,0,1,1,0],"faixa":[1,0,0,0,0,1,0]},"ant":{"vel1":11,"vel2":3,"vel3":2,"celular":3,"cinto":7,"distracao":4,"cigarro":3,"faixa":3},"sem":[48,48,40]},
      {"processo":"FACILITIES","responsavel":"Responsável 03","frotas":27,"d":{"vel1":[13,13,7,12,5,9,10],"vel2":[4,3,2,4,5,3,4],"vel3":[3,2,2,1,1,1,1],"celular":[2,5,1,3,2,2,2],"cinto":[4,3,4,2,2,2,2],"distracao":[3,6,3,6,3,5,4],"cigarro":[1,1,1,0,0,0,4],"faixa":[1,0,1,1,0,1,4]},"ant":{"vel1":80,"vel2":32,"vel3":11,"celular":15,"cinto":17,"distracao":35,"cigarro":8,"faixa":10},"sem":[300,273,229]},
      {"processo":"INDÚSTRIA","responsavel":"Responsável 24","frotas":1,"d":{"vel1":[0,0,0,0,1,0,1],"vel2":[0,0,0,0,0,0,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,0,0,0,0],"cinto":[0,0,0,0,1,0,0],"distracao":[0,0,1,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":2,"vel2":0,"vel3":0,"celular":0,"cinto":1,"distracao":1,"cigarro":0,"faixa":0},"sem":[6,6,5]},
      {"processo":"INDÚSTRIA","responsavel":"Responsável 22","frotas":1,"d":{"vel1":[1,0,0,0,1,0,0],"vel2":[0,0,0,1,0,0,0],"vel3":[0,0,0,0,0,0,1],"celular":[0,0,0,0,0,0,0],"cinto":[0,0,0,1,0,0,0],"distracao":[0,1,0,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":2,"vel2":1,"vel3":1,"celular":0,"cinto":1,"distracao":1,"cigarro":0,"faixa":0},"sem":[7,7,7]},
      {"processo":"INDÚSTRIA","responsavel":"Responsável 21","frotas":1,"d":{"vel1":[0,0,0,1,0,0,0],"vel2":[0,0,0,1,0,0,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,1,0,0,0],"cinto":[1,0,0,0,0,0,0],"distracao":[0,0,0,0,0,0,0],"cigarro":[0,0,0,0,0,0,1],"faixa":[0,0,1,0,0,0,0]},"ant":{"vel1":1,"vel2":1,"vel3":0,"celular":1,"cinto":1,"distracao":0,"cigarro":1,"faixa":1},"sem":[11,9,8]},
      {"processo":"INDÚSTRIA","responsavel":"Responsável 20","frotas":1,"d":{"vel1":[0,0,0,0,2,0,0],"vel2":[0,0,0,0,0,0,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,0,0,0,1],"cinto":[0,0,0,0,0,0,0],"distracao":[0,0,1,0,0,1,0],"cigarro":[0,0,0,1,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":3,"vel2":0,"vel3":0,"celular":1,"cinto":0,"distracao":2,"cigarro":1,"faixa":0},"sem":[8,8,8]},
      {"processo":"INDÚSTRIA","responsavel":"Responsável 27","frotas":1,"d":{"vel1":[0,0,0,0,0,1,1],"vel2":[0,0,0,0,0,0,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,0,0,0,0],"cinto":[0,0,1,0,0,0,1],"distracao":[0,0,0,0,1,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,1,0,0,0]},"ant":{"vel1":2,"vel2":0,"vel3":0,"celular":0,"cinto":3,"distracao":1,"cigarro":0,"faixa":1},"sem":[8,7,7]},
      {"processo":"INDÚSTRIA","responsavel":"Responsável 17","frotas":1,"d":{"vel1":[2,1,0,0,1,0,2],"vel2":[0,0,0,0,0,1,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,0,0,0,0],"cinto":[0,1,0,0,0,0,0],"distracao":[0,1,0,0,1,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,1,0,0,0,0,0]},"ant":{"vel1":7,"vel2":1,"vel3":0,"celular":0,"cinto":1,"distracao":3,"cigarro":0,"faixa":1},"sem":[13,13,13]},
      {"processo":"INDÚSTRIA","responsavel":"Responsável 26","frotas":1,"d":{"vel1":[0,1,0,0,1,1,1],"vel2":[0,0,0,0,0,0,1],"vel3":[1,0,0,0,0,0,0],"celular":[0,0,0,1,0,0,0],"cinto":[0,1,0,0,0,0,0],"distracao":[0,1,1,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,1,0,0,0]},"ant":{"vel1":4,"vel2":1,"vel3":1,"celular":1,"cinto":1,"distracao":2,"cigarro":0,"faixa":1},"sem":[13,11,11]},
      {"processo":"M.D.O APOIO A COLHEITA","responsavel":"Responsável 04","frotas":25,"d":{"vel1":[11,7,12,9,8,7,8],"vel2":[6,5,5,5,3,5,4],"vel3":[2,1,3,1,2,2,1],"celular":[3,5,2,5,3,1,4],"cinto":[3,3,4,6,3,3,2],"distracao":[5,3,5,5,3,6,6],"cigarro":[1,1,3,3,1,0,0],"faixa":[1,1,1,2,2,1,1]},"ant":{"vel1":76,"vel2":37,"vel3":16,"celular":29,"cinto":23,"distracao":35,"cigarro":9,"faixa":12},"sem":[323,284,229]},
      {"processo":"MANUTENÇÃO AUTOMOTIVA","responsavel":"Responsável 09","frotas":6,"d":{"vel1":[0,1,2,1,0,1,3],"vel2":[2,0,0,2,1,0,1],"vel3":[0,2,0,0,0,0,0],"celular":[0,0,1,0,0,2,1],"cinto":[1,0,0,1,0,1,0],"distracao":[2,1,0,1,1,0,1],"cigarro":[0,1,0,0,0,0,1],"faixa":[1,0,0,0,0,0,0]},"ant":{"vel1":8,"vel2":8,"vel3":2,"celular":5,"cinto":3,"distracao":8,"cigarro":3,"faixa":1},"sem":[42,35,33]},
      {"processo":"MANUTENÇÃO AUTOMOTIVA","responsavel":"Responsável 11","frotas":3,"d":{"vel1":[3,0,0,2,1,0,0],"vel2":[0,2,0,0,0,0,0],"vel3":[0,0,0,0,1,0,1],"celular":[1,0,0,1,0,0,0],"cinto":[0,0,1,0,0,0,0],"distracao":[1,0,1,0,1,0,1],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,1,0,0,0]},"ant":{"vel1":6,"vel2":2,"vel3":2,"celular":2,"cinto":1,"distracao":5,"cigarro":0,"faixa":1},"sem":[21,19,19]},
      {"processo":"MANUTENÇÃO AUTOMOTIVA","responsavel":"Responsável 25","frotas":1,"d":{"vel1":[1,1,0,0,0,1,0],"vel2":[0,0,0,0,0,0,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,0,0,0,0],"cinto":[0,0,0,0,0,0,0],"distracao":[0,0,0,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,1,0,0,0,0,0]},"ant":{"vel1":4,"vel2":0,"vel3":0,"celular":0,"cinto":0,"distracao":0,"cigarro":0,"faixa":1},"sem":[6,5,5]},
      {"processo":"MANUTENÇÃO AUTOMOTIVA","responsavel":"Responsável 05","frotas":16,"d":{"vel1":[6,3,3,4,5,6,3],"vel2":[4,2,5,3,1,1,2],"vel3":[1,0,1,1,1,1,2],"celular":[2,3,1,1,1,1,0],"cinto":[2,1,1,1,4,3,1],"distracao":[3,3,4,3,3,1,2],"cigarro":[2,1,2,0,1,1,0],"faixa":[1,2,0,2,1,1,1]},"ant":{"vel1":39,"vel2":16,"vel3":8,"celular":11,"cinto":15,"distracao":21,"cigarro":9,"faixa":11},"sem":[158,146,136]},
      {"processo":"MANUTENÇÃO AUTOMOTIVA","responsavel":"Responsável 07","frotas":10,"d":{"vel1":[1,2,2,1,1,1,2],"vel2":[1,0,1,1,1,0,2],"vel3":[0,0,1,0,0,1,0],"celular":[1,1,1,0,0,0,0],"cinto":[1,1,1,1,2,1,1],"distracao":[1,1,1,2,1,0,0],"cigarro":[0,0,0,0,1,0,0],"faixa":[0,0,0,1,1,0,0]},"ant":{"vel1":11,"vel2":7,"vel3":2,"celular":4,"cinto":10,"distracao":7,"cigarro":1,"faixa":2},"sem":[46,48,39]},
      {"processo":"MANUTENÇÃO AUTOMOTIVA","responsavel":"Sem responsável","frotas":5,"d":{"vel1":[1,0,1,0,1,0,2],"vel2":[2,0,0,1,1,0,0],"vel3":[1,0,0,0,0,0,1],"celular":[1,0,1,1,0,0,1],"cinto":[0,0,0,1,1,0,1],"distracao":[0,0,2,0,0,1,0],"cigarro":[0,1,0,0,0,0,1],"faixa":[0,1,0,0,0,0,0]},"ant":{"vel1":5,"vel2":5,"vel3":2,"celular":4,"cinto":4,"distracao":3,"cigarro":3,"faixa":1},"sem":[35,32,29]},
      {"processo":"PULVERIZADORES","responsavel":"Responsável 23","frotas":1,"d":{"vel1":[2,1,1,0,0,0,0],"vel2":[1,1,0,0,0,0,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,0,0,0,1],"cinto":[0,0,0,0,0,0,0],"distracao":[0,0,1,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":5,"vel2":3,"vel3":0,"celular":1,"cinto":0,"distracao":1,"cigarro":0,"faixa":0},"sem":[13,11,9]},
      {"processo":"PULVERIZADORES","responsavel":"Responsável 06","frotas":12,"d":{"vel1":[7,4,6,4,5,4,6],"vel2":[2,1,3,2,1,1,1],"vel3":[1,1,1,1,0,2,2],"celular":[2,2,1,1,1,1,1],"cinto":[2,2,2,2,2,2,1],"distracao":[3,1,2,2,1,1,2],"cigarro":[2,1,0,1,1,1,0],"faixa":[2,1,0,3,0,0,0]},"ant":{"vel1":32,"vel2":14,"vel3":11,"celular":9,"cinto":15,"distracao":16,"cigarro":7,"faixa":6},"sem":[116,114,116]},
      {"processo":"SESMT","responsavel":"Responsável 15","frotas":2,"d":{"vel1":[0,0,2,2,0,0,0],"vel2":[0,0,0,0,0,0,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,0,0,0,0,0,0],"cinto":[0,0,1,0,0,1,1],"distracao":[0,0,1,1,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":5,"vel2":0,"vel3":0,"celular":0,"cinto":4,"distracao":2,"cigarro":0,"faixa":0},"sem":[12,10,10]},
      {"processo":"Sem processo","responsavel":"Sem responsável","frotas":1,"d":{"vel1":[0,0,0,1,0,0,0],"vel2":[1,0,0,0,1,0,0],"vel3":[0,0,0,0,1,0,0],"celular":[0,0,0,0,0,0,0],"cinto":[0,0,0,1,0,0,1],"distracao":[0,1,0,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":1,"vel2":3,"vel3":1,"celular":0,"cinto":2,"distracao":1,"cigarro":0,"faixa":0},"sem":[11,11,9]},
      {"processo":"TRANSPORTE","responsavel":"Responsável 01","frotas":75,"d":{"vel1":[22,16,15,23,18,11,22],"vel2":[8,13,11,7,13,7,10],"vel3":[3,4,5,4,3,3,3],"celular":[4,8,7,9,5,4,3],"cinto":[6,7,6,4,6,5,6],"distracao":[8,13,11,10,10,12,10],"cigarro":[4,3,3,1,1,3,3],"faixa":[1,1,3,3,1,2,4]},"ant":{"vel1":145,"vel2":77,"vel3":22,"celular":34,"cinto":35,"distracao":69,"cigarro":19,"faixa":16},"sem":[516,513,498]},
      {"processo":"TRATOS","responsavel":"Responsável 14","frotas":3,"d":{"vel1":[0,0,2,0,1,1,1],"vel2":[0,0,0,0,0,0,0],"vel3":[1,0,0,0,0,0,0],"celular":[0,1,0,0,0,0,1],"cinto":[0,0,0,1,0,0,0],"distracao":[0,0,0,0,0,0,0],"cigarro":[0,1,1,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":7,"vel2":0,"vel3":1,"celular":3,"cinto":1,"distracao":0,"cigarro":3,"faixa":0},"sem":[17,14,14]},
      {"processo":"TRATOS","responsavel":"Responsável 02","frotas":17,"d":{"vel1":[5,5,4,3,6,4,5],"vel2":[2,3,3,2,2,2,3],"vel3":[2,3,0,0,1,0,0],"celular":[3,2,3,1,1,1,1],"cinto":[2,3,3,1,2,1,2],"distracao":[2,3,3,2,2,1,1],"cigarro":[1,1,1,2,1,1,1],"faixa":[0,1,0,0,0,0,2]},"ant":{"vel1":44,"vel2":22,"vel3":6,"celular":16,"cinto":14,"distracao":14,"cigarro":10,"faixa":4},"sem":[142,114,101]},
      {"processo":"TRATOS","responsavel":"Responsável 19","frotas":1,"d":{"vel1":[0,0,1,0,0,1,0],"vel2":[0,1,0,0,0,0,0],"vel3":[0,0,0,0,1,0,0],"celular":[0,0,0,0,0,1,0],"cinto":[0,1,0,0,0,0,0],"distracao":[1,0,0,0,0,0,0],"cigarro":[0,0,0,0,0,0,0],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":2,"vel2":1,"vel3":1,"celular":1,"cinto":1,"distracao":1,"cigarro":0,"faixa":0},"sem":[11,11,9]},
      {"processo":"TRATOS","responsavel":"Responsável 08","frotas":10,"d":{"vel1":[1,0,0,2,1,1,1],"vel2":[2,0,0,0,1,1,0],"vel3":[0,0,0,0,0,0,0],"celular":[0,1,0,0,1,0,0],"cinto":[0,1,1,0,0,0,1],"distracao":[1,1,0,1,1,3,1],"cigarro":[0,0,1,0,0,0,0],"faixa":[0,0,1,0,0,0,0]},"ant":{"vel1":7,"vel2":5,"vel3":0,"celular":2,"cinto":3,"distracao":11,"cigarro":1,"faixa":1},"sem":[27,27,27]},
      {"processo":"VINHAÇA","responsavel":"Responsável 02","frotas":17,"d":{"vel1":[5,2,4,6,5,3,4],"vel2":[4,2,2,2,2,4,1],"vel3":[0,1,0,1,2,0,0],"celular":[2,3,1,1,2,3,1],"cinto":[2,3,1,1,2,1,1],"distracao":[2,1,2,2,1,0,1],"cigarro":[0,0,1,1,1,1,2],"faixa":[0,0,0,0,0,0,0]},"ant":{"vel1":41,"vel2":17,"vel3":3,"celular":11,"cinto":13,"distracao":11,"cigarro":7,"faixa":0},"sem":[96,99,95]}
    ]
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
