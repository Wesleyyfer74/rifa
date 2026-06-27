const numbersGrid = document.querySelector('#numbersGrid');
const selectedCount = document.querySelector('#selectedCount');
const selectedTotal = document.querySelector('#selectedTotal');
const cartBadge = document.querySelector('.cart-link span');
const selected = new Set([1, 2, 3, 13, 14]);
const price = 10;

function formatMoney(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function updateTotals() {
  selectedCount.textContent = selected.size;
  selectedTotal.textContent = formatMoney(selected.size * price);
  cartBadge.textContent = selected.size;
}

function renderNumbers() {
  const unavailable = new Set([4, 5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 20]);
  const specialLabels = new Map([[10, '010'], [12, '012']]);

  for (let i = 1; i <= 40; i += 1) {
    const button = document.createElement('button');
    button.className = 'number-ball';
    button.type = 'button';
    button.textContent = specialLabels.get(i) || String(i).padStart(3, '0');

    if (selected.has(i)) {
      button.classList.add('selected');
    }

    if (unavailable.has(i) && !selected.has(i)) {
      button.classList.add('unavailable');
    }

    button.addEventListener('click', () => {
      if (button.classList.contains('unavailable')) return;

      if (selected.has(i)) {
        selected.delete(i);
        button.classList.remove('selected');
      } else {
        selected.add(i);
        button.classList.add('selected');
      }

      updateTotals();
    });

    numbersGrid.appendChild(button);
  }
}

renderNumbers();
updateTotals();
