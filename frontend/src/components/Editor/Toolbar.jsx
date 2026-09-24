import { Type, Square, Circle, Image } from 'lucide-react';
import { useDesignStore } from '../../store/useDesignStore.js';

export default function Toolbar() {
  const addElement = useDesignStore((s) => s.addElement);

  return (
    <nav className="toolbar" aria-label="Add elements">
      <button onClick={() => addElement('text')} aria-label="Add text box">
        <Type size={22} strokeWidth={2.2} aria-hidden="true" />
        Text
      </button>
      <button onClick={() => addElement('rect')} aria-label="Add rectangle shape">
        <Square size={22} strokeWidth={2.2} aria-hidden="true" />
        Rectangle
      </button>
      <button onClick={() => addElement('ellipse')} aria-label="Add ellipse shape">
        <Circle size={22} strokeWidth={2.2} aria-hidden="true" />
        Ellipse
      </button>
      <button onClick={() => addElement('image-placeholder')} aria-label="Add image placeholder">
        <Image size={22} strokeWidth={2.2} aria-hidden="true" />
        Image spot
      </button>
    </nav>
  );
}
