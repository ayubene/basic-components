<template>
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    :multiple="multiple"
    :clearable="clearable"
    :filterable="filterable"
    :disabled="disabled"
    :size="size"
    :loading="loading"
    :remote="remote"
    :remote-method="remote ? handleRemoteSearch : undefined"
    @update:model-value="handleChange"
  >
    <el-option
      v-for="item in options"
      :key="item[valueKey]"
      :label="item[labelKey]"
      :value="item[valueKey]"
      :disabled="item.disabled"
    />
  </el-select>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
// 使用相对路径，避免依赖外部项目的 @ 别名配置
import { request } from '../../utils/request'
import type { SelectProps } from '../../types'

defineOptions({
  name: 'BasicSelect'
})

interface Props extends SelectProps {
  modelValue?: any
}

const props = withDefaults(defineProps<Props>(), {
  valueKey: 'value',
  labelKey: 'label',
  remote: false,
  multiple: false,
  clearable: true,
  filterable: true,
  disabled: false,
  size: 'default',
  placeholder: '请选择'
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  change: [value: any]
  /**
   * 数据加载完成时触发，方便父组件拿到原始数据/选项用于其它用途
   */
  'data-loaded': [payload: { raw: any; options: OptionRecord[]; fromRemote: boolean }]
}>()

type OptionRecord = {
  [key: string]: any
  disabled?: boolean
}

const options = ref<OptionRecord[]>([])
const loading = ref(false)
const searchKeyword = ref('')

// 获取字段映射
const getFieldMap = () => {
  return {
    value: props.fieldMap?.value || props.valueKey,
    label: props.fieldMap?.label || props.labelKey,
    disabled: props.fieldMap?.disabled || 'disabled'
  }
}

// 加载数据
const loadData = async (keyword?: string) => {
  // 如果直接提供了options，不需要从URL加载
  if (props.options && Array.isArray(props.options)) {
    options.value = props.options
    return
  }

  if (!props.listUrl) {
    return
  }

  try {
    loading.value = true
    const params: Record<string, any> = {
      ...props.requestParams
    }

    if (props.remote && keyword !== undefined) {
      params.keyword = keyword
      params.search = keyword
    }

    const response = await request.get(props.listUrl, params)
    let data = response.data

    // 如果是数组，直接使用；如果是对象，尝试获取列表字段
    if (!Array.isArray(data)) {
      // 兼容常见字段：rows / list / data / items / records
      data = data.rows || data.list || data.data || data.items || data.records || []
    }

    // 数据转换
    if (props.transform) {
      options.value = props.transform(data)
    } else {
      const fieldMap = getFieldMap()
      options.value = data.map((item: any) => ({
        label: item[fieldMap.label],
        value: item[fieldMap.value],
        disabled: item[fieldMap.disabled] || false
      }))
    }

    emit('data-loaded', { raw: data, options: options.value, fromRemote: !!keyword })
  } catch (error) {
    console.error('Load select data error:', error)
    options.value = []
  } finally {
    loading.value = false
  }
}

// 远程搜索
const handleRemoteSearch = (query: string) => {
  searchKeyword.value = query
  loadData(query)
}

// 值变化处理
const handleChange = (value: any) => {
  emit('update:modelValue', value)
  emit('change', value)
}

// 初始化加载
onMounted(() => {
  // 如果直接提供了options，直接使用
  if (props.options && Array.isArray(props.options)) {
    options.value = props.options
    return
  }

  // 如果有listUrl，从URL加载
  if (props.listUrl && !props.remote) {
    loadData()
  }
})

// 监听modelValue变化，用于回显
watch(
  () => props.modelValue,
  (newVal) => {
    // 如果直接提供了options，不需要加载
    if (props.options && Array.isArray(props.options)) {
      return
    }
    if (newVal && options.value.length === 0 && !props.remote && props.listUrl) {
      loadData()
    }
  },
  { immediate: true }
)

// 监听options prop变化
watch(
  () => props.options,
  (newOptions) => {
    if (newOptions && Array.isArray(newOptions)) {
      options.value = newOptions
    }
  },
  { immediate: true, deep: true }
)
</script>

