import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

jest.mock('./api', () => ({ login: jest.fn(), requestPasswordReset: jest.fn() }));
const { login, requestPasswordReset } = require('./api');
const { LoginScreen } = require('./LoginScreen');

afterEach(() => { cleanup(); jest.clearAllMocks(); });

const fill = (email, password) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Entra' }));

test('every field has a visible label tied to it (a placeholder alone disappears when typing)', () => {
  render(<LoginScreen onLogin={() => {}} />);
  expect(screen.getByLabelText('Email').tagName).toBe('INPUT');
  expect(screen.getByLabelText('Password').tagName).toBe('INPUT');
  expect(document.querySelector('label[for="login-email"]').textContent).toBe('Email');
  expect(document.querySelector('label[for="login-password"]').textContent).toBe('Password');
});

test('the browser is told which field is which, so it can remember and fill the credentials', () => {
  render(<LoginScreen onLogin={() => {}} />);
  expect(screen.getByLabelText('Email').getAttribute('autocomplete')).toBe('username');
  expect(screen.getByLabelText('Email').getAttribute('inputmode')).toBe('email');
  expect(screen.getByLabelText('Email').getAttribute('autocapitalize')).toBe('none');
  expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password');
});

test('"Mostra password" reveals what was typed and "Nascondi password" hides it again', () => {
  render(<LoginScreen onLogin={() => {}} />);
  const pwd = screen.getByLabelText('Password');
  expect(pwd.getAttribute('type')).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Mostra password' }));
  expect(pwd.getAttribute('type')).toBe('text');
  expect(screen.getByRole('button', { name: 'Nascondi password' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Nascondi password' }));
  expect(pwd.getAttribute('type')).toBe('password');
});

test('the text no longer talks to admins: it is addressed to the partner', () => {
  render(<LoginScreen onLogin={() => {}} />);
  expect(screen.queryByText(/admin/i)).toBeNull();
  expect(screen.queryByText(/supervisione/i)).toBeNull();
  expect(screen.getByText('Entra con la tua email e la tua password.')).toBeTruthy();
});

test('logging in sends the credentials (the form also submits with Enter) and hands over the user', async () => {
  login.mockResolvedValue({ ok: true, user: { name: 'Giulia', role: 'partner' } });
  const onLogin = jest.fn();
  render(<LoginScreen onLogin={onLogin} />);
  fill('giulia@esempio.it', 'segreta');
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ name: 'Giulia', role: 'partner' }));
  expect(login).toHaveBeenCalledWith('giulia@esempio.it', 'segreta');
});

test('while the request runs the button says so and cannot be pressed twice', async () => {
  let finish;
  login.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  render(<LoginScreen onLogin={() => {}} />);
  fill('a@b.it', 'x');
  submit();
  const busy = await screen.findByRole('button', { name: 'Entro…' });
  expect(busy.disabled).toBe(true);
  expect(busy.getAttribute('aria-busy')).toBe('true');
  finish({ ok: false, error: 'Email o password non corretti' });
  await screen.findByRole('alert');
});

test('empty fields get a clear message and nothing is sent', () => {
  render(<LoginScreen onLogin={() => {}} />);
  submit();
  expect(screen.getByRole('alert').textContent).toBe('Inserisci email e password');
  expect(login).not.toHaveBeenCalled();
});

test('a wrong password shows the message as an alert tied to both fields, and the user stays on the form', async () => {
  login.mockResolvedValue({ ok: false, error: 'Email o password non corretti' });
  const onLogin = jest.fn();
  render(<LoginScreen onLogin={onLogin} />);
  fill('a@b.it', 'sbagliata');
  submit();
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toBe('Email o password non corretti');
  expect(screen.getByLabelText('Email').getAttribute('aria-describedby')).toBe(alert.id);
  expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBe('true');
  expect(onLogin).not.toHaveBeenCalled();
});

test('forgot password: the field has a label, and the confirmation never promises the email left', async () => {
  requestPasswordReset.mockResolvedValue({ ok: true });
  render(<LoginScreen onLogin={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Password dimenticata?' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'Giulia@Esempio.it' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mandami il link' }));
  expect(await screen.findByText('Controlla la posta')).toBeTruthy();
  expect(requestPasswordReset).toHaveBeenCalledWith('Giulia@Esempio.it');
  // conditional, as the server answers ok for any address: "se … è registrato", never "email inviata"
  expect(screen.getByText((_, el) => el.tagName === 'P' && /^Se .* è\s+registrato/.test(el.textContent))).toBeTruthy();
  expect(screen.queryByText(/email inviata|abbiamo inviato/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Torna al login' }));
  expect(screen.getByRole('button', { name: 'Entra' })).toBeTruthy();
});

test('forgot password with no email asks for it and sends nothing', () => {
  render(<LoginScreen onLogin={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Password dimenticata?' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mandami il link' }));
  expect(screen.getByRole('alert').textContent).toBe('Inserisci la tua email');
  expect(requestPasswordReset).not.toHaveBeenCalled();
});
