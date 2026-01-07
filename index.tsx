import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- UTILITÁRIOS E LÓGICA DE NEGÓCIO ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR');
};

const diffDays = (d1: Date, d2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay));
};

// Histórico de Salário Mínimo
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

const getSalarioMinimo = (date: Date): number => {
  for (const record of HISTORICO_SALARIO_MINIMO) {
    if (date >= new Date(record.date)) {
      return record.value;
    }
  }
  return 151.00;
};

// Tabela INSS Simplificada
const calcularINSS = (baseCalculo: number) => {
  if (baseCalculo <= 0) return 0;
  
  const base = Math.min(baseCalculo, 8157.41); 
  let desconto = 0;

  // Atualizado para 2026 (R$ 1621)
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

// Cálculo IRRF 2026 com Redução
const calcularIRRF = (baseCalculo: number) => {
  if (baseCalculo <= 0) return 0;

  // 1. Cálculo Base (Tabela Progressiva Padrão - ref 2025/2026 base)
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

  // Regra: "Até R$ 5 mil ... zerando o imposto"
  if (baseCalculo <= 5000) {
      // Se ganha até 5k, a redução é total (o imposto vira zero)
      return 0;
  } 
  
  // Regra: "De R$ 5.000,01 a R$ 7.350 ... Redução = R$ 978,62 – (0,133145 × renda mensal)"
  if (baseCalculo <= 7350) {
      reducao = 978.62 - (0.133145 * baseCalculo);
      if (reducao < 0) reducao = 0;
  } else {
      // Regra: "A partir de R$ 7.350,01 ... Sem redução"
      reducao = 0;
  }

  const irFinal = Math.max(0, imposto - reducao);
  return Math.round(irFinal * 100) / 100;
};

// --- COMPONENTES DA INTERFACE ---

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  icon?: string;
  delay?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
}

const Card = ({ children, className = "", title = "", icon = "", delay = "", action, onClick, highlight = false }: CardProps) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border overflow-hidden ${className} 
    ${delay ? 'animate-slide-up ' + delay : ''} 
    ${onClick ? 'cursor-pointer hover:border-indigo-300 transition-colors' : 'border-slate-100'} 
    ${highlight ? 'ring-2 ring-indigo-500 shadow-md' : ''}`}
  >
    {(title || icon) && (
      <div className={`px-5 py-3 border-b flex justify-between items-center ${highlight ? 'bg-indigo-50 border-indigo-100' : 'bg-gradient-to-r from-slate-50 to-white border-slate-50'}`}>
        <div className="flex items-center gap-2">
            {icon && (
            <div className={`p-1.5 rounded-lg ${highlight ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <span className="material-icons-round text-lg block">{icon}</span>
            </div>
            )}
            <h3 className={`font-semibold text-sm ${highlight ? 'text-indigo-800' : 'text-slate-700'}`}>{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

interface ResultRowProps {
  label: string;
  value: number;
  subtext?: string;
  isNegative?: boolean;
  isTotal?: boolean;
  hideIfZero?: boolean;
}

const ResultRow: React.FC<ResultRowProps> = ({ label, value, subtext = "", isNegative = false, isTotal = false, hideIfZero = false }) => {
  if (hideIfZero && Math.abs(value) < 0.01) return null;

  return (
    <div className={`flex justify-between items-start py-2 px-1 rounded transition-colors hover:bg-slate-50 
      ${isTotal ? 'border-t-2 border-dashed border-slate-200 mt-2 pt-2' : 'border-b border-slate-50 last:border-0'}`}>
      <div>
        <div className={`${isTotal ? 'font-bold text-slate-900 text-base' : 'font-medium text-slate-600'}`}>{label}</div>
        {subtext && <div className="text-xs text-slate-400">{subtext}</div>}
      </div>
      <div className={`font-mono ${isTotal ? 'text-lg font-bold' : 'font-medium'} 
        ${isNegative ? 'text-red-500' : isTotal ? 'text-indigo-600' : 'text-slate-700'}`}>
        {isNegative ? '-' : ''} {formatCurrency(value)}
      </div>
    </div>
  );
};

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
}

const FormInput = ({ label, type = "text", className = "", options, ...props }: FormInputProps) => (
  <div className={`mb-4 ${className}`}>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
    {options ? (
      <div className="relative">
        <select 
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none text-slate-700"
          // Fix: cast to unknown to resolve type mismatch between input and select attributes
          {...props as unknown as React.SelectHTMLAttributes<HTMLSelectElement>}
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
          <span className="material-icons-round text-xl">expand_more</span>
        </div>
      </div>
    ) : (
      <input 
        type={type}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 placeholder-slate-400"
        {...props}
      />
    )}
  </div>
);

// --- APP COMPONENT ---

function App() {
  const [formData, setFormData] = useState({
    motivo: 'dispensa' as 'dispensa' | 'pedido',
    salarioBase: 2500,
    insalubridade: 0,
    dataAdmissao: '2023-12-03',
    dataDemissao: '2025-12-03',
    avisoTipo: 'trabalhado',
    feriasVencidasQtd: 0,
  });

  const [calculo, setCalculo] = useState<any>(null);
  const [showFGTSModal, setShowFGTSModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // FGTS State
  const [fgtsManualData, setFgtsManualData] = useState<{date: string, value: number}[]>([]);
  const [fgtsSaldoManual, setFgtsSaldoManual] = useState<number | ''>('');

  // Adjustments State
  const [ajustes, setAjustes] = useState<{descricao: string, valor: number, tipo: 'Provento' | 'Desconto'}[]>([]);
  
  // Configs
  const [printSignatures, setPrintSignatures] = useState(true);
  const [signatureText, setSignatureText] = useState('');

  // Inicializa a lista de meses do FGTS
  useEffect(() => {
    if (formData.dataAdmissao && formData.dataDemissao) {
      const start = parseDate(formData.dataAdmissao);
      const end = parseDate(formData.dataDemissao);
      
      // Validação de segurança para não travar o navegador
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;

      // CORREÇÃO: Tipagem explícita para evitar erro no build (implicit any[])
      const dates: {date: string, value: number}[] = [];
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      
      // O loop deve ir até o mês ANTERIOR à demissão para a lista manual.
      const endDate = new Date(end.getFullYear(), end.getMonth() - 1, 1);

      while (current <= endDate) {
        dates.push({
            date: current.toISOString().slice(0, 7), // YYYY-MM
            value: 0
        });
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
      
      setFgtsManualData(prev => {
          if (prev.length === dates.length && prev.length > 0 && prev[0].date === dates[0].date) return prev;
          return dates;
      });
    }
  }, [formData.dataAdmissao, formData.dataDemissao]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCalcular = () => {
    const salarioBase = Number(formData.salarioBase);
    const insalubridade = Number(formData.insalubridade);
    const salarioTotal = salarioBase + insalubridade;
    const admissao = parseDate(formData.dataAdmissao);
    const demissao = parseDate(formData.dataDemissao);
    const feriasVencidasQtd = Number(formData.feriasVencidasQtd);
    const isPedidoDemissao = formData.motivo === 'pedido';

    // 1. Aviso Prévio
    let diasAviso = 30;
    
    // Regra da lei 12.506 (3 dias por ano) só aplica se for dispensa pelo empregador
    if (!isPedidoDemissao) {
        const anosTrabalhados = Math.floor(diffDays(demissao, admissao) / 365.25);
        diasAviso += Math.min(anosTrabalhados * 3, 60);
    } else {
        // Se for pedido de demissão, é sempre 30 dias (seja trabalhado ou descontado)
        diasAviso = 30;
    }
    
    // Cálculo do valor do Aviso
    let valorAvisoProvento = 0;
    let valorAvisoDesconto = 0;
    
    // Data de projeção só existe se for dispensa sem justa causa
    const projecaoAviso = new Date(demissao);
    if (!isPedidoDemissao) {
        projecaoAviso.setDate(demissao.getDate() + diasAviso);
    } 

    if (formData.avisoTipo === 'indenizado') {
        if (isPedidoDemissao) {
            // Pedido de Demissão + Indenizado = Funcionário não cumpriu. Desconto.
            valorAvisoDesconto = (salarioTotal / 30) * 30; // Sempre 30 dias
        } else {
            // Dispensa + Indenizado = Empresa paga. Provento.
            valorAvisoProvento = (salarioTotal / 30) * diasAviso;
        }
    } else {
        // Trabalhado
        if (!isPedidoDemissao) {
            // Se dispensa + trabalhado: Paga dias adicionais da Lei 12.506 como indenizado
            const diasIndenizados = diasAviso - 30;
            if (diasIndenizados > 0) {
                valorAvisoProvento = (salarioTotal / 30) * diasIndenizados;
            }
        }
    }

    // 2. Saldo de Salário
    let diasTrabalhados = demissao.getDate();
    if (diasTrabalhados === 31) diasTrabalhados = 30; 
    const saldoSalario = (salarioTotal / 30) * diasTrabalhados;

    // 3. 13º Salário
    const calcularAvos13 = (inicio: Date, fim: Date) => {
        let avos = 0;
        let current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
        
        // Se mesmo ano
        if (inicio.getFullYear() === fim.getFullYear()) {
             while(current <= fim) {
                 const ultimoDiaMes = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
                 let diasTrabNoMes = 30;
                 // Mês inicial
                 if (current.getMonth() === inicio.getMonth() && current.getFullYear() === inicio.getFullYear()) {
                     diasTrabNoMes = 30 - inicio.getDate() + 1;
                     if (inicio.getDate() === 31) diasTrabNoMes = 0;
                 }
                 // Mês final
                 if (current.getMonth() === fim.getMonth() && current.getFullYear() === fim.getFullYear()) {
                     diasTrabNoMes = fim.getDate();
                     if (fim.getDate() === 31) diasTrabNoMes = 30;
                 }
                 if (diasTrabNoMes >= 15) avos++;
                 current.setMonth(current.getMonth() + 1);
             }
             return avos;
        } 
        
        // Se anos diferentes, conta do inicio do ano da demissão
        const inicioAno = new Date(fim.getFullYear(), 0, 1);
        // Lógica simplificada para ano da demissão
        let meses = fim.getMonth(); // Janeiro = 0
        if (fim.getDate() >= 15) meses++;
        return meses;
    };
    
    const avos13 = calcularAvos13(admissao, demissao);
    const valor13 = (salarioTotal / 12) * avos13;

    // 4. Férias
    const valorFeriasVencidas = feriasVencidasQtd * salarioTotal;
    const tercoFeriasVencidas = valorFeriasVencidas / 3;

    // Férias em Dobro (A cada 2 vencidas, 1 é dobra)
    const qtdFeriasDobro = Math.floor(feriasVencidasQtd / 2);
    const valorFeriasDobro = qtdFeriasDobro * salarioTotal;
    const tercoFeriasDobro = valorFeriasDobro / 3;

    let inicioPeriodoAquisitivo = new Date(admissao);
    while (new Date(inicioPeriodoAquisitivo.getFullYear() + 1, inicioPeriodoAquisitivo.getMonth(), inicioPeriodoAquisitivo.getDate()) <= demissao) {
        inicioPeriodoAquisitivo.setFullYear(inicioPeriodoAquisitivo.getFullYear() + 1);
    }
    
    let avosFeriasCalc = 0;
    let dataCursor = new Date(inicioPeriodoAquisitivo);
    while (dataCursor < demissao) {
        let fimMesAquisitivo = new Date(dataCursor);
        fimMesAquisitivo.setMonth(fimMesAquisitivo.getMonth() + 1);
        let limite = fimMesAquisitivo > demissao ? demissao : fimMesAquisitivo;
        const diff = diffDays(limite, dataCursor);
        if (diff >= 14) avosFeriasCalc++;
        dataCursor.setMonth(dataCursor.getMonth() + 1);
    }
    if (avosFeriasCalc > 12) avosFeriasCalc = 12;

    const valorFeriasProp = (salarioTotal / 12) * avosFeriasCalc;
    const tercoFeriasProp = valorFeriasProp / 3;

    // 5. Indenizações (Projeção) - SÓ SE NÃO FOR PEDIDO DE DEMISSÃO
    let valor13Indenizado = 0;
    let valorFeriasIndenizado = 0;
    let tercoFeriasIndenizado = 0;
    
    if (!isPedidoDemissao && formData.avisoTipo === 'indenizado') {
        const avos13ComProjecao = calcularAvos13(admissao, projecaoAviso);
        const diffAvos13 = Math.max(0, avos13ComProjecao - avos13);
        if (diffAvos13 > 0) valor13Indenizado = (salarioTotal / 12) * diffAvos13;

        let avosFeriasProj = 0;
        let cursorProj = new Date(inicioPeriodoAquisitivo);
        while (cursorProj < projecaoAviso) {
            let fimMes = new Date(cursorProj);
            fimMes.setMonth(fimMes.getMonth() + 1);
            let limite = fimMes > projecaoAviso ? projecaoAviso : fimMes;
            if (diffDays(limite, cursorProj) >= 14) avosFeriasProj++;
            cursorProj.setMonth(cursorProj.getMonth() + 1);
        }
        if (avosFeriasProj > 12) avosFeriasProj = 12;
        const diffAvosFerias = Math.max(0, avosFeriasProj - avosFeriasCalc);
        
        if (diffAvosFerias > 0) {
             valorFeriasIndenizado = (salarioTotal / 12) * diffAvosFerias;
             tercoFeriasIndenizado = valorFeriasIndenizado / 3;
        }
    }

    // 6. FGTS
    let saldoFGTSParaMulta = 0;
    
    if (fgtsSaldoManual !== '') {
        saldoFGTSParaMulta = Number(fgtsSaldoManual);
    } else {
        saldoFGTSParaMulta = fgtsManualData.reduce((acc, curr) => acc + curr.value, 0);
    }

    const baseFGTSRescisao = saldoSalario + valor13 + (valorAvisoProvento > 0 ? valorAvisoProvento : 0);
    const fgtsRescisao = baseFGTSRescisao * 0.08;
    
    // FGTS sobre 13º Indenizado
    const baseFGTSAvisoIndenizado = valor13Indenizado; 
    const fgtsAvisoIndenizado = baseFGTSAvisoIndenizado * 0.08;

    const baseTotalMulta = saldoFGTSParaMulta + fgtsRescisao + fgtsAvisoIndenizado;
    
    const multa40 = isPedidoDemissao ? 0 : baseTotalMulta * 0.4;
    const totalContaFGTS = isPedidoDemissao ? 0 : (baseTotalMulta + multa40);

    // 7. Descontos
    // Separação de Bases para INSS e IRRF
    const baseINSSSalario = saldoSalario; // Aviso Trabalhado não está explicitamente separado como verba salarial aqui além do saldo, simplificando
    const baseINSS13 = valor13 + valor13Indenizado;
    
    const inssSalario = calcularINSS(baseINSSSalario);
    const inss13 = calcularINSS(baseINSS13);
    
    const descontoINSS = inssSalario + inss13;

    // 8. IRRF
    // Base Salário: Saldo Salário - INSS Salário. (Aviso Indenizado e Férias Indenizadas costumam ser isentos)
    const baseIRRFSalario = Math.max(0, saldoSalario - inssSalario);
    const irrfSalario = calcularIRRF(baseIRRFSalario);

    // Base 13º: (13º Prop + 13º Indenizado) - INSS 13º
    const baseIRRF13 = Math.max(0, (valor13 + valor13Indenizado) - inss13);
    const irrf13 = calcularIRRF(baseIRRF13);

    const totalIRRF = irrfSalario + irrf13;

    // 9. Totais
    const totalProventos = saldoSalario + valorAvisoProvento + valor13 + valorFeriasVencidas + tercoFeriasVencidas + valorFeriasDobro + tercoFeriasDobro + valorFeriasProp + tercoFeriasProp + valor13Indenizado + valorFeriasIndenizado + tercoFeriasIndenizado;
    
    const totalDescontosAutomaticos = descontoINSS + totalIRRF + valorAvisoDesconto;

    const totalAjustesProventos = ajustes.filter(a => a.tipo === 'Provento').reduce((acc, c) => acc + c.valor, 0);
    const totalAjustesDescontos = ajustes.filter(a => a.tipo === 'Desconto').reduce((acc, c) => acc + c.valor, 0);
    
    const rescisaoLiquida = (totalProventos + totalAjustesProventos) - (totalDescontosAutomaticos + totalAjustesDescontos);
    const totalGeral = rescisaoLiquida + totalContaFGTS;

    setCalculo({
        saldoSalario, diasTrabalhados, 
        valorAviso: valorAvisoProvento, 
        valorAvisoDesconto, 
        diasAviso, projecaoAviso, valor13, avos13,
        valorFeriasVencidas, tercoFeriasVencidas, valorFeriasProp, tercoFeriasProp, avosFerias: avosFeriasCalc,
        valorFeriasDobro, tercoFeriasDobro, qtdFeriasDobro,
        valor13Indenizado, valorFeriasIndenizado, tercoFeriasIndenizado,
        fgtsRescisao, fgtsAvisoIndenizado, multa40, totalContaFGTS, saldoFGTSBase: saldoFGTSParaMulta,
        descontoINSS, totalIRRF, rescisaoLiquida, totalGeral,
        isPedidoDemissao
    });
  };

  const updateFgtsValue = (index: number, val: number) => {
    const newData = [...fgtsManualData];
    newData[index].value = val;
    setFgtsManualData(newData);
  };

  const preencherSalarioMinimo = () => {
    const newData = fgtsManualData.map(item => ({
        ...item,
        value: getSalarioMinimo(parseDate(item.date + '-01')) * 0.08
    }));
    setFgtsManualData(newData);
    setFgtsSaldoManual('');
  };

  const addAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const desc = (form.elements.namedItem('descAjuste') as HTMLInputElement).value;
    const val = Number((form.elements.namedItem('valAjuste') as HTMLInputElement).value);
    const tipo = (form.elements.namedItem('tipoAjuste') as HTMLSelectElement).value as 'Provento' | 'Desconto';
    setAjustes([...ajustes, { descricao: desc, valor: val, tipo }]);
    form.reset();
  };

  return (
    <div className="min-h-screen pb-12 font-sans text-slate-600 bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 no-print">
        {/* Header */}
        <header className="mb-8 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
               <span className="material-icons-round text-white text-2xl block">calculate</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cálculo de Rescisão</h1>
          </div>
          <p className="text-slate-500">Preencha os dados contratuais para gerar o demonstrativo completo.</p>
        </header>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                
                {/* Seletor de Motivo */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo da Rescisão</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, motivo: 'dispensa' }))}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${formData.motivo === 'dispensa' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Sem Justa Causa
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, motivo: 'pedido' }))}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${formData.motivo === 'pedido' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pedido de Demissão
                        </button>
                    </div>
                </div>

                <FormInput label="Salário Base (R$)" name="salarioBase" type="number" value={formData.salarioBase} onChange={handleInputChange} />
                <FormInput label="Adicional Insalubridade (R$)" name="insalubridade" type="number" value={formData.insalubridade} onChange={handleInputChange} />
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Data Admissão" name="dataAdmissao" type="date" value={formData.dataAdmissao} onChange={handleInputChange} />
                    <FormInput label="Data Demissão" name="dataDemissao" type="date" value={formData.dataDemissao} onChange={handleInputChange} />
                </div>
                <FormInput 
                    label="Tipo de Aviso Prévio" 
                    name="avisoTipo" 
                    options={[
                        { value: 'trabalhado', label: 'Trabalhado' }, 
                        { value: 'indenizado', label: 'Indenizado' }
                    ]} 
                    value={formData.avisoTipo} 
                    onChange={handleInputChange} 
                />
                
                {formData.motivo === 'pedido' && formData.avisoTipo === 'indenizado' && (
                    <div className="bg-orange-50 text-orange-700 text-xs p-3 rounded-lg mb-4 border border-orange-100">
                        <strong>Nota:</strong> Como é pedido de demissão indenizado, o valor será descontado (30 dias).
                    </div>
                )}

                <FormInput label="Férias Vencidas (Períodos)" name="feriasVencidasQtd" type="number" value={formData.feriasVencidasQtd} onChange={handleInputChange} />
                
                <button onClick={handleCalcular} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                    <span className="material-icons-round">play_arrow</span> Calcular Rescisão
                </button>
            </div>
          </div>

          {/* Resultados */}
          <div className="lg:col-span-7 xl:col-span-8">
            {!calculo ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl">
                    <span className="material-icons-round text-6xl mb-4">analytics</span>
                    <p className="text-lg font-medium">Aguardando cálculo...</p>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white shadow-xl shadow-indigo-200" delay="delay-100">
                             <div className="text-indigo-100 text-sm font-medium mb-1">Total Geral a Receber</div>
                             <div className="text-3xl font-bold tracking-tight">{formatCurrency(calculo.totalGeral)}</div>
                             <div className="mt-2 text-indigo-200 text-xs">Rescisão Líquida {calculo.isPedidoDemissao ? '' : '+ FGTS (Saque)'}</div>
                        </Card>
                        <Card title="Rescisão Líquida a Receber" icon="payments" delay="delay-200">
                            <div className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(calculo.rescisaoLiquida)}</div>
                            <div className="text-xs text-slate-400 mt-1">Valor líquido na conta (sem FGTS)</div>
                        </Card>
                    </div>

                    <Card title="FGTS + Multa 40%" icon="savings" delay="delay-300" onClick={() => setShowFGTSModal(true)} action={<span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">Editar</span>}>
                        {calculo.isPedidoDemissao ? (
                            <div className="text-sm text-slate-500 italic py-2">
                                Pedido de Demissão: Sem multa de 40% e sem saque imediato. 
                                <br/><span className="text-xs text-slate-400">(Apenas depósito do mês devido)</span>
                            </div>
                        ) : (
                            <>
                                <ResultRow label="Saldo FGTS Fins Rescisórios" value={calculo.saldoFGTSBase + calculo.fgtsRescisao + calculo.fgtsAvisoIndenizado} subtext="Base para multa" />
                                <ResultRow label="Multa 40%" value={calculo.multa40} />
                                <ResultRow label="Total FGTS (Saque)" value={calculo.totalContaFGTS} isTotal />
                            </>
                        )}
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Proventos" icon="add_circle_outline" delay="delay-400" action={<button onClick={() => setShowAdjustModal(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">AJUSTAR</button>}>
                            <ResultRow label="Saldo de Salário" value={calculo.saldoSalario} subtext={`${calculo.diasTrabalhados} dias`} />
                            
                            <ResultRow label="Aviso Prévio Indenizado" value={calculo.valorAviso} subtext={`${calculo.diasAviso} dias`} hideIfZero />
                            
                            {calculo.valor13Indenizado > 0 && <ResultRow label="13º Salário s/ Aviso Prévio Indenizado" value={calculo.valor13Indenizado} subtext="1/12 avos" />}
                            {calculo.valorFeriasIndenizado > 0 && <><ResultRow label="Férias s/ Aviso Prévio Indenizado" value={calculo.valorFeriasIndenizado} /><ResultRow label="1/3 s/ Férias Indenizadas" value={calculo.tercoFeriasIndenizado} /></>}
                            <ResultRow label="13º Salário Proporcional" value={calculo.valor13} subtext={`${calculo.avos13}/12 avos`} />
                            
                            <ResultRow label="Férias Vencidas" value={calculo.valorFeriasVencidas} hideIfZero />
                            <ResultRow label="1/3 Férias Vencidas" value={calculo.tercoFeriasVencidas} hideIfZero />
                            
                            {calculo.valorFeriasDobro > 0 && (
                                <>
                                    <ResultRow label="Férias em Dobro" value={calculo.valorFeriasDobro} subtext={`${calculo.qtdFeriasDobro} período(s)`} />
                                    <ResultRow label="1/3 s/ Férias em Dobro" value={calculo.tercoFeriasDobro} />
                                </>
                            )}

                            <ResultRow label="Férias Proporcionais" value={calculo.valorFeriasProp} subtext={`${calculo.avosFerias}/12 avos`} />
                            <ResultRow label="1/3 Férias Proporcionais" value={calculo.tercoFeriasProp} />
                            {ajustes.filter(a => a.tipo === 'Provento').map((aj, idx) => <ResultRow key={idx} label={aj.descricao} value={aj.valor} subtext="Manual" />)}
                        </Card>
                        <Card title="Descontos" icon="remove_circle_outline" delay="delay-500">
                            <ResultRow label="INSS" value={calculo.descontoINSS} isNegative />
                            <ResultRow label="IRRF" value={calculo.totalIRRF} isNegative hideIfZero />
                            <ResultRow label="Aviso Prévio (Não Trabalhado)" value={calculo.valorAvisoDesconto} subtext="30 dias" isNegative hideIfZero />
                            {ajustes.filter(a => a.tipo === 'Desconto').map((aj, idx) => <ResultRow key={idx} label={aj.descricao} value={aj.valor} subtext="Manual" isNegative />)}
                        </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 no-print">
                         <button onClick={() => setShowAdjustModal(true)} className="bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-6 py-3 rounded-xl shadow-sm flex items-center gap-2 transition-all font-semibold">
                            <span className="material-icons-round">post_add</span> Adicionar Provento/Desconto
                        </button>
                        <button onClick={() => setShowPrintModal(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all font-semibold">
                            <span className="material-icons-round">print</span> Imprimir Relatório
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>

      {showFGTSModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Ajuste de FGTS</h3>
                    <button onClick={() => setShowFGTSModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-icons-round">close</span></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <label className="block text-sm font-bold text-indigo-900 mb-2">Saldo Total para Fins Rescisórios</label>
                        <input type="number" className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Informe o saldo total acumulado se preferir não somar mês a mês" value={fgtsSaldoManual} onChange={(e) => setFgtsSaldoManual(Number(e.target.value))} />
                        <p className="text-xs text-indigo-600 mt-2">* Ao preencher este campo, a tabela abaixo será ignorada para o cálculo da multa.</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700">Valores Mensais (8%)</h4>
                        <button onClick={preencherSalarioMinimo} className="text-sm text-indigo-600 font-semibold hover:underline">Preencher com Mínimo</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {fgtsManualData.map((item, idx) => (
                            <div key={idx}>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{item.date}</label>
                                <input type="number" className="w-full px-3 py-1.5 border rounded text-sm" value={item.value} onChange={(e) => updateFgtsValue(idx, Number(e.target.value))} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={() => setShowFGTSModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                    <button onClick={() => { handleCalcular(); setShowFGTSModal(false); }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Salvar e Recalcular</button>
                </div>
            </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Adicionar Ajuste Manual</h3>
                    <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-icons-round">close</span></button>
                </div>
                <form onSubmit={addAjuste} className="p-6 space-y-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Descrição do Evento</label><input name="descAjuste" required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Horas Extras, Adiantamento..." /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Valor (R$)</label><input name="valAjuste" type="number" step="0.01" required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" /></div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Evento</label>
                        <select name="tipoAjuste" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"><option value="Provento">Provento (Soma ao total)</option><option value="Desconto">Desconto (Subtrai do total)</option></select>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold mt-4 shadow-lg transition-all">Adicionar Ajuste</button>
                </form>
                <div className="px-6 pb-6">
                    <h4 className="font-bold text-xs uppercase text-slate-500 mb-3 tracking-wide">Ajustes Adicionados</h4>
                    {ajustes.length === 0 && <p className="text-sm text-slate-400 italic text-center py-2 bg-slate-50 rounded">Nenhum ajuste manual adicionado.</p>}
                    <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {ajustes.map((aj, i) => (
                            <li key={i} className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded border border-slate-100">
                                <span className="font-medium text-slate-700">{aj.descricao}</span>
                                <span className={`font-bold font-mono ${aj.tipo === 'Provento' ? 'text-green-600' : 'text-red-600'}`}>
                                    {aj.tipo === 'Provento' ? '+' : '-'} {formatCurrency(aj.valor)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button onClick={() => { handleCalcular(); setShowAdjustModal(false); }} className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold w-full shadow-md">Concluir e Recalcular</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showPrintModal && calculo && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex justify-center overflow-y-auto print:absolute print:inset-0 print:bg-white print:z-auto print:h-full">
            <div className="bg-slate-200 min-h-screen w-full flex flex-col items-center py-8 print:bg-white print:p-0 print:h-full">
                
                <div className="bg-white p-4 rounded-xl shadow-lg mb-8 w-full max-w-4xl no-print">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowPrintModal(false)} className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"><span className="material-icons-round">arrow_back</span> Voltar</button>
                            <div className="h-6 w-px bg-slate-200"></div>
                            <h2 className="font-bold text-slate-700">Configurações de Impressão</h2>
                        </div>
                        <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"><span className="material-icons-round">print</span> Imprimir</button>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-3">
                         <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                            <input type="checkbox" checked={printSignatures} onChange={e => setPrintSignatures(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-slate-700">Incluir campos de assinatura</span>
                         </label>
                         
                         {printSignatures && (
                             <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Texto sobre a assinatura (Opcional - máx 3 linhas)</label>
                                <textarea 
                                    value={signatureText}
                                    onChange={(e) => setSignatureText(e.target.value)}
                                    rows={3}
                                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: Declaro ter recebido a importância líquida discriminada neste recibo..."
                                />
                             </div>
                         )}
                    </div>
                </div>

                {/* AREA DE IMPRESSAO - Layout Tabela Formal */}
                <div id="print-area-container" className="bg-white w-full h-full p-8 shadow-none mx-auto relative text-sm text-slate-900 flex flex-col justify-between print:p-8">
                    
                    <div className="print-content-wrapper">
                        {/* Header */}
                        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
                            <div>
                                <h1 className="text-xl font-bold uppercase tracking-wider">Demonstrativo de Valores</h1>
                                <p className="text-xs font-semibold text-slate-500 uppercase mt-1">Cálculo Rescisório Trabalhista ({calculo.isPedidoDemissao ? 'Pedido de Demissão' : 'Dispensa sem Justa Causa'})</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500 uppercase">Data do Cálculo</div>
                                <div className="font-mono font-bold">{formatDate(new Date())}</div>
                            </div>
                        </div>

                        {/* Resumo */}
                        <div className="bg-slate-100 border border-slate-300 rounded p-4 mb-6 grid grid-cols-4 gap-4 text-xs">
                            <div><div className="font-bold text-slate-500 uppercase mb-1">Admissão</div><div className="font-mono font-bold text-base">{formatDate(parseDate(formData.dataAdmissao))}</div></div>
                            <div><div className="font-bold text-slate-500 uppercase mb-1">Demissão</div><div className="font-mono font-bold text-base">{formatDate(parseDate(formData.dataDemissao))}</div></div>
                            <div><div className="font-bold text-slate-500 uppercase mb-1">Aviso Prévio</div><div className="font-mono font-bold text-base uppercase">{formData.avisoTipo}</div></div>
                            <div><div className="font-bold text-slate-500 uppercase mb-1">Remuneração</div><div className="font-mono font-bold text-base">{formatCurrency(Number(formData.salarioBase) + Number(formData.insalubridade))}</div></div>
                        </div>

                        {/* Tabela de Verbas */}
                        <table className="w-full text-sm text-left mb-6 border-collapse">
                            <thead className="bg-slate-800 text-white text-xs uppercase">
                                <tr>
                                    <th className="p-2 border border-slate-800">Rubrica</th>
                                    <th className="p-2 border border-slate-800 text-center w-24">Ref.</th>
                                    <th className="p-2 border border-slate-800 text-right w-32">Proventos</th>
                                    <th className="p-2 border border-slate-800 text-right w-32">Descontos</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs">
                                {/* Proventos */}
                                <tr className="border-b border-slate-200">
                                    <td className="p-2">Saldo de Salário</td>
                                    <td className="p-2 text-center text-slate-500">{calculo.diasTrabalhados}d</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.saldoSalario)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                {calculo.valorAviso > 0 && (
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="p-2">Aviso Prévio Indenizado</td>
                                    <td className="p-2 text-center text-slate-500">{calculo.diasAviso}d</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valorAviso)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                <tr className="border-b border-slate-200">
                                    <td className="p-2">13º Salário Proporcional</td>
                                    <td className="p-2 text-center text-slate-500">{calculo.avos13}/12</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valor13)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                {calculo.valor13Indenizado > 0 && (
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="p-2">13º Salário s/ Aviso Indenizado</td>
                                    <td className="p-2 text-center text-slate-500">-</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valor13Indenizado)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                {calculo.valorFeriasVencidas > 0 && (
                                <tr className="border-b border-slate-200">
                                    <td className="p-2">Férias Vencidas</td>
                                    <td className="p-2 text-center text-slate-500">-</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valorFeriasVencidas)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                {calculo.tercoFeriasVencidas > 0 && (
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="p-2">1/3 Férias Vencidas</td>
                                    <td className="p-2 text-center text-slate-500">1/3</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.tercoFeriasVencidas)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                {calculo.valorFeriasDobro > 0 && (
                                <tr className="border-b border-slate-200">
                                    <td className="p-2">Férias em Dobro</td>
                                    <td className="p-2 text-center text-slate-500">{calculo.qtdFeriasDobro}</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valorFeriasDobro)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                {calculo.tercoFeriasDobro > 0 && (
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="p-2">1/3 s/ Férias em Dobro</td>
                                    <td className="p-2 text-center text-slate-500">1/3</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.tercoFeriasDobro)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                <tr className="border-b border-slate-200">
                                    <td className="p-2">Férias Proporcionais</td>
                                    <td className="p-2 text-center text-slate-500">{calculo.avosFerias}/12</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valorFeriasProp)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="p-2">1/3 Férias Proporcionais</td>
                                    <td className="p-2 text-center text-slate-500">1/3</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.tercoFeriasProp)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                {calculo.valorFeriasIndenizado > 0 && (
                                <tr className="border-b border-slate-200">
                                    <td className="p-2">Férias s/ Aviso Indenizado</td>
                                    <td className="p-2 text-center text-slate-500">-</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valorFeriasIndenizado)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                {calculo.tercoFeriasIndenizado > 0 && (
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="p-2">1/3 s/ Férias Indenizadas</td>
                                    <td className="p-2 text-center text-slate-500">1/3</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.tercoFeriasIndenizado)}</td>
                                    <td className="p-2 text-right font-mono"></td>
                                </tr>
                                )}
                                {ajustes.filter(a => a.tipo === 'Provento').map((aj, idx) => (
                                    <tr key={`prov-${idx}`} className="border-b border-slate-200">
                                        <td className="p-2 text-indigo-700">{aj.descricao}</td>
                                        <td className="p-2 text-center text-slate-500">Manual</td>
                                        <td className="p-2 text-right font-mono">{formatCurrency(aj.valor)}</td>
                                        <td className="p-2 text-right font-mono"></td>
                                    </tr>
                                ))}

                                {/* Descontos */}
                                <tr className="border-b border-slate-200 text-red-700">
                                    <td className="p-2">INSS</td>
                                    <td className="p-2 text-center text-slate-500">Desc.</td>
                                    <td className="p-2 text-right font-mono"></td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.descontoINSS)}</td>
                                </tr>
                                {calculo.totalIRRF > 0 && (
                                <tr className="border-b border-slate-200 text-red-700">
                                    <td className="p-2">IRRF (Tabela 2026)</td>
                                    <td className="p-2 text-center text-slate-500">Desc.</td>
                                    <td className="p-2 text-right font-mono"></td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.totalIRRF)}</td>
                                </tr>
                                )}
                                {calculo.valorAvisoDesconto > 0 && (
                                <tr className="border-b border-slate-200 text-red-700">
                                    <td className="p-2">Aviso Prévio (Não Trabalhado)</td>
                                    <td className="p-2 text-center text-slate-500">30d</td>
                                    <td className="p-2 text-right font-mono"></td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculo.valorAvisoDesconto)}</td>
                                </tr>
                                )}
                                {ajustes.filter(a => a.tipo === 'Desconto').map((aj, idx) => (
                                    <tr key={`desc-${idx}`} className="border-b border-slate-200 text-red-700">
                                        <td className="p-2">{aj.descricao}</td>
                                        <td className="p-2 text-center text-slate-500">Manual</td>
                                        <td className="p-2 text-right font-mono"></td>
                                        <td className="p-2 text-right font-mono">{formatCurrency(aj.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td className="p-3" colSpan={2}>TOTAIS</td>
                                    <td className="p-3 text-right text-slate-800">{formatCurrency((calculo.rescisaoLiquida + calculo.descontoINSS + calculo.totalIRRF + calculo.valorAvisoDesconto + ajustes.filter((a: any) => a.tipo === 'Desconto').reduce((acc: number, c: any) => acc + c.valor, 0)))}</td>
                                    <td className="p-3 text-right text-red-600">{formatCurrency(calculo.descontoINSS + calculo.totalIRRF + calculo.valorAvisoDesconto + ajustes.filter((a: any) => a.tipo === 'Desconto').reduce((acc: number, c: any) => acc + c.valor, 0))}</td>
                                </tr>
                            </tfoot>
                        </table>

                        {!calculo.isPedidoDemissao && (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded text-xs">
                            <h3 className="font-bold text-slate-700 uppercase mb-2 border-b border-slate-200 pb-1">Demonstrativo FGTS</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                <div className="flex justify-between"><span>Base de Cálculo (Fins Rescisórios):</span> <span className="font-mono font-semibold">{formatCurrency(calculo.saldoFGTSBase + calculo.fgtsRescisao + calculo.fgtsAvisoIndenizado)}</span></div>
                                <div className="flex justify-between"><span>Multa Rescisória (40%):</span> <span className="font-mono font-semibold">{formatCurrency(calculo.multa40)}</span></div>
                                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold text-slate-800 col-span-2"><span>Total FGTS a Depositar:</span> <span className="font-mono text-sm">{formatCurrency(calculo.totalContaFGTS)}</span></div>
                            </div>
                        </div>
                        )}

                        <div className="mb-8">
                            <div className="flex justify-end items-center mb-2 px-4 gap-4">
                                <span className="text-sm font-bold text-slate-500 uppercase">Rescisão Líquida a Receber</span>
                                <span className="text-lg font-mono font-bold text-slate-700">{formatCurrency(calculo.rescisaoLiquida)}</span>
                            </div>

                            <div className="border-2 border-slate-800 p-4 flex justify-between items-center bg-slate-50">
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-500">Total Geral a Receber</div>
                                    <div className="text-[10px] text-slate-400">Rescisão Líquida {calculo.isPedidoDemissao ? '' : '+ Total FGTS'}</div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 font-mono">{formatCurrency(calculo.totalGeral)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        {printSignatures && (
                        <div className="pt-8 mb-8">
                            {signatureText && (
                                <p className="text-xs text-justify text-slate-600 mb-6 px-4 leading-relaxed whitespace-pre-line">
                                    {signatureText}
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-12 border-t border-slate-200 pt-8">
                                <div className="text-center">
                                    <div className="h-10"></div>
                                    <div className="border-t border-slate-400 pt-2 font-bold text-xs uppercase">Assinatura do Empregador</div>
                                </div>
                                <div className="text-center">
                                    <div className="h-10"></div>
                                    <div className="border-t border-slate-400 pt-2 font-bold text-xs uppercase">Assinatura do Empregado</div>
                                </div>
                            </div>
                        </div>
                        )}

                        <div className="border-t border-slate-200 pt-4 flex items-center gap-4">
                            <div className="bg-slate-800 text-white w-12 h-12 flex items-center justify-center font-bold text-xl rounded">L</div>
                            <div>
                                <div className="text-lg font-black uppercase text-slate-800 tracking-wide">Lucas Araujo dos Santos</div>
                                <div className="text-sm font-semibold text-slate-500 uppercase">Contador • CRC-BA: 046968/O-6</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
      )}

    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);