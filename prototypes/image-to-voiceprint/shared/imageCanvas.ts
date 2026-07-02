export interface LoadedImageCanvas {
  width: number;
  height: number;
  imageData: ImageData;
  canvas: HTMLCanvasElement;
}

export async function loadImageData(
  file: File,
  width = 467,
  height = 256,
): Promise<LoadedImageCanvas> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2d context unavailable');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);

  return {
    width,
    height,
    imageData,
    canvas,
  };
}

export function extractGrayColumns(imageData: ImageData): number[][] {
  const columns: number[][] = Array.from({ length: imageData.width }, () => []);

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      const red = imageData.data[index] ?? 0;
      const green = imageData.data[index + 1] ?? 0;
      const blue = imageData.data[index + 2] ?? 0;
      const gray = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

      columns[x]?.push(gray);
    }
  }

  return columns;
}
