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
      :key="item.value"
      :label="item.label"
      :value="item.value"
      :disabled="item.disabled"
    />
  </el-select>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
// 使用相对路径，避免依赖外部项目的 @ 别名配置
import { request } from '../../utils/request'
import type { SelectProps } from '../../types'
import { log } from 'console'

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
  console.log('getFieldMapgetFieldMap',props);
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
    let responseData = response.data

    console.log('[BasicSelect] 原始响应数据:', responseData)

    // 处理响应数据结构：后端可能返回 { total, rows, code, msg } 或者 { code, data, msg }
    let data: any = responseData
    
    // 如果 responseData 有 code 和 data 字段，说明是标准响应结构 { code, data, msg }
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      data = responseData.data
      console.log('[BasicSelect] 从标准响应结构中提取 data:', data)
    }

    // 如果还不是数组，尝试从常见字段中提取（如 rows, list 等）
    if (!Array.isArray(data) && data && typeof data === 'object') {
      data = data.rows || data.list || data.items || data.records || []
      console.log('[BasicSelect] 从对象中提取数组数据:', data)
    }

    // 确保 data 是数组
    if (!Array.isArray(data)) {
      console.error('[BasicSelect] 无法从响应中提取数组数据，响应结构:', responseData)
      console.error('[BasicSelect] 提取后的 data:', data)
      data = []
    }

    console.log('[BasicSelect] 最终使用的数据数组，长度:', data.length, '前3项:', data.slice(0, 3))

    // 数据转换
    if (props.transform) {
      options.value = props.transform(data)
      console.log('[BasicSelect] 转换后的选项:', options.value.slice(0, 3))
    } else {
      const fieldMap = getFieldMap()
      console.log('[BasicSelect] 字段映射配置:', fieldMap)
      
      options.value = data.map((item: any, index: number) => {
        const labelValue = item[fieldMap.label]
        const valueValue = item[fieldMap.value]
        
        // 如果字段为空，给出详细警告
        if (labelValue === undefined || labelValue === null) {
          console.warn(
            `[BasicSelect] 第 ${index + 1} 项数据: 字段 "${fieldMap.label}" 不存在或为空`,
            `可用字段: [${Object.keys(item).join(', ')}]`,
            '数据项:', item
          )
        }
        if (valueValue === undefined || valueValue === null) {
          console.warn(
            `[BasicSelect] 第 ${index + 1} 项数据: 字段 "${fieldMap.value}" 不存在或为空`,
            `可用字段: [${Object.keys(item).join(', ')}]`,
            '数据项:', item
          )
        }
        
        return {
          label: labelValue ?? '',
          value: valueValue,
          disabled: item[fieldMap.disabled] || false
        }
      })
      
      console.log('[BasicSelect] 转换后的选项:', options.value.slice(0, 3))
    }

    emit('data-loaded', { raw: data, options: options.value, fromRemote: !!keyword })
  } catch (error) {
    console.error('Load select data error:', error)
    options.value = []
  } finally {
    loading.value = false
  }

  console.log('[BasicSelect] 最终选项:', options.value.slice(0, 3))
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

