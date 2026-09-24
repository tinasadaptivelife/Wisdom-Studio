import { Group, Rect, Circle, Line } from 'react-konva';

// A simple vector "image" glyph (frame + sun + mountains) drawn with Konva
// primitives, replacing an emoji character that rendered inconsistently
// across operating systems and looked out of place next to the app's
// otherwise hand-drawn SVG iconography (see TemplatePreview.jsx).
export default function PlaceholderIcon({ boxWidth, boxHeight, color = '#9a9a9a' }) {
  const size = Math.min(64, Math.max(28, Math.min(boxWidth, boxHeight) * 0.3));
  const x = (boxWidth - size) / 2;
  const y = boxHeight * 0.28 - size / 2;

  return (
    <Group x={x} y={y} listening={false}>
      <Rect width={size} height={size * 0.78} cornerRadius={size * 0.08} stroke={color} strokeWidth={2} />
      <Circle x={size * 0.26} y={size * 0.24} radius={size * 0.09} fill={color} />
      <Line
        points={[
          size * 0.06, size * 0.6,
          size * 0.34, size * 0.34,
          size * 0.52, size * 0.5,
          size * 0.7, size * 0.3,
          size * 0.92, size * 0.58,
        ]}
        stroke={color}
        strokeWidth={2}
        lineJoin="round"
        lineCap="round"
      />
    </Group>
  );
}
