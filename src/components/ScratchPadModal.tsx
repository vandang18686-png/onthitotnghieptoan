import React, { useRef, useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import { X, Eraser, RotateCcw, PenTool, Type, Download } from 'lucide-react';

interface ScratchPadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScratchPadModal: React.FC<ScratchPadModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'text'>('draw');
  const [textNotes, setTextNotes] = useState('');
  const [strokeColor, setStrokeColor] = useState('#1e40af'); // blue-800
  const [lineWidth, setLineWidth] = useState(2.5);
  const [isErasing, setIsErasing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'draw') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Adjust canvas resolution for sharp drawing on retina screens
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Fill soft paper-like background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      drawGrid(ctx, rect.width, rect.height);
    }
  }, [isOpen, activeTab]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    const step = 24;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentX, currentY);

    if (isErasing) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 18;
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
    }

    ctx.stroke();
    ctx.restore();

    lastPointRef.current = { x: currentX, y: currentY };
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    drawGrid(ctx, rect.width, rect.height);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              ✏
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{tr('Giấy Nháp Điện Tử')}</h3>
              <p className="text-xs text-slate-400">{tr('Vẽ hình học, đặt tính nháp toán học trực quan')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('draw')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition font-medium ${
                  activeTab === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{tr('Bút vẽ tay')}</span>
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition font-medium ${
                  activeTab === 'text' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>{tr('Gõ phím')}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label={tr('Đóng bảng nháp')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar for Drawing mode */}
        {activeTab === 'draw' && (
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">{tr('Màu mực:')}</span>
              <button
                onClick={() => {
                  setStrokeColor('#1e40af');
                  setIsErasing(false);
                }}
                className={`w-6 h-6 rounded-full bg-blue-700 ring-offset-1 transition ${
                  strokeColor === '#1e40af' && !isErasing ? 'ring-2 ring-blue-700 scale-110' : ''
                }`}
                title={tr('Xanh mực')}
              />
              <button
                onClick={() => {
                  setStrokeColor('#0f172a');
                  setIsErasing(false);
                }}
                className={`w-6 h-6 rounded-full bg-slate-900 ring-offset-1 transition ${
                  strokeColor === '#0f172a' && !isErasing ? 'ring-2 ring-slate-900 scale-110' : ''
                }`}
                title={tr('Đen chì')}
              />
              <button
                onClick={() => {
                  setStrokeColor('#dc2626');
                  setIsErasing(false);
                }}
                className={`w-6 h-6 rounded-full bg-red-600 ring-offset-1 transition ${
                  strokeColor === '#dc2626' && !isErasing ? 'ring-2 ring-red-600 scale-110' : ''
                }`}
                title={tr('Đỏ nhấn mạnh')}
              />
              <button
                onClick={() => {
                  setStrokeColor('#16a34a');
                  setIsErasing(false);
                }}
                className={`w-6 h-6 rounded-full bg-emerald-600 ring-offset-1 transition ${
                  strokeColor === '#16a34a' && !isErasing ? 'ring-2 ring-emerald-600 scale-110' : ''
                }`}
                title={tr('Xanh lá')}
              />

              <div className="h-4 w-px bg-slate-300 mx-1" />

              <button
                onClick={() => setIsErasing(!isErasing)}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 border transition font-medium ${
                  isErasing
                    ? 'bg-amber-100 border-amber-400 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>{tr('Tẩy')}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearCanvas}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 flex items-center gap-1 transition"
                title={tr('Xóa toàn bộ trang nháp')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{tr('Xóa trắng')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {activeTab === 'draw' ? (
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full scratchpad-canvas cursor-crosshair"
            />
          ) : (
            <textarea
              value={textNotes}
              onChange={(e) => setTextNotes(e.target.value)}
              placeholder={tr('Nhập ghi chú nháp, công thức tính toán tạm thời tại đây (ví dụ: x^2 - 4 = 0 => x = ±2)...')}
              className="w-full h-full p-4 text-sm font-mono text-slate-800 focus:outline-none resize-none bg-amber-50/20"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{tr('* Bảng nháp tự động lưu trên trang trong suốt phiên làm bài thi.')}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition"
          >
            {tr('Quay lại bài làm')}
          </button>
        </div>
      </div>
    </div>
  );
};
