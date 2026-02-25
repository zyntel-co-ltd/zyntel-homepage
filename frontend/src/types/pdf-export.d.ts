declare module 'html2canvas' {
  const html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  export default html2canvas;
}
declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: object);
    addImage(imgData: string, format: string, x: number, y: number, w: number, h: number): void;
    save(filename: string): void;
    setFontSize(size: number): void;
    text(text: string, x: number, y: number): void;
    internal: { pageSize: { getWidth(): number; getHeight(): number } };
  }
}
