import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';

export function Homepage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#FFFFFF', borderColor: '#ECEDEF' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black" style={{ color: '#1E2128' }}>E</span>
            </div>
            <div>
              <span className="font-black text-lg" style={{ color: '#1E2128' }}>
                EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
              </span>
            </div>
          </div>
          
          {/* Partner Link */}
          <a 
            href="/partner-login"
            className="text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: '#5F6572' }}
          >
            Sei già partner? <span style={{ color: '#F5C518' }}>Accedi</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* Title - Centered */}
          <h1 
            className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-12 text-center" 
            style={{ color: '#1E2128' }}
          >
            Scopri se la tua competenza può diventare una{' '}
            <span style={{ color: '#F5C518' }}>Accademia Digitale</span>{' '}
            che vende davvero
          </h1>

          {/* Two Columns */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Column - Image */}
            <div className="flex justify-center lg:justify-end">
              <img 
                src="/images/hero-analisi.png" 
                alt="Analisi Strategica" 
                className="w-full max-w-md rounded-2xl"
              />
            </div>

            {/* Right Column - Content */}
            <div>
              {/* Subtitle */}
              <p 
                className="text-lg mb-8" 
                style={{ color: '#5F6572' }}
              >
                Analisi Strategica selettiva per professionisti che vogliono trasformare la propria competenza in un asset digitale.
              </p>

              {/* Benefits */}
              <div className="flex flex-col gap-3 mb-8">
                {[
                  'Analisi del tuo posizionamento',
                  'Valutazione reale del mercato',
                  'Diagnosi della fattibilità del progetto',
                  'Videocall strategica entro 48 ore'
                ].map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F5C518' }} />
                    <span style={{ color: '#1E2128' }}>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <a
                href="/analisi-strategica"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
                style={{ background: '#F5C518', color: '#1E2128' }}
                data-testid="cta-analisi-strategica"
              >
                Richiedi l'Analisi Strategica
                <ArrowRight className="w-5 h-5" />
              </a>

              {/* Scarcity Text */}
              <p 
                className="mt-4 text-sm font-medium"
                style={{ color: '#9CA3AF' }}
              >
                Solo 4 nuovi progetti accettati ogni mese
              </p>

              {/* Partner Link */}
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid #ECEDEF' }}>
                <a 
                  href="/partner-login"
                  className="text-sm transition-colors hover:opacity-70"
                  style={{ color: '#5F6572' }}
                >
                  Sei già partner Evolution PRO?{' '}
                  <span className="font-medium" style={{ color: '#F5C518' }}>Accedi</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center" style={{ borderTop: '1px solid #ECEDEF' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-xs font-black" style={{ color: '#1E2128' }}>E</span>
            </div>
            <span className="font-bold text-sm" style={{ color: '#1E2128' }}>
              EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
            </span>
          </div>
          <p className="text-sm mb-2" style={{ color: '#5F6572' }}>
            Trasformiamo competenze reali in asset digitali sostenibili.
          </p>
          <a 
            href="https://www.evolution-pro.it" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium hover:opacity-70 transition-colors"
            style={{ color: '#F5C518' }}
          >
            www.evolution-pro.it
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;
