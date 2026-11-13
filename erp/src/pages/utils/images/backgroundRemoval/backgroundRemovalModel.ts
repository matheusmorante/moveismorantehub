export const BACKGROUND_REMOVAL_MODELS = {
  webgpu: { id: 'wonfy/BiRefNet-ONNX-webgpu', revision: '041c6b25157431ac09634955246726ea2614fd0f' },
  wasm: { id: 'h143N/birefnet-lite-512-chunked', revision: 'd0b0c299a1d10b0a57b04d0f1f6088d5c0d6ebf2' },
} as const;

export const BACKGROUND_REMOVAL_REVISION =
  `${BACKGROUND_REMOVAL_MODELS.webgpu.revision}:${BACKGROUND_REMOVAL_MODELS.wasm.revision}`;
