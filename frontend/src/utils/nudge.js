const NUDGE_AMOUNT = 1;
const NUDGE_AMOUNT_SHIFT = 10;

export function nudgeDelta(key, shiftKey) {
  const amount = shiftKey ? NUDGE_AMOUNT_SHIFT : NUDGE_AMOUNT;
  switch (key) {
    case 'ArrowUp':
      return { dx: 0, dy: -amount };
    case 'ArrowDown':
      return { dx: 0, dy: amount };
    case 'ArrowLeft':
      return { dx: -amount, dy: 0 };
    case 'ArrowRight':
      return { dx: amount, dy: 0 };
    default:
      return null;
  }
}
