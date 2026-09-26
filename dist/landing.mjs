// Os CTAs da landing page reutilizam o botão original, com o fluxo e o evento já existentes.
document.querySelectorAll('.lp-cta').forEach(button => {
  button.addEventListener('click', () => document.getElementById('start').click());
});
