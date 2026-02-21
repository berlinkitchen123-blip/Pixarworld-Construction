import React, { useMemo, useRef, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Estimate, EstimateStatus } from '../types.ts';

interface BusinessAnalyticsProps {
  estimates: Estimate[];
}

const BusinessAnalytics: React.FC<BusinessAnalyticsProps> = ({ estimates }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const filteredEstimates = useMemo(() => {
    return estimates.filter(e => {
      const date = new Date(e.createdAt).getTime();
      const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
      const end = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
      return date >= start && date <= end;
    });
  }, [estimates, dateRange]);

  const stats = useMemo(() => {
    const total = filteredEstimates.length;
    const converted = filteredEstimates.filter(e => e.status === EstimateStatus.CONVERTED).length;
    const pending = filteredEstimates.filter(e => e.status === EstimateStatus.PENDING).length;
    const rejected = filteredEstimates.filter(e => e.status === EstimateStatus.REJECTED).length;
    
    const totalValue = filteredEstimates.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const businessValue = filteredEstimates
      .filter(e => e.status === EstimateStatus.CONVERTED)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    // Monthly trends
    const monthlyData: Record<string, { name: string, estimates: number, business: number, value: number }> = {};
    filteredEstimates.forEach(e => {
      const date = new Date(e.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { name: key, estimates: 0, business: 0, value: 0 };
      }
      
      monthlyData[key].estimates += 1;
      monthlyData[key].value += e.totalAmount;
      if (e.status === EstimateStatus.CONVERTED) {
        monthlyData[key].business += 1;
      }
    });

    const chartData = Object.values(monthlyData).slice(-6); // Last 6 months

    const statusData = [
      { name: 'Converted', value: converted, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#3B82F6' },
      { name: 'Rejected', value: rejected, color: '#EF4444' },
    ];

    return {
      total,
      converted,
      pending,
      rejected,
      totalValue,
      businessValue,
      conversionRate,
      chartData,
      statusData
    };
  }, [filteredEstimates]);

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const node = reportRef.current;
      const options = { 
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        style: {
          padding: '40px',
          borderRadius: '0',
          width: '1200px' // Fixed width for consistent export
        }
      };

      if (format === 'pdf') {
        const dataUrl = await htmlToImage.toPng(node, options);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`Business_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const dataUrl = await htmlToImage.toPng(node, options);
        const link = document.createElement('a');
        link.download = `Business_Report_${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!reportRef.current || !navigator.share) {
      if (!navigator.share) alert('Web Share API not supported in this browser.');
      return;
    }
    setIsExporting(true);
    try {
      const blob = await htmlToImage.toBlob(reportRef.current, { 
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        style: {
          padding: '40px',
          borderRadius: '0',
          width: '1200px'
        }
      });
      if (blob) {
        const file = new File([blob], `Business_Report_${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'Business Insights Report',
          text: 'Check out our latest business performance metrics.'
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 shrink-0">
            <i className="fa-solid fa-chart-line text-2xl"></i>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Business Insights</h2>
            <p className="text-slate-500 font-medium mt-1">Real-time analysis of your construction pipeline and conversion metrics.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
            <input 
              type="date" 
              className="bg-transparent text-xs font-bold outline-none px-2"
              value={dateRange.start}
              onChange={e => setDateRange({...dateRange, start: e.target.value})}
            />
            <span className="text-slate-300">to</span>
            <input 
              type="date" 
              className="bg-transparent text-xs font-bold outline-none px-2"
              value={dateRange.end}
              onChange={e => setDateRange({...dateRange, end: e.target.value})}
            />
            {(dateRange.start || dateRange.end) && (
              <button 
                onClick={() => setDateRange({start: '', end: ''})}
                className="text-slate-400 hover:text-red-500 px-2"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              disabled={isExporting}
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <i className={`fa-solid ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf text-red-500'}`}></i>
              PDF
            </button>
            <button 
              disabled={isExporting}
              onClick={() => handleExport('png')}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <i className={`fa-solid ${isExporting ? 'fa-spinner fa-spin' : 'fa-image text-blue-500'}`}></i>
              PNG
            </button>
            <button 
              disabled={isExporting}
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
            >
              <i className="fa-solid fa-share-nodes"></i>
              Share
            </button>
          </div>
        </div>
      </header>

      <div ref={reportRef} className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Conversion Rate</div>
            <div className="text-4xl font-black text-blue-600">{stats.conversionRate.toFixed(1)}%</div>
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                style={{ width: `${stats.conversionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Business Value</div>
            <div className="text-4xl font-black text-slate-900">₹{(stats.businessValue / 100000).toFixed(1)}L</div>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">From {stats.converted} projects</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Pending Pipeline</div>
            <div className="text-4xl font-black text-slate-900">{stats.pending}</div>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Active Estimates</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Estimates</div>
            <div className="text-4xl font-black text-slate-900">{stats.total}</div>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Filtered Count</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <i className="fa-solid fa-chart-line text-blue-600"></i>
              Monthly Performance
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Bar name="Estimates" dataKey="estimates" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Bar name="Business" dataKey="business" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <i className="fa-solid fa-chart-pie text-blue-600"></i>
              Status Distribution
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-2">Revenue Forecast</h3>
            <p className="text-slate-400 font-medium mb-8">Based on your current pending pipeline value.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Pipeline Value</div>
                <div className="text-3xl font-black">₹{(stats.totalValue / 100000).toFixed(2)}L</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Expected Revenue (at {stats.conversionRate.toFixed(0)}%)</div>
                <div className="text-3xl font-black text-emerald-400">₹{((stats.totalValue * stats.conversionRate / 100) / 100000).toFixed(2)}L</div>
              </div>
              <div className="flex items-center">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Top Project Scope</p>
                  <p className="text-sm font-bold">New Construction (Turnkey)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]"></div>
        </div>
      </div>
    </div>
  );
};

export default BusinessAnalytics;
