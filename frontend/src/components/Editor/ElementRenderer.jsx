import { Group, Rect, Ellipse, Text } from 'react-konva';
import GeneratedImageShape from './GeneratedImageShape.jsx';
import PlaceholderIcon from './PlaceholderIcon.jsx';

const MIN_SIZE = 20;

export default function ElementRenderer({ element, isSelected, registerRef, onSelect, onChange, onDblClickText }) {
  const { id, type, x, y, width, height, rotation, visible, locked } = element;
  if (visible === false) return null;

  const commonGroupProps = {
    id,
    x,
    y,
    rotation,
    draggable: !locked,
    ref: (node) => registerRef(id, node),
    onClick: () => onSelect(id),
    onTap: () => onSelect(id),
    onDragEnd: (e) => {
      onChange(id, { x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: (e) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange(id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(MIN_SIZE, width * scaleX),
        height: Math.max(MIN_SIZE, height * scaleY),
      });
    },
  };

  return (
    <Group {...commonGroupProps} name={isSelected ? 'selected-node' : undefined}>
      {type === 'rect' && (
        <Rect
          width={width}
          height={height}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      )}
      {type === 'ellipse' && (
        <Ellipse
          x={width / 2}
          y={height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      )}
      {type === 'image-placeholder' && (
        <>
          <Rect
            width={width}
            height={height}
            fill="#f0f0f0"
            stroke="#9a9a9a"
            strokeWidth={2}
            dash={[10, 6]}
            cornerRadius={6}
          />
          <PlaceholderIcon boxWidth={width} boxHeight={height} />
          <Text
            y={height * 0.52}
            width={width}
            height={height * 0.4}
            text={element.label || 'Image goes here'}
            align="center"
            verticalAlign="top"
            fill="#6a6a6a"
            fontSize={16}
            padding={12}
            listening={false}
          />
        </>
      )}
      {type === 'image' && <GeneratedImageShape src={element.src} width={width} height={height} />}
      {type === 'text' && (
        <Text
          width={width}
          height={height}
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fill={element.fill}
          align={element.align}
          onDblClick={(e) => onDblClickText(element, e.target.getParent())}
          onDblTap={(e) => onDblClickText(element, e.target.getParent())}
        />
      )}
    </Group>
  );
}
