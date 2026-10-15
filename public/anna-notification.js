// GitHub Pages serves static files. FormSubmit forwards this form to its owner.
// The owner must activate the form using FormSubmit's confirmation email.
const NOTIFICATION_ENDPOINT = 'https://formsubmit.co/ajax/paul.garnier.97@gmail.com';

export async function sendCompletion({ email, size, quantity, pageUrl }, {
  fetcher = globalThis.fetch,
  timeoutMs = 15000,
} = {}) {
  const address = email.trim();
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error('Indiquez une adresse e-mail valide.');
  }
  if (!['XS', 'S', 'M', 'L', 'XL'].includes(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    throw new Error('Votre panier doit contenir une taille et une quantité valides.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(NOTIFICATION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        email: address,
        message: `Someone solved the case with the email ${address}.`,
        product: 'Veste Du vent dans les cheveux · Camel',
        size,
        quantity,
        payment: 'Simulated only. No payment or order was made.',
        _subject: 'Anna: someone solved the case',
        _template: 'table',
        _url: pageUrl,
        _honey: '',
      }),
    });
    if (!response.ok) {
      throw new Error('La notification n’a pas pu être transmise. Réessayez dans un instant.');
    }

    const result = await response.json();
    const activationRequired = /activat|confirm your email|check your email/i.test(String(result?.message ?? ''));
    if (result?.success !== true && result?.success !== 'true') {
      if (activationRequired) {
        throw new Error('La notification attend l’activation du formulaire par Paul. Votre envoi n’est pas encore confirmé ; réessayez après son activation.');
      }
      throw new Error('Le service de notification n’a pas confirmé l’envoi. Réessayez dans un instant.');
    }
    return {
      accepted: true,
      activationRequired,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Le service met trop de temps à répondre. L’envoi n’est pas confirmé. Vous pouvez réessayer.');
    }
    if (error instanceof TypeError || error instanceof SyntaxError) {
      throw new Error('Le service de notification est indisponible. Vérifiez votre connexion et réessayez.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
