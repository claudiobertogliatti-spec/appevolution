import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RealOfferSections from './OfferSections';

const enabled = { start: { enabled: true }, partnership: { enabled: true } };
const OfferSections = (props) => <RealOfferSections checkoutReadiness={enabled} partnerId="p1" {...props} />;

test.each([undefined, {}, { start: { enabled: false }, partnership: { enabled: false } }])('nessuna accettazione o checkout se i gate sono chiusi o mancanti: %j', (checkoutReadiness) => {
  global.fetch = jest.fn();
  render(<RealOfferSections token="t" checkoutReadiness={checkoutReadiness} />);
  screen.getAllByRole('button').forEach((button) => {
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
  });
  expect(global.fetch).not.toHaveBeenCalled();
  delete global.fetch;
});

test('prezzi reali + credito + upgrade; niente prezzo inventato', () => {
  render(<OfferSections token="t" name="Marco" />);
  // 390 compare due volte (prezzo Start + riga credito) → getAllByText
  expect(screen.getAllByText(/390\s*€/).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/2\.990\s*€/)).toBeTruthy();
  // riga upgrade reale (credito Start scalato): 2.600 €
  expect(screen.getByText(/2\.600\s*€/)).toBeTruthy();
  expect(screen.getByText(/tornano interi come credito/i)).toBeTruthy();
});

test('ponte personalizzato col nome + rilettura del collo di bottiglia', () => {
  render(<OfferSections token="t" name="Marco Rossi" />);
  expect(screen.getByText(/Bene Marco/)).toBeTruthy();
  expect(screen.getByText(/si nasconde il collo di bottiglia/i)).toBeTruthy();
});

test('modello foot-in-the-door: Start prima, divider turbo, Partnership dopo', () => {
  const { container } = render(<OfferSections token="t" name="Marco" />);
  const html = container.innerHTML;
  // ordine fisso nel DOM: Start (390) prima della Partnership (2.990)
  expect(html.indexOf('390')).toBeLessThan(html.indexOf('2.990'));
  // il divider "turbo" fa da transizione all'upgrade
  expect(screen.getByText(/mettere il turbo/i)).toBeTruthy();
});

test('anti-anchoring: la Partnership resta SEMPRE l\'hero visivo, mai lo Start', () => {
  const { container } = render(<OfferSections token="t" name="Marco" />);
  const startNode = container.querySelector('[data-offer="start"]');
  const partnershipNode = container.querySelector('[data-offer="partnership"]');
  expect(startNode.compareDocumentPosition(partnershipNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(partnershipNode.classList.contains('insider-offer--hero')).toBe(true);
  expect(startNode.classList.contains('insider-offer--hero')).toBe(false);
});

describe('wiring checkout', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    delete global.fetch;
    window.location = originalLocation;
  });

  test('Start CTA chiama il vero endpoint start_checkout e redirige a Stripe', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, checkout_url: 'https://stripe.test/start' }),
    }));

    render(<OfferSections token="t" name="Marco" />);
    fireEvent.click(screen.getByRole('button', { name: /inizia da ciak start/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/ciak/client/start/checkout');
    expect(options.method).toBe('POST');
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/start'));
  });

  test('errore onesto sul CTA Start: mai un finto successo', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }));

    render(<OfferSections token="t" name="Marco" />);
    fireEvent.click(screen.getByRole('button', { name: /inizia da ciak start/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(window.location.href).toBe('');
  });

  test('Partnership CTA: accetta -> checkbox contratto -> firma-contratto -> pagamento-stripe -> redirect', async () => {
    global.fetch = jest.fn((url) => {
      if (url === '/api/contract/text/p1') {
        return Promise.resolve({ ok: true, json: async () => ({ contract_text: 'Contratto pronto' }) });
      }
      if (url === '/api/proposta/t/accetta') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) });
      }
      if (url === '/api/proposta/t/firma-contratto') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, signed_at: 'now' }) });
      }
      if (url === '/api/proposta/t/pagamento-stripe') {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ success: true, checkout_url: 'https://stripe.test/partnership' }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    render(<OfferSections token="t" name="Marco" />);
    fireEvent.click(screen.getByRole('button', { name: /entra in partnership/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/proposta/t/accetta', expect.objectContaining({ method: 'POST' })));

    // La pagina del contratto compare solo dopo l'accettazione — gate reale, non finto.
    const [conditionsCheckbox, declarationCheckbox] = await screen.findAllByRole('checkbox');
    await screen.findByText('Contratto pronto');
    fireEvent.click(conditionsCheckbox);
    fireEvent.click(declarationCheckbox);
    const payBtn = screen.getByRole('button', { name: /paga|procedi/i });
    fireEvent.click(payBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/proposta/t/firma-contratto',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clausole_vessatorie_approved: true,
          consenso_checkbox: true,
          dichiarazione_imprenditoriale: true,
          piva: '',
        }),
      }),
    ));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/proposta/t/pagamento-stripe', expect.objectContaining({ method: 'POST' })));
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/partnership'));
  });

  test('errore onesto se firma-contratto fallisce: niente pagamento-stripe, niente finto successo', async () => {
    global.fetch = jest.fn((url) => {
      if (url === '/api/contract/text/p1') {
        return Promise.resolve({ ok: true, json: async () => ({ contract_text: 'Contratto pronto' }) });
      }
      if (url === '/api/proposta/t/accetta') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) });
      }
      if (url === '/api/proposta/t/firma-contratto') {
        return Promise.resolve({ ok: false, status: 422, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    render(<OfferSections token="t" name="Marco" />);
    fireEvent.click(screen.getByRole('button', { name: /entra in partnership/i }));

    const [conditionsCheckbox, declarationCheckbox] = await screen.findAllByRole('checkbox');
    await screen.findByText('Contratto pronto');
    fireEvent.click(conditionsCheckbox);
    fireEvent.click(declarationCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /paga|procedi/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalledWith('/api/proposta/t/pagamento-stripe', expect.anything());
    expect(window.location.href).toBe('');
  });
});
