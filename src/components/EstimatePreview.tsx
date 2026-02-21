import React, { useRef, useState } from 'react';
import { Estimate } from '../types.ts';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface EstimatePreviewProps {
  estimate: Estimate;
  companyLogo: string | null;
  companyInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  onClose: () => void;
}

const EstimatePreview: React.FC<EstimatePreviewProps> = ({ estimate, companyLogo, companyInfo, onClose }) => {
  const estimateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const fileName = `${estimate.estimateNumber}_${estimate.customerName.replace(/\s+/g, '_')}`;

  const handleExport = async (format: 'png' | 'jpeg' | 'pdf' | 'excel') => {
    if (!estimateRef.current && format !== 'excel') return;
    setIsExporting(true);
    setShowDownloadMenu(false);

    try {
      if (format === 'pdf') {
        const node = estimateRef.current!;
        await document.fonts.ready;

        // Forced style to ensure no parent layout affects the capture dimensions
        const dataUrl = await htmlToImage.toPng(node, { 
          pixelRatio: 2, 
          backgroundColor: '#ffffff',
          width: node.offsetWidth,
          height: node.scrollHeight,
          style: {
            margin: '0',
            padding: '32px',
            left: '0',
            top: '0',
            position: 'static'
          }
        });
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(dataUrl);
        const totalPdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = totalPdfHeight;
        let position = 0;
        
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pdfHeight;
        
        while (heightLeft > 0) {
          position = heightLeft - totalPdfHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, totalPdfHeight);
          heightLeft -= pdfHeight;
        }
        
        pdf.save(`${fileName}.pdf`);
      } else if (format === 'png' || format === 'jpeg') {
        const node = estimateRef.current!;
        const options = { pixelRatio: 3, backgroundColor: '#ffffff' };
        const dataUrl = format === 'png' 
          ? await htmlToImage.toPng(node, options)
          : await htmlToImage.toJpeg(node, { ...options, quality: 0.95 });
        
        const link = document.createElement('a');
        link.download = `${fileName}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        link.href = dataUrl;
        link.click();
      } else if (format === 'excel') {
        const headerData = [
          ["Pixar World Construction Private Limited"],
          ["Estimate Number", estimate.estimateNumber],
          ["Customer", estimate.customerName],
          ["Date", estimate.date],
          [],
          ["Sr.", "Item Name", "Unit", "Qty.", "Rate", "Total"]
        ];
        const itemData = estimate.items.map((it, idx) => [idx+1, it.itemName, it.unit, it.qty, it.rate, it.total]);
        const footerData = [
          [],
          ["", "", "", "", "Sub Total", estimate.subTotal],
          ["", "", "", "", `Discount ${estimate.discountType === 'percent' ? `(${estimate.discount}%)` : ''}`, -estimate.discountValue],
          ["", "", "", "", "GST (Estimated)", estimate.gstExtra],
          ["", "", "", "", "Grand Total", estimate.totalAmount]
        ];
        const ws = XLSX.utils.aoa_to_sheet([...headerData, ...itemData, ...footerData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estimate");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!estimateRef.current || !navigator.share) return;
    setIsExporting(true);
    try {
      const blob = await htmlToImage.toBlob(estimateRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      if (blob) {
        const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: `Estimate for ${estimate.customerName}` });
      }
    } catch (e) { console.error(e); }
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex items-start justify-center p-4 md:p-10">
      <div className="bg-white max-w-[1000px] w-full shadow-2xl rounded overflow-hidden p-8 print:p-0 relative">
        <button onClick={onClose} className="absolute top-4 right-4 bg-slate-100 p-2 rounded-full hover:bg-slate-200 print:hidden z-10">
          <i className="fa-solid fa-times"></i>
        </button>
        
        <div className="mb-6 flex flex-wrap justify-end gap-3 print:hidden sticky top-0 bg-white/90 backdrop-blur pb-4 pt-4 border-b z-20">
          {isExporting && <div className="mr-auto text-blue-600 animate-pulse font-bold text-sm"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Generating...</div>}
          
          <div className="relative">
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-all">
              <i className="fa-solid fa-download"></i> Download <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </button>
            {showDownloadMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3"><i className="fa-solid fa-file-pdf text-red-500"></i> Save as PDF</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3"><i className="fa-solid fa-file-excel text-green-600"></i> Excel (.xlsx)</button>
                <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3"><i className="fa-solid fa-file-image text-blue-500"></i> PNG Image</button>
              </div>
            )}
          </div>

          <button onClick={handleShare} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><i className="fa-solid fa-share-nodes"></i> Share</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><i className="fa-solid fa-print"></i> Print</button>
        </div>

        <div ref={estimateRef} className="bg-white p-4 sm:p-8 relative overflow-visible">
          <div className="flex justify-between items-start mb-6 border-b-4 border-slate-900 pb-4">
            <div className="flex items-center gap-4">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain bg-white border-2 border-slate-900 rounded-xl" />
              ) : (
                <div className="w-20 h-20 bg-[#FFD700] rounded-full flex items-center justify-center border-2 border-black">
                  <div className="flex flex-col items-center">
                    <span className="text-black font-black text-2xl leading-none">P</span>
                    <span className="text-[6px] text-black font-bold uppercase leading-none">World</span>
                  </div>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black text-slate-900 leading-none">{companyInfo.name}</h1>
                <p className="text-xs text-slate-600 mt-1">{companyInfo.address}</p>
              </div>
            </div>
            <div className="text-[8px] text-right text-slate-700 shrink-0">
              <p>CIN : U43299GJ2024PTC150534</p>
              <p>GST : 24AAOCP6536H1Z4</p>
              <p>Mo: {companyInfo.phone}</p>
              <p>Email: {companyInfo.email}</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 border p-2 mb-4">
            <h2 className="text-lg font-bold underline">General Estimate</h2>
            <p className="font-bold text-sm">Date: {estimate.date}</p>
          </div>

          <div className="grid grid-cols-3 border border-slate-900 mb-6 text-xs divide-x divide-slate-900">
            <div className="col-span-2 divide-y divide-slate-900">
              <div className="p-1 flex"><span className="w-40 font-bold shrink-0">Customer Name :</span> <span>{estimate.customerName}</span></div>
              <div className="p-1 flex"><span className="w-40 font-bold shrink-0">Site Address :</span> <span>{estimate.siteAddress}</span></div>
              <div className="p-1 flex"><span className="w-40 font-bold shrink-0">Project Type :</span> <span>{estimate.projectType}</span></div>
            </div>
            <div className="divide-y divide-slate-900">
              <div className="p-1 flex"><span className="w-20 font-bold shrink-0">Mob :</span> <span>{estimate.phoneNumber}</span></div>
              <div className="p-1 flex"><span className="w-20 font-bold shrink-0">EST No:</span> <span>{estimate.estimateNumber}</span></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-xs mb-6">
              <thead className="bg-slate-50">
                <tr className="divide-x divide-slate-900">
                  <th className="border border-slate-900 p-1 w-8">Sr.</th>
                  <th className="border border-slate-900 p-1 text-left">Item Name</th>
                  <th className="border border-slate-900 p-1 w-16">Unit</th>
                  <th className="border border-slate-900 p-1 w-20">Price</th>
                  <th className="border border-slate-900 p-1 w-12">Qty.</th>
                  <th className="border border-slate-900 p-1 w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {estimate.items.map((item, idx) => (
                  <tr key={idx} className="divide-x divide-slate-900">
                    <td className="p-1 text-center">{idx + 1}</td>
                    <td className="p-1 font-bold">{item.itemName}</td>
                    <td className="p-1 text-center">{item.unit}</td>
                    <td className="p-1 text-center">{item.rate}</td>
                    <td className="p-1 text-center">{item.qty}</td>
                    <td className="p-1 text-right font-bold">₹ {item.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                <tr className="divide-x divide-slate-900 border-t border-slate-900">
                  <td colSpan={5} className="p-1 text-right font-bold text-[10px] uppercase">Sub Total</td>
                  <td className="p-1 text-right font-bold">₹ {estimate.subTotal.toLocaleString('en-IN')}</td>
                </tr>
                {estimate.discountValue > 0 && (
                  <tr className="divide-x divide-slate-900">
                    <td colSpan={5} className="p-1 text-right font-bold text-[10px] uppercase text-green-600">Discount {estimate.discountType === 'percent' ? `(${estimate.discount}%)` : ''}</td>
                    <td className="p-1 text-right font-bold text-green-600">- ₹ {estimate.discountValue.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                {estimate.gstExtra > 0 && (
                  <tr className="divide-x divide-slate-900">
                    <td colSpan={5} className="p-1 text-right font-bold text-[10px] uppercase">GST (Estimated)</td>
                    <td className="p-1 text-right font-bold">+ ₹ {estimate.gstExtra.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                <tr className="bg-slate-900 text-white divide-x divide-white border-t-2 border-black">
                  <td colSpan={5} className="p-2 text-right font-black uppercase text-[10px]">Grand Total Estimated</td>
                  <td className="p-2 text-right font-black text-lg">₹ {estimate.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-slate-900 text-[10px] mt-4">
            <div className="bg-slate-900 text-white text-center font-bold p-1 uppercase tracking-widest">Work Details & Terms</div>
            <div className="p-2 space-y-1">
              {estimate.terms.map((term, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="w-4 font-bold shrink-0">{idx + 1}</span>
                  <span>{term}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 flex justify-between items-end border-t pt-4">
            <div className="text-[10px] text-slate-500"><p>www.pixarworldconstruction.in</p></div>
            <div className="text-center font-bold text-xs w-72">
              <div className="h-16"></div>
              <p className="border-t border-slate-900 pt-2">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePreview;