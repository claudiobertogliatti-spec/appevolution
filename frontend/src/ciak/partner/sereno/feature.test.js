test('new partner experience is disabled unless explicitly enabled at build time', () => {
  const previous = process.env.REACT_APP_PARTNER_SERENO;
  try {
    for (const value of [undefined, 'false', '1', 'TRUE']) {
      if (value === undefined) delete process.env.REACT_APP_PARTNER_SERENO;
      else process.env.REACT_APP_PARTNER_SERENO = value;
      jest.isolateModules(() => expect(require('./feature').PARTNER_SERENO_ENABLED).toBe(false));
    }
    process.env.REACT_APP_PARTNER_SERENO = 'true';
    jest.isolateModules(() => expect(require('./feature').PARTNER_SERENO_ENABLED).toBe(true));
  } finally {
    if (previous === undefined) delete process.env.REACT_APP_PARTNER_SERENO;
    else process.env.REACT_APP_PARTNER_SERENO = previous;
  }
});
