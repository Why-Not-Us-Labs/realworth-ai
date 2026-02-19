import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Bullseye x RealWorth — AI-Powered Sneaker Offers';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://bullseyesb.realworth.ai/partners/bullseye-logo.png"
            alt="Bullseye"
            height={72}
          />
          <span style={{ color: '#94a3b8', fontSize: '28px', fontWeight: 300 }}>
            x
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://bullseyesb.realworth.ai/partners/realworth-collab-logo.png"
            alt="RealWorth"
            height={72}
          />
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: '#64748b',
            fontSize: '22px',
            marginBottom: '28px',
            letterSpacing: '0.5px',
          }}
        >
          AI-Powered Sneaker Offers
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#0f172a',
            fontSize: '42px',
            fontWeight: 700,
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Get an instant cash offer for your sneakers
        </div>

        {/* Tagline */}
        <div style={{ color: '#64748b', fontSize: '20px' }}>
          Snap photos · Get AI valuation · Get paid
        </div>
      </div>
    ),
    { ...size }
  );
}
