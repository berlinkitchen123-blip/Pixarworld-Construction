import React, { useState } from 'react';

const ScientificCalculator: React.FC = () => {
  const [calcExpr, setCalcExpr] = useState('');
  const [calcResult, setCalcResult] = useState('0');
  
  const handleCalcAction = (action: string) => {
    if (action === '=') {
      try {
        // Basic safe evaluation for a calculator
        let expr = calcExpr
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/sqrt\(/g, 'Math.sqrt(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/pi/g, 'Math.PI')
          .replace(/e/g, 'Math.E')
          .replace(/\^/g, '**');
        
        // Simple evaluation
        const res = eval(expr);
        setCalcResult(res.toString());
      } catch (e) {
        setCalcResult('Error');
      }
    } else if (action === 'C') {
      setCalcExpr('');
      setCalcResult('0');
    } else if (action === 'DEL') {
      setCalcExpr(prev => prev.slice(0, -1));
    } else {
      setCalcExpr(prev => prev + action);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Scientific Calculator</h2>
        <p className="text-slate-500 font-medium mt-1">Advanced mathematical calculations for engineering and design.</p>
      </header>

      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-800">
        <div className="bg-slate-950 p-8 rounded-3xl text-right mb-8 border border-slate-800/50 shadow-inner">
          <div className="text-slate-500 text-sm font-mono h-8 overflow-hidden tracking-wider">{calcExpr || ' '}</div>
          <div className="text-white text-5xl font-black font-mono truncate tracking-tight">{calcResult}</div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            'sin(', 'cos(', 'tan(', 'sqrt(', 
            'log(', 'ln(', 'pi', 'e', 
            '(', ')', '^', '/', 
            '7', '8', '9', '*', 
            '4', '5', '6', '-', 
            '1', '2', '3', '+', 
            '0', '.', 'DEL', 'C'
          ].map(btn => (
            <button 
              key={btn} 
              onClick={() => handleCalcAction(btn)}
              className={`h-14 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center ${
                ['DEL', 'C'].includes(btn) ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 
                ['/', '*', '-', '+', '^'].includes(btn) ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20' :
                ['sin(', 'cos(', 'tan(', 'sqrt(', 'log(', 'ln(', 'pi', 'e'].includes(btn) ? 'bg-slate-800 text-slate-400 hover:text-white text-[10px]' :
                'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              {btn === 'sqrt(' ? '√' : btn === 'pi' ? 'π' : btn === 'DEL' ? '⌫' : btn}
            </button>
          ))}
          <button 
            onClick={() => handleCalcAction('=')}
            className="col-span-2 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl hover:bg-blue-700 shadow-xl shadow-blue-900/40 transition-all active:scale-95"
          >
            =
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Constant π</p>
          <p className="text-sm font-bold text-slate-700">3.14159265</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Constant e</p>
          <p className="text-sm font-bold text-slate-700">2.71828182</p>
        </div>
      </div>
    </div>
  );
};

export default ScientificCalculator;
