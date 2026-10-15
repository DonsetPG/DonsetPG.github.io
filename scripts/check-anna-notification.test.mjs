import test from 'node:test';
import assert from 'node:assert/strict';
import { sendCompletion } from '../public/anna-notification.js';

const completion = {
  email: 'solver@example.com',
  size: 'M',
  quantity: 1,
  pageUrl: 'https://donsetpg.github.io/anna-boutique.html',
};
const response = (result) => ({ ok: true, json: async () => result });

test('sends a trimmed solver email and simulated purchase details to the owner', async () => {
  let calls = 0;
  const result = await sendCompletion({
    ...completion,
    email: '  solver@example.com  ',
    cardNumber: 'must-never-be-sent',
    securityCode: 'must-never-be-sent',
  }, {
    fetcher: async (url, options) => {
      calls += 1;
      assert.equal(url, 'https://formsubmit.co/ajax/paul.garnier.97@gmail.com');
      assert.equal(options.method, 'POST');
      assert.deepEqual(options.headers, { 'Content-Type': 'application/json', Accept: 'application/json' });
      assert.ok(options.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(options.body), {
        email: 'solver@example.com',
        message: 'Someone solved the case with the email solver@example.com.',
        product: 'Veste Du vent dans les cheveux · Camel',
        size: 'M',
        quantity: 1,
        payment: 'Simulated only. No payment or order was made.',
        _subject: 'Anna: someone solved the case',
        _template: 'table',
        _url: completion.pageUrl,
        _honey: '',
      });
      return response({ success: true, message: 'Submitted' });
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { accepted: true, activationRequired: false });
});

test('rejects invalid email and cart values before fetching', async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return response({ success: true }); };
  for (const email of ['', 'missing-at.example.com', 'two@@example.com', 'with space@example.com', `${'a'.repeat(243)}@example.com`]) {
    await assert.rejects(sendCompletion({ ...completion, email }, { fetcher }), /e-mail valide/);
  }
  for (const cart of [{ size: '' }, { size: 'XXL' }, { quantity: 0 }, { quantity: 6 }, { quantity: 1.5 }, { quantity: '1' }]) {
    await assert.rejects(sendCompletion({ ...completion, ...cart }, { fetcher }), /panier/);
  }
  assert.equal(calls, 0);
});

test('accepts boolean and string true success values', async () => {
  for (const success of [true, 'true']) {
    const result = await sendCompletion(completion, { fetcher: async () => response({ success }) });
    assert.deepEqual(result, { accepted: true, activationRequired: false });
  }
});

test('rejects HTTP failures and false or malformed success values', async () => {
  await assert.rejects(sendCompletion(completion, {
    fetcher: async () => ({ ok: false, status: 503, json: async () => ({ success: true }) }),
  }), /n’a pas pu être transmise/);
  for (const result of [null, {}, { success: false }, { success: 'false' }, { success: 1 }, { success: 'TRUE' }]) {
    await assert.rejects(sendCompletion(completion, { fetcher: async () => response(result) }), /n’a pas confirmé/);
  }
});

test('reports malformed JSON and network failures without claiming acceptance', async () => {
  for (const fetcher of [
    async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }),
    async () => { throw new TypeError('Failed to fetch'); },
  ]) {
    await assert.rejects(sendCompletion(completion, { fetcher }), /indisponible/);
  }
});

test('aborts a timed-out request and leaves notification status unconfirmed', async () => {
  let signal;
  await assert.rejects(sendCompletion(completion, {
    timeoutMs: 5,
    fetcher: async (_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    },
  }), /trop de temps.*n’est pas confirmé/);
  assert.equal(signal.aborted, true);
});

test('exposes activation requirements from accepted responses', async () => {
  for (const message of ['This form needs Activation', 'Confirm your email address', 'Please CHECK YOUR EMAIL']) {
    const result = await sendCompletion(completion, { fetcher: async () => response({ success: true, message }) });
    assert.deepEqual(result, { accepted: true, activationRequired: true });
  }
});

test('explains the actual activation-required response without claiming completion', async () => {
  await assert.rejects(sendCompletion(completion, {
    fetcher: async () => response({
      success: 'false',
      message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link.",
    }),
  }), /activation du formulaire par Paul/);
});
