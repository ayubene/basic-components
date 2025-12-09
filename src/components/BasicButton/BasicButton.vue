<template>
<el-button
  v-bind="filteredAttrs"
    :type="type"
    :size="size"
    :loading="computedLoading"
    :disabled="disabled || computedLoading"
    :icon="icon"
    :circle="circle"
    :round="round"
    :plain="plain"
    @click="handleClick"
  >
    <slot></slot>
  </el-button>
</template>

<script setup lang="ts">
import { ref, computed, useAttrs } from 'vue'
import type { ButtonProps } from '@/types'

defineOptions({
  name: 'BasicButton'
})

interface Props extends ButtonProps {
  autoloading?: boolean
  onClick?: (event: MouseEvent) => void | Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'default',
  loading: false,
  disabled: false,
  autoloading: true,
  circle: false,
  round: false,
  plain: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const internalLoading = ref(false)
const attrs = useAttrs()
const filteredAttrs = computed(() => {
  // 移除潜在的 onClick / onclick，避免与组件内部点击处理重复触发
  const { onClick, onclick, ...rest } = attrs
  return rest
})

const computedLoading = computed(() => {
  return props.loading || internalLoading.value
})

const handleClick = async (event: MouseEvent) => {
  emit('click', event)

  if (!props.autoloading || !props.onClick) {
    return
  }

  try {
    internalLoading.value = true
    const result = props.onClick(event)
    // 如果是Promise，等待完成
    if (result && typeof result.then === 'function') {
      await result
    }
  } catch (error) {
    console.error('Button click error:', error)
  } finally {
    internalLoading.value = false
  }
}
</script>

