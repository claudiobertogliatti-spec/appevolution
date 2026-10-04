import { uploadPartnerFile } from './uploadMateriale';

// Fake XHR: lets each test decide how the server answers.
function fakeXhr(answer) {
  const x = {
    headers: {}, upload: {},
    open: jest.fn(function open(method, url) { x.method = method; x.url = url; }),
    setRequestHeader: jest.fn((k, v) => { x.headers[k] = v; }),
    send: jest.fn((body) => { x.body = body; setTimeout(() => answer(x), 0); }),
  };
  return x;
}

beforeEach(() => localStorage.setItem('ciak_partner_token', 'test-jwt'));
afterEach(() => localStorage.clear());

const file = () => new File(['abc'], 'Fatture.pdf', { type: 'application/pdf' });

test('posts the file to the real upload endpoint with the partner token and no forced Content-Type', async () => {
  const x = fakeXhr((r) => { r.status = 200; r.responseText = JSON.stringify({ success: true }); r.onload(); });
  const res = await uploadPartnerFile('p1', file(), () => {}, () => x);
  expect(x.method).toBe('POST');
  expect(x.url).toBe('/api/partner-journey/operativo/upload/p1');
  expect(x.headers.Authorization).toBe('Bearer test-jwt');
  expect(x.headers['Content-Type']).toBeUndefined(); // the browser sets the multipart boundary
  expect(x.body.get('file').name).toBe('Fatture.pdf');
  expect(res).toEqual({ ok: true, fallback: null });
});

test('reports progress, capped at 99 until the server has confirmed', async () => {
  const seen = [];
  const x = fakeXhr((r) => {
    r.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 });
    r.status = 200; r.responseText = JSON.stringify({ success: true }); r.onload();
  });
  await uploadPartnerFile('p1', file(), (p) => seen.push(p), () => x);
  expect(seen[0]).toBe(99);
  expect(seen[seen.length - 1]).toBe(100);
});

test('a 200 without success:true is NOT a success', async () => {
  const x = fakeXhr((r) => { r.status = 200; r.responseText = JSON.stringify({ success: false }); r.onload(); });
  expect(await uploadPartnerFile('p1', file(), () => {}, () => x)).toEqual({ ok: false, error: 'server' });
});

test('a non-JSON or 500 answer is a failure', async () => {
  const a = fakeXhr((r) => { r.status = 200; r.responseText = '<html>proxy</html>'; r.onload(); });
  expect((await uploadPartnerFile('p1', file(), () => {}, () => a)).ok).toBe(false);
  const b = fakeXhr((r) => { r.status = 500; r.responseText = '{}'; r.onload(); });
  expect((await uploadPartnerFile('p1', file(), () => {}, () => b)).ok).toBe(false);
});

test('401/403 are reported as an expired session, network errors as network', async () => {
  const a = fakeXhr((r) => { r.status = 401; r.responseText = ''; r.onload(); });
  expect(await uploadPartnerFile('p1', file(), () => {}, () => a)).toEqual({ ok: false, error: 'auth' });
  const b = fakeXhr((r) => { r.onerror(); });
  expect(await uploadPartnerFile('p1', file(), () => {}, () => b)).toEqual({ ok: false, error: 'network' });
});

test('a local-storage fallback is passed on so the page can be honest about it', async () => {
  const x = fakeXhr((r) => { r.status = 200; r.responseText = JSON.stringify({ success: true, fallback: 'local' }); r.onload(); });
  expect(await uploadPartnerFile('p1', file(), () => {}, () => x)).toEqual({ ok: true, fallback: 'local' });
});
