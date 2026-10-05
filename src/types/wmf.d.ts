declare module 'wmf' {
  export function draw_canvas(data: Uint8Array, canvas: any): void;
  export function render_canvas(data: Uint8Array, canvas: any): void;
  export function get_actions(data: Uint8Array): any;
  export function image_size(data: Uint8Array): [number, number];
}
