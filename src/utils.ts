// --- LÓGICA DE NEGÓCIO E UTILITÁRIOS ---

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  export const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR');
  };
  
  export const diffDays = (d1: Date, d2: Date): number => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay));
  };
  
  const HISTORICO_SALARIO_MINIMO = [
    { date: '2026-01-01', value: 1621.00 },
    { date: '2025-01-01', value: 1518.00 },
    { date: '2024-01-01', value: 1412.00 },
    { date: '2023-05-01', value: 1320.00 },
    { date: '2023-01-01', value: 1302.00 },
    { date: '2022-01-01', value: 1212.00 },
    { date: '2021-01-01', value: 1100.00 },
    { date: '2020-02-01', value: 1045.00 },
    { date: '2020-01-01', value: 1039.00 },
    { date: '2019-01-01', value: 998.00 },
    { date: '2018-01-01', value: 954.00 },
    { date: '2017-01-01', value: 937.00 },
    { date: '2016-01-01', value: 880.00 },
    { date: '2015-01-01', value: 788.00 },
    { date: '2014-01-01', value: 724.00 },
    { date: '2013-01-01', value: 678.00 },
    { date: '2012-01-01', value: 622.00 },
    { date: '2011-03-01', value: 545.00 },
    { date: '2011-01-01', value: 540.00 },
    { date: '2010-01-01', value: 510.00 },
    { date: '2009-02-01', value: 465.00 },
    { date: '2008-03-01', value: 415.00 },
    { date: '2007-04-01', value: 380.00 },
    { date: '2006-04-01', value: 350.00 },
    { date: '2005-05-01', value: 300.00 },
    { date: '2004-05-01', value: 260.00 },
    { date: '2003-06-01', value: 240.00 },
    { date: '2002-06-01', value: 200.00 },
    { date: '2001-06-01', value: 180.00 },
    { date: '2000-06-01', value: 151.00 },
  ];
  
  export const getSalarioMinimo = (date: Date): number => {
    for (const record of HISTORICO_SALARIO_MINIMO) {
      if (date >= new Date(record.date)) {
        return record.value;
      }
    }
    return 151.00;
  };
  
  export const calcularINSS = (baseCalculo: number) => {
    if (baseCalculo <= 0) return 0;
    
    const base = Math.min(baseCalculo, 8157.41); 
    let desconto = 0;
  
    // Base 2026 (R$ 1621)
    const faixa1 = 1621.00; // 7.5%
    const faixa2 = 2793.88; // 9%
    const faixa3 = 4190.83; // 12%
    
    if (base <= faixa1) {
      desconto = base * 0.075;
    } else if (base <= faixa2) {
      desconto = (faixa1 * 0.075) + ((base - faixa1) * 0.09);
    } else if (base <= faixa3) {
      desconto = (faixa1 * 0.075) + ((faixa2 - faixa1) * 0.09) + ((base - faixa2) * 0.12);
    } else {
      desconto = (faixa1 * 0.075) + ((faixa2 - faixa1) * 0.09) + ((faixa3 - faixa2) * 0.12) + ((base - faixa3) * 0.14);
    }
    
    return Math.round(desconto * 100) / 100;
  };
  
  export const calcularIRRF = (baseCalculo: number) => {
    if (baseCalculo <= 0) return 0;
  
    // 1. Tabela Progressiva Padrão
    let imposto = 0;
    
    if (baseCalculo <= 2259.20) {
        imposto = 0;
    } else if (baseCalculo <= 2826.65) {
        imposto = (baseCalculo * 0.075) - 169.44;
    } else if (baseCalculo <= 3751.05) {
        imposto = (baseCalculo * 0.15) - 381.44;
    } else if (baseCalculo <= 4664.68) {
        imposto = (baseCalculo * 0.225) - 662.77;
    } else {
        imposto = (baseCalculo * 0.275) - 896.00;
    }
    
    if (imposto < 0) imposto = 0;
  
    // 2. Aplicação da Regra de Isenção/Redução 2026
    let reducao = 0;
  
    if (baseCalculo <= 5000) {
        return 0; // Isenção total
    } 
    
    if (baseCalculo <= 7350) {
        reducao = 978.62 - (0.133145 * baseCalculo);
        if (reducao < 0) reducao = 0;
    } else {
        reducao = 0;
    }
  
    const irFinal = Math.max(0, imposto - reducao);
    return Math.round(irFinal * 100) / 100;
  };