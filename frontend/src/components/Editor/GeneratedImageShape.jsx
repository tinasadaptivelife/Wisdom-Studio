import useImage from 'use-image';
import { Image as KonvaImage, Rect, Text } from 'react-konva';

export default function GeneratedImageShape({ src, width, height }) {
  const [image, status] = useImage(src, 'anonymous');
  // Some hosts (seen with AI Horde's Alchemy-upscaled results) don't serve
  // CORS-enabled responses reliably even though the same URL loads fine
  // without crossOrigin — fall back to a non-CORS load so the image still
  // displays. That image just won't be exportable to PDF (tainted canvas),
  // the same limitation the export flow already messages for.
  const [fallbackImage, fallbackStatus] = useImage(status === 'failed' ? src : '');

  const resolvedImage = status === 'failed' ? fallbackImage : image;
  const resolvedStatus = status === 'failed' ? fallbackStatus : status;

  if (resolvedStatus === 'failed') {
    return (
      <>
        <Rect width={width} height={height} fill="#fdecea" stroke="#c1121f" strokeWidth={2} cornerRadius={6} />
        <Text
          width={width}
          height={height}
          text="Image failed to load"
          align="center"
          verticalAlign="middle"
          fill="#c1121f"
          fontSize={14}
          padding={12}
          listening={false}
        />
      </>
    );
  }

  if (!resolvedImage) {
    return <Rect width={width} height={height} fill="#f0f0f0" stroke="#c9c9c9" strokeWidth={1} cornerRadius={6} />;
  }

  return <KonvaImage image={resolvedImage} width={width} height={height} />;
}
