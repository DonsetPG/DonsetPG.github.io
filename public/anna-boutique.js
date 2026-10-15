import { sendCompletion } from './anna-notification.js';

const $ = (selector) => document.querySelector(selector);
const money = (quantity) => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
}).format(165 * quantity);
let cart = null;
let submitting = false;
let completed = false;
let galleryIndex = 0;
const thumbnails = [...document.querySelectorAll('[data-image]')];
const cartDialog = $('#cart-dialog');
const checkoutDialog = $('#checkout-dialog');
const form = $('#checkout-form');
const emailInput = $('#solver-email');
const submitButton = $('#complete-puzzle');
const initialSubmitText = submitButton.textContent;

function showImage(index) {
  galleryIndex = (index + thumbnails.length) % thumbnails.length;
  const thumbnail = thumbnails[galleryIndex];
  $('#product-image').src = thumbnail.dataset.image;
  $('#product-image').alt = thumbnail.dataset.alt || 'Veste Du vent dans les cheveux, Camel';
  thumbnails.forEach((button, buttonIndex) => {
    button.setAttribute('aria-pressed', String(buttonIndex === galleryIndex));
    button.classList.toggle('is-active', buttonIndex === galleryIndex);
  });
  $('#gallery-position').textContent = `${galleryIndex + 1} / ${thumbnails.length}`;
}

thumbnails.forEach((button, index) => button.addEventListener('click', () => showImage(index)));
$('#gallery-prev')?.addEventListener('click', () => showImage(galleryIndex - 1));
$('#gallery-next')?.addEventListener('click', () => showImage(galleryIndex + 1));

function renderCart() {
  $('#cart-count').textContent = String(cart?.quantity ?? 0);
  $('#open-cart').setAttribute('aria-label', `Ouvrir le panier, ${cart?.quantity ?? 0} article(s)`);
  $('#cart-empty').hidden = Boolean(cart);
  $('#cart-content').hidden = !cart;
  $('#begin-checkout').disabled = !cart;
  if (!cart) return;
  $('#cart-size').textContent = cart.size;
  $('#cart-quantity').textContent = String(cart.quantity);
  $('#cart-total').textContent = money(cart.quantity);
  $('#cart-decrease').disabled = cart.quantity <= 1;
  $('#cart-increase').disabled = cart.quantity >= 5;
}

function openDialog(dialog) {
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

function closeDialog(dialog) {
  if (submitting && dialog === checkoutDialog) return;
  dialog.close();
}

for (const dialog of [cartDialog, checkoutDialog]) {
  dialog.addEventListener('close', () => {
    if (!cartDialog.open && !checkoutDialog.open) document.body.classList.remove('dialog-open');
  });
  dialog.addEventListener('cancel', (event) => {
    if (submitting && dialog === checkoutDialog) event.preventDefault();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      closeDialog(dialog);
    }
  });
}

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(button.closest('dialog')));
});
$('#open-cart').addEventListener('click', () => {
  renderCart();
  openDialog(cartDialog);
});

document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    $('#size-message').textContent = '';
  });
});

$('#add-to-cart').addEventListener('click', () => {
  const size = $('input[name="size"]:checked')?.value;
  if (!size) {
    $('#size-message').textContent = 'Choisissez votre taille pour continuer.';
    $('input[name="size"]').focus();
    return;
  }
  cart = { size, quantity: cart?.size === size ? Math.min(cart.quantity + 1, 5) : 1 };
  completed = false;
  renderCart();
  openDialog(cartDialog);
});

$('#cart-decrease').addEventListener('click', () => {
  if (cart) cart.quantity = Math.max(1, cart.quantity - 1);
  renderCart();
});
$('#cart-increase').addEventListener('click', () => {
  if (cart) cart.quantity = Math.min(5, cart.quantity + 1);
  renderCart();
});
$('#cart-remove').addEventListener('click', () => {
  cart = null;
  renderCart();
});

$('#begin-checkout').addEventListener('click', () => {
  if (!cart) return;
  $('#checkout-total').textContent = money(cart.quantity);
  $('#checkout-summary').textContent = `Camel · Taille ${cart.size} · Quantité ${cart.quantity}`;
  $('#checkout-entry').hidden = false;
  $('#checkout-success').hidden = true;
  $('#checkout-status').textContent = '';
  $('#checkout-error').textContent = '';
  closeDialog(cartDialog);
  openDialog(checkoutDialog);
  emailInput.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting || completed || !cart) return;
  emailInput.value = emailInput.value.trim();
  if (!form.reportValidity()) return;
  if (new FormData(form).get('_honey')) return;

  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Validation en cours…';
  emailInput.readOnly = true;
  form.setAttribute('aria-busy', 'true');
  $('#checkout-error').textContent = '';
  $('#checkout-status').textContent = 'Paiement simulé. Transmission de votre résolution…';
  checkoutDialog.querySelectorAll('[data-close-dialog]').forEach((button) => { button.disabled = true; });

  try {
    const result = await sendCompletion({
      email: emailInput.value,
      size: cart.size,
      quantity: cart.quantity,
      pageUrl: `${location.origin}${location.pathname}`,
    });
    completed = true;
    $('#success-email').textContent = emailInput.value;
    $('#checkout-entry').hidden = true;
    $('#checkout-success').hidden = false;
    $('#checkout-status').textContent = result.activationRequired
      ? 'Votre résolution est reçue par le service. La notification attend l’activation par Paul.'
      : 'Votre résolution a été transmise au service de notification.';
    cart = null;
    renderCart();
    $('#success-title').focus();
  } catch (error) {
    $('#checkout-status').textContent = '';
    $('#checkout-error').textContent = error.message || 'L’envoi a échoué. Vous pouvez réessayer.';
  } finally {
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = initialSubmitText;
    emailInput.readOnly = false;
    form.removeAttribute('aria-busy');
    checkoutDialog.querySelectorAll('[data-close-dialog]').forEach((button) => { button.disabled = false; });
  }
});

showImage(0);
renderCart();
