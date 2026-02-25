<template>
  <div class="signature-pad glass">
    <canvas 
      ref="canvasRef" 
      class="signature-canvas"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    ></canvas>
    <div class="controls flex-between">
      <button class="btn btn-ghost btn-sm" @click="clear">Clear</button>
      <span class="sm-text">Sign above for confirmation</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let isDrawing = false

const emit = defineEmits(['update:modelValue'])

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d', { desynchronized: true })
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

function resizeCanvas() {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
  
  if (ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#6366f1' // primary color
  }
}

function handlePointerDown(e: PointerEvent) {
  isDrawing = true
  if (!ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  ctx.beginPath()
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
}

function handlePointerMove(e: PointerEvent) {
  if (!isDrawing || !ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
  ctx.stroke()
}

function handlePointerUp() {
  if (isDrawing) {
    isDrawing = false
    emitSignature()
  }
}

function clear() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  emitSignature()
}

function emitSignature() {
  if (!canvasRef.value) return
  // If blank, maybe don't emit? 
  // Simplified: always emit the data URL.
  const dataUrl = canvasRef.value.toDataURL('image/png')
  emit('update:modelValue', dataUrl)
}

// Function to check if canvas is empty (optional)
function isEmpty() {
  // Can be implemented by checking pixel data if needed
  return false 
}

defineExpose({ clear, isEmpty })
</script>

<style scoped>
.signature-pad {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px dashed var(--border);
  border-radius: 0.75rem;
}

.signature-canvas {
  width: 100%;
  height: 200px;
  cursor: crosshair;
  touch-action: none; /* Crucial for mobile pointer events */
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
}

.controls {
  margin-top: 0.5rem;
  padding: 0 0.5rem;
}

.sm-text {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
