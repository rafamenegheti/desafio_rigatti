import '@testing-library/jest-dom/vitest';

// jsdom não implementa estes recursos de layout/DOM
Element.prototype.scrollIntoView = () => {};
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};
