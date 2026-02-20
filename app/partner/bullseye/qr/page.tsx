'use client';

import { QRCodeSVG } from 'qrcode.react';
import { BULLSEYE_STORES } from '@/lib/partnerConfig';

const BASE_URL = 'https://bullseyesb.realworth.ai';

export default function BullseyeQRPage() {
  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 print:mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Bullseye Store QR Codes</h1>
          <p className="text-sm text-slate-500 mt-1">Print and display at each store location</p>
          <button
            onClick={() => window.print()}
            className="mt-4 px-4 py-2 bg-red-600 text-white font-medium rounded-lg text-sm hover:bg-red-700 print:hidden"
          >
            Print QR Codes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:grid-cols-3 print:gap-4">
          {BULLSEYE_STORES.map((store) => {
            const url = `${BASE_URL}/?store=${store.id}`;
            return (
              <div
                key={store.id}
                className="border-2 border-slate-200 rounded-xl p-6 text-center print:border print:p-4 print:break-inside-avoid"
              >
                <div className="flex items-center justify-center gap-2 mb-4 print:mb-2">
                  <img src="/partners/bullseye-logo.png" alt="Bullseye" className="h-6" />
                  <span className="text-slate-300 text-sm">x</span>
                  <img src="/partners/realworth-collab-logo.png" alt="RealWorth" className="h-6" />
                </div>
                <div className="flex justify-center mb-4 print:mb-2">
                  <QRCodeSVG
                    value={url}
                    size={180}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{store.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Scan to get an instant sneaker offer</p>
                <p className="text-[10px] text-slate-400 mt-2 font-mono break-all">{url}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
