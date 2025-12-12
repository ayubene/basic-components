<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :append-to-body="appendToBody"
    :destroy-on-close="destroyOnClose"
    v-bind="$attrs"
    @update:model-value="handleUpdate"
    @close="handleClose"
  >
    <div class="modal-content">
      <slot></slot>
    </div>
    <template #footer>
      <div v-if="$slots.footer">
        <slot name="footer"></slot>
      </div>
      <div v-else class="default-footer">
        <el-button @click="handleCancel" :disabled="cancelButtonLoading">{{ cancelButtonText }}</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="confirmButtonLoading">{{ confirmButtonText }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ModalProps } from '@/types'

defineOptions({
  name: 'BasicModal'
})

interface Props extends ModalProps {
  modelValue: boolean
  confirmButtonText?: string
  cancelButtonText?: string
  confirmButtonLoading?: boolean
  cancelButtonLoading?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  width: '50%',
  closeOnClickModal: true,
  closeOnPressEscape: true,
  showClose: true,
  appendToBody: false,
  destroyOnClose: false,
  confirmButtonText: '确认',
  cancelButtonText: '取消',
  confirmButtonLoading: false,
  cancelButtonLoading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  opened: []
  closed: []
  confirm: []
  cancel: []
}>()

const handleUpdate = (value: boolean) => {
  emit('update:modelValue', value)
  if (value) {
    emit('opened')
  } else {
    emit('closed')
  }
}

const handleClose = () => {
  emit('close')
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-content {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 4px;
}

/* 美化滚动条 */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

