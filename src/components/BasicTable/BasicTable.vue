<template>
  <div class="basic-table">
    <!-- 搜索表单 -->
    <el-form
      v-if="hasSearchableColumns"
      ref="searchFormRef"
      :model="searchForm"
      class="search-form"
      @submit.prevent
    >
      <el-row :gutter="20">
        <el-col
          v-for="column in displayedSearchColumns"
          :key="column.field"
          :span="24 / searchFormCols"
        >
          <el-form-item :label="column.title" :prop="column.field">
            <!-- 输入框 -->
            <el-input
              v-if="!column.searchType || column.searchType === 'input'"
              v-model="searchForm[column.field]"
              :placeholder="column.searchPlaceholder || `请输入${column.title}`"
              clearable
              style="width: 100%"
              @keyup.enter="handleSearch"
            />
            <!-- 下拉选择 -->
            <BasicSelect
              v-else-if="column.searchType === 'select'"
              v-model="searchForm[column.field]"
              :placeholder="column.searchPlaceholder || `请选择${column.title}`"
              :options="searchSelectOptionsMap[column.field] || column.searchOptions"
              v-bind="column.searchSelectProps"
              @data-loaded="(payload) => handleSearchSelectLoaded(column.field, column.searchSelectProps, payload)"
              style="width: 100%"
            />
            <!-- 日期选择 -->
            <el-date-picker
              v-else-if="column.searchType === 'date'"
              v-model="searchForm[column.field]"
              type="date"
              :placeholder="column.searchPlaceholder || `请选择${column.title}`"
              clearable
              style="width: 100%"
            />
            <!-- 日期范围 -->
            <el-date-picker
              v-else-if="column.searchType === 'daterange'"
              v-model="searchForm[column.field]"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              clearable
              style="width: 100%"
            />
            <!-- 数字输入 -->
            <el-input-number
              v-else-if="column.searchType === 'number'"
              v-model="searchForm[column.field]"
              :placeholder="column.searchPlaceholder || `请输入${column.title}`"
              clearable
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24 / searchFormCols">
          <el-form-item>
            <BasicButton type="primary" @click="handleSearch">查询</BasicButton>
            <BasicButton @click="handleReset">重置</BasicButton>
            <el-button
              v-if="hasMoreSearchColumns"
              link
              type="primary"
              @click="toggleSearchExpand"
            >
              {{ searchExpanded ? '收起' : '展开' }}
              <el-icon style="margin-left: 4px">
                <ArrowUp v-if="searchExpanded" />
                <ArrowDown v-else />
              </el-icon>
            </el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- 工具栏 -->
    <div v-if="showToolbar" class="toolbar">
      <BasicButton v-if="showCreate" type="primary" @click="handleCreate">新增</BasicButton>
      <BasicButton
        v-if="showDelete"
        type="danger"
        :disabled="selectedRows.length === 0"
        @click="handleBatchDelete"
      >
        批量删除222
      </BasicButton>
      <BasicButton v-if="showExport" type="success" :on-click="handleExport">导出</BasicButton>
      <BasicButton
        v-if="enableColumnCustomize"
        type="info"
        @click="showColumnCustomizeDialog = true"
      >
        列设置
      </BasicButton>
      <slot name="toolbar"></slot>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <vxe-table
        ref="tableRef"
        :data="tableData"
        :stripe="stripe"
        :border="border"
        :loading="loading"
        :scroll-y="props.enableVirtualScroll ? { enabled: true, gt: 100 } : { enabled: false }"
        :height="typeof height === 'number' ? height : undefined"
        :resizable="enableResizable"
        :column-config="{ resizable: enableResizable, drag: enableColumnDrag }"
        :sort-config="{ multiple: true, trigger: 'default' }"
        :filter-config="{ remote: false }"
        :edit-config="hasEditableColumns ? { enabled: true, trigger: 'click', mode: 'cell' } : undefined"
        auto-resize
        @checkbox-change="handleCheckboxChange"
        @checkbox-all="handleCheckboxAll"
        @sort-change="handleSortChange"
        @filter-change="handleFilterChange"
        @edit-closed="handleEditClosed"
      >
      <vxe-column v-if="showDelete" type="checkbox" width="60" />
      <vxe-column
        v-for="column in displayColumns"
        :key="column.field"
        :field="column.field"
        :title="column.title"
        :width="column.width"
        :min-width="column.minWidth"
        :align="column.align || 'center'"
        :fixed="column.fixed"
        :sortable="column.sortable"
        :resizable="column.resizable !== false && enableResizable"
        :filters="column.filterable && column.filters && column.filters.length > 0 ? column.filters : undefined"
        :filter-multiple="column.filterable && column.filters && column.filters.length > 0"
        :edit-render="column.editRender ? column.editRender : undefined"
        :formatter="column.formatter"
      >
        <template v-if="column.slots?.default" #default="{ row }">
          <slot :name="column.slots.default" :row="row" :column="column"></slot>
        </template>
        <template v-if="column.slots?.header" #header>
          <slot :name="column.slots.header" :column="column"></slot>
        </template>
      </vxe-column>
      <vxe-column v-if="showDelete || showCreate" title="操作" width="150" align="center">
        <template #default="{ row }">
          <BasicButton
            v-if="showCreate"
            type="primary"
            link
            size="small"
            @click="handleEdit(row)"
          >
            编辑
          </BasicButton>
          <BasicButton
            v-if="showDelete"
            type="danger"
            link
            size="small"
            @click="handleDelete(row)"
          >
            删除
          </BasicButton>
          <slot name="action" :row="row"></slot>
        </template>
      </vxe-column>
      </vxe-table>
    </div>

    <!-- 列自定义配置弹窗 -->
    <BasicModal
      v-model="showColumnCustomizeDialog"
      title="列设置"
      width="800px"
      @closed="handleColumnDialogClose"
    >
      <div class="column-customize">
        <div class="column-customize-header">
          <BasicButton type="primary" size="small" @click="handleAddColumn">
            <el-icon><Plus /></el-icon>
            新增列
          </BasicButton>
          <BasicButton size="small" @click="handleResetColumns">重置为默认</BasicButton>
        </div>

        <el-table :data="customizedColumns" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="显示" width="80">
            <template #default="{ row }">
              <el-checkbox v-model="row.visible" />
            </template>
          </el-table-column>
          <el-table-column label="列名" prop="title" />
          <el-table-column label="字段" prop="field" />
          <el-table-column label="宽度" prop="width" width="100" />
          <el-table-column label="可搜索" width="100">
            <template #default="{ row }">
              <el-checkbox v-model="row.searchable" />
            </template>
          </el-table-column>
          <el-table-column label="可排序" width="100">
            <template #default="{ row }">
              <el-checkbox v-model="row.sortable" />
            </template>
          </el-table-column>
          <el-table-column label="可筛选" width="100">
            <template #default="{ row, $index }">
              <el-checkbox
                :model-value="!!row.filterable"
                @change="(val: boolean) => handleToggleFilterable($index, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="可编辑" width="100">
            <template #default="{ row, $index }">
              <el-checkbox
                :model-value="!!row.editRender"
                @change="(val: boolean) => handleToggleEditable($index, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row, $index }">
              <BasicButton type="primary" link size="small" @click="handleEditColumn(row, $index)">
                编辑
              </BasicButton>
              <BasicButton
                type="danger"
                link
                size="small"
                @click="handleDeleteColumn($index)"
              >
                删除
              </BasicButton>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <BasicButton @click="showColumnCustomizeDialog = false">取消</BasicButton>
        <BasicButton type="primary" @click="handleSaveColumns">保存</BasicButton>
      </template>
    </BasicModal>

    <!-- 编辑/新增列弹窗 -->
    <BasicModal
      v-model="showColumnEditDialog"
      :title="editingColumnIndex === -1 ? '新增列' : '编辑列'"
      width="600px"
    >
      <el-form :model="editingColumn" label-width="100px">
        <el-form-item label="列名" required>
          <el-input v-model="editingColumn.title" placeholder="请输入列名" />
        </el-form-item>
        <el-form-item label="字段名" required>
          <el-input
            v-model="editingColumn.field"
            placeholder="请输入字段名（英文）"
            :disabled="editingColumnIndex !== -1"
          />
        </el-form-item>
        <el-form-item label="宽度">
          <el-input-number v-model="editingColumn.width" :min="0" placeholder="留空自适应" />
        </el-form-item>
        <el-form-item label="对齐方式">
          <el-select v-model="editingColumn.align" placeholder="请选择">
            <el-option label="左对齐" value="left" />
            <el-option label="居中" value="center" />
            <el-option label="右对齐" value="right" />
          </el-select>
        </el-form-item>
        <el-form-item label="可搜索">
          <el-checkbox v-model="editingColumn.searchable" />
        </el-form-item>
        <el-form-item label="可排序">
          <el-checkbox v-model="editingColumn.sortable" />
        </el-form-item>
        <el-form-item label="可筛选">
          <el-checkbox
            :model-value="editingColumn.filterable"
            @change="(val: boolean) => {
              editingColumn.filterable = val
              if (val && (!editingColumn.filters || editingColumn.filters.length === 0)) {
                // 如果开启筛选但没有筛选选项，初始化一个空数组
                editingColumn.filters = []
              }
            }"
          />
        </el-form-item>
        <el-form-item
          v-if="editingColumn.filterable"
          label="筛选选项"
        >
          <div
            v-for="(filter, index) in (editingColumn.filters || [])"
            :key="index"
            style="display: flex; gap: 8px; margin-bottom: 8px"
          >
            <el-input v-model="filter.label" placeholder="标签" style="flex: 1" />
            <el-input v-model="filter.value" placeholder="值" style="flex: 1" />
            <el-button type="danger" link @click="handleRemoveFilter(index)">删除</el-button>
          </div>
          <el-button type="primary" link @click="handleAddFilter">+ 添加筛选选项</el-button>
          <div style="color: #909399; font-size: 12px; margin-top: 4px">
            提示：至少需要添加一个筛选选项才能启用筛选功能
          </div>
        </el-form-item>
        <el-form-item label="可编辑">
          <el-checkbox
            :model-value="!!editingColumn.editRender"
            @change="(val: boolean) => editingColumn.editRender = val ? { name: 'input' } : undefined"
          />
        </el-form-item>
        <el-form-item
          v-if="editingColumn.editRender"
          label="编辑类型"
        >
          <el-select v-model="editingColumn.editRender.name" placeholder="请选择">
            <el-option label="输入框" value="input" />
            <el-option label="数字输入" value="input-number" />
            <el-option label="下拉选择" value="select" />
            <el-option label="日期" value="date" />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="editingColumn.editRender && editingColumn.editRender.name === 'select'"
          label="编辑选项"
        >
          <div
            v-for="(option, index) in editingColumn.editRender.options"
            :key="index"
            style="display: flex; gap: 8px; margin-bottom: 8px"
          >
            <el-input v-model="option.label" placeholder="标签" style="flex: 1" />
            <el-input v-model="option.value" placeholder="值" style="flex: 1" />
            <el-button type="danger" link @click="handleRemoveEditOption(index)">删除</el-button>
          </div>
          <el-button type="primary" link @click="handleAddEditOption">+ 添加选项</el-button>
        </el-form-item>
        <el-form-item v-if="editingColumn.searchable" label="搜索类型">
          <el-select v-model="editingColumn.searchType" placeholder="请选择">
            <el-option label="输入框" value="input" />
            <el-option label="下拉选择" value="select" />
            <el-option label="日期" value="date" />
            <el-option label="日期范围" value="daterange" />
            <el-option label="数字" value="number" />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="editingColumn.searchable && editingColumn.searchType === 'select'"
          label="搜索选项"
        >
          <div
            v-for="(option, index) in editingColumn.searchOptions"
            :key="index"
            style="display: flex; gap: 8px; margin-bottom: 8px"
          >
            <el-input v-model="option.label" placeholder="标签" style="flex: 1" />
            <el-input v-model="option.value" placeholder="值" style="flex: 1" />
            <el-button type="danger" link @click="handleRemoveSearchOption(index)">删除</el-button>
          </div>
          <el-button type="primary" link @click="handleAddSearchOption">+ 添加选项</el-button>
        </el-form-item>
      </el-form>

      <template #footer>
        <BasicButton @click="showColumnEditDialog = false">取消</BasicButton>
        <BasicButton type="primary" @click="handleSaveColumn">确定</BasicButton>
      </template>
    </BasicModal>

    <!-- 分页 -->
    <el-pagination
      v-if="showPager"
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      class="pagination"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
// 使用相对路径，避免依赖外部项目的 @ 别名配置
import { request } from '../../utils/request'
import type { TableProps, TableColumn, TableInstance } from '../../types'
import BasicButton from '../BasicButton/BasicButton.vue'
import BasicModal from '../BasicModal/BasicModal.vue'
import BasicSelect from '../BasicSelect/BasicSelect.vue'

defineOptions({
  name: 'BasicTable'
})

interface Props extends TableProps {
  columns: TableColumn[]
}

const props = withDefaults(defineProps<Props>(), {
  rowId: 'id',
  pageSize: 10,
  height: 'auto',
  stripe: true,
  border: true,
  showPager: true,
  showToolbar: true,
  showExport: true,
  showCreate: true,
  showDelete: true,
  searchFormCols: 3,
  enableColumnCustomize: false,
  columnCustomizeKey: 'default',
  enableVirtualScroll: false,
  enableResizable: true,
  enableColumnDrag: false
})

const emit = defineEmits<{
  create: []
  edit: [row: any]
  delete: [row: any]
  selectionChange: [rows: any[]]
}>()

// Refs
const tableRef = ref()
const searchFormRef = ref()
const tableData = ref<any[]>([])
const selectedRows = ref<any[]>([])
const loading = ref(false)
const searchSelectOptionsMap = ref<Record<string, any[]>>({})

// 搜索表单
const searchForm = ref<Record<string, any>>({})

// 列自定义相关
const showColumnCustomizeDialog = ref(false)
const showColumnEditDialog = ref(false)
const editingColumnIndex = ref(-1)
const editingColumn = ref<TableColumn>({
  field: '',
  title: '',
  visible: true,
  searchable: false,
  sortable: false
})
const customizedColumns = ref<TableColumn[]>([])

// 获取存储key
const getStorageKey = () => {
  return `basic-table-columns-${props.columnCustomizeKey}`
}

// 加载保存的列配置
const loadSavedColumns = () => {
  if (!props.enableColumnCustomize) return null
  try {
    const saved = localStorage.getItem(getStorageKey())
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载列配置失败:', error)
  }
  return null
}

// 保存列配置
const saveColumns = (columns: TableColumn[]) => {
  if (!props.enableColumnCustomize) return
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(columns))
  } catch (error) {
    console.error('保存列配置失败:', error)
  }
}

// 初始化自定义列
const initCustomizedColumns = () => {
  if (!props.enableColumnCustomize) {
    return props.columns
  }

  const saved = loadSavedColumns()
  if (saved && Array.isArray(saved) && saved.length > 0) {
    // 合并保存的配置和原始配置
    const merged = props.columns.map((col) => {
      const savedCol = saved.find((s: TableColumn) => s.field === col.field)
      if (savedCol) {
        return {
          ...col,
          ...savedCol,
          filterable: savedCol.filterable ?? col.filterable ?? false,
          editRender: savedCol.editRender ?? col.editRender ?? undefined
        }
      }
      return {
        ...col,
        visible: true,
        filterable: col.filterable ?? false,
        editRender: col.editRender ?? undefined
      }
    })

    // 添加保存的新列（不在原始columns中的）
    const newColumns = saved
      .filter((s: TableColumn) => !props.columns.find((c) => c.field === s.field))
      .map((s: TableColumn) => ({
        ...s,
        filterable: s.filterable ?? false,
        editRender: s.editRender ?? undefined
      }))
    return [...merged, ...newColumns]
  }

  // 默认所有列都显示，确保有默认的 filterable 和 editRender 属性
  return props.columns.map((col) => ({
    ...col,
    visible: true,
    filterable: col.filterable ?? false,
    editRender: col.editRender ?? undefined
  }))
}

// 当前显示的列（根据用户配置过滤）
const displayColumns = computed(() => {
  if (!props.enableColumnCustomize) {
    return props.columns
  }
  return customizedColumns.value.filter((col) => col.visible !== false)
})

// 分页
const pagination = ref({
  page: 1,
  pageSize: props.pageSize,
  total: 0
})

// 计算可搜索的列
const searchableColumns = computed(() => {
  const cols = props.enableColumnCustomize ? displayColumns.value : props.columns
  return cols.filter((col) => col.searchable)
})

const hasSearchableColumns = computed(() => {
  return searchableColumns.value.length > 0
})

// 列宽拖动配置
const enableResizable = computed(() => {
  return props.enableResizable !== false
})

// 列拖拽排序配置
const enableColumnDrag = computed(() => {
  return props.enableColumnDrag === true
})

// 检查是否有可编辑的列
const hasEditableColumns = computed(() => {
  const cols = props.enableColumnCustomize ? customizedColumns.value : props.columns
  return cols.some((col) => !!col.editRender)
})

// 搜索表单展开/收起
const searchExpanded = ref(false)
const searchColumnsLimit = 6 // 默认显示的最大搜索项数量

const hasMoreSearchColumns = computed(() => {
  return searchableColumns.value.length > searchColumnsLimit
})

const displayedSearchColumns = computed(() => {
  if (!hasMoreSearchColumns.value || searchExpanded.value) {
    return searchableColumns.value
  }
  return searchableColumns.value.slice(0, searchColumnsLimit)
})

const toggleSearchExpand = () => {
  searchExpanded.value = !searchExpanded.value
}

// 初始化搜索表单
const initSearchForm = () => {
  const form: Record<string, any> = {}
  searchableColumns.value.forEach((col) => {
    form[col.field] = col.searchType === 'daterange' ? [] : undefined
  })
  searchForm.value = form
}

// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    const params: Record<string, any> = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      ...searchForm.value
    }

    // 处理日期范围
    const allColumns = props.enableColumnCustomize
      ? customizedColumns.value
      : props.columns
    Object.keys(params).forEach((key) => {
      const column = allColumns.find((col) => col.field === key)
      if (column?.searchType === 'daterange' && Array.isArray(params[key])) {
        if (params[key].length === 2) {
          params[`${key}Start`] = params[key][0]
          params[`${key}End`] = params[key][1]
        }
        delete params[key]
      }
    })

    const response = await request.get(props.queryUrl, params)
    let data = response.data

    // 处理不同的数据格式
    if (Array.isArray(data)) {
      tableData.value = data
      pagination.value.total = data.length
    } else if (data.list || data.data || data.items) {
      tableData.value = data.list || data.data || data.items
      pagination.value.total = data.total || data.totalCount || tableData.value.length
    } else {
      tableData.value = []
      pagination.value.total = 0
    }
  } catch (error) {
    console.error('Load table data error:', error)
    ElMessage.error('加载数据失败')
    tableData.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

// 搜索下拉数据加载回调（BasicSelect 的 data-loaded）
const handleSearchSelectLoaded = (
  field: string,
  selectProps: any,
  payload: { options: any[]; raw: any; fromRemote: boolean }
) => {
  if (payload?.options) {
    searchSelectOptionsMap.value = {
      ...searchSelectOptionsMap.value,
      [field]: payload.options
    }
  }
  if (selectProps?.onDataLoaded) {
    selectProps.onDataLoaded(payload)
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  initSearchForm()
  handleSearch()
}

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadData()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadData()
}

// 选择变化
const handleCheckboxChange = () => {
  selectedRows.value = tableRef.value?.getCheckboxRecords() || []
  emit('selectionChange', selectedRows.value)
}

const handleCheckboxAll = () => {
  selectedRows.value = tableRef.value?.getCheckboxRecords() || []
  emit('selectionChange', selectedRows.value)
}

// 排序变化
const handleSortChange = (params: any) => {
  // 可以在这里处理排序逻辑，如果需要的话
  console.log('Sort changed:', params)
}

// 筛选变化
const handleFilterChange = (_params: any) => {
  // 筛选变化时重新加载数据
  pagination.value.page = 1
  loadData()
}

// 单元格编辑完成
const handleEditClosed = (params: any) => {
  // 可以在这里处理编辑后的数据保存
  console.log('Cell edit closed:', params)
  // 如果需要自动保存，可以在这里调用保存接口
}

// 新增
const handleCreate = () => {
  emit('create')
}

// 编辑
const handleEdit = (row: any) => {
  emit('edit', row)
}

// 删除
const handleDelete = async (row: any) => {
  if (!props.deleteUrl) {
    emit('delete', row)
    return
  }

  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      type: 'warning'
    })

    await request.delete(props.deleteUrl, { id: row[props.rowId] })
    ElMessage.success('删除成功')
    loadData()
    emit('delete', row)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }

  if (!props.deleteUrl) {
    ElMessage.warning('未配置删除URL')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条记录吗？`, '提示', {
      type: 'warning'
    })

    const ids = selectedRows.value.map((row) => row[props.rowId])
    await request.delete(props.deleteUrl, { ids: ids })
    ElMessage.success('删除成功')
    selectedRows.value = []
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Batch delete error:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 导出
const handleExport = async () => {
  if (!props.exportUrl) {
    ElMessage.warning('未配置导出URL')
    return
  }

  try {
    const params = {
      ...searchForm.value
    }

    // 处理日期范围
    const allColumns = props.enableColumnCustomize
      ? customizedColumns.value
      : props.columns
    Object.keys(params).forEach((key) => {
      const column = allColumns.find((col) => col.field === key)
      if (column?.searchType === 'daterange' && Array.isArray(params[key])) {
        if (params[key].length === 2) {
          params[`${key}Start`] = params[key][0]
          params[`${key}End`] = params[key][1]
        }
        delete params[key]
      }
    })

    const blob = await request.download(props.exportUrl, params)

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `导出数据_${new Date().getTime()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('Export error:', error)
    ElMessage.error('导出失败')
  }
}

// 暴露方法
const refresh = () => {
  return loadData()
}

const getTableData = () => {
  return tableData.value
}

const getSelectedRows = () => {
  return selectedRows.value
}

const clearSelection = () => {
  tableRef.value?.clearCheckboxRow()
  selectedRows.value = []
}

const exportData = () => {
  return handleExport()
}

defineExpose<TableInstance>({
  refresh,
  getTableData,
  getSelectedRows,
  clearSelection,
  exportData
})

// 列自定义相关方法
const handleAddColumn = () => {
  editingColumnIndex.value = -1
  editingColumn.value = {
    field: '',
    title: '',
    visible: true,
    searchable: false,
    sortable: false,
    searchType: 'input',
    searchOptions: []
  }
  showColumnEditDialog.value = true
}

const handleEditColumn = (column: TableColumn, index: number) => {
  editingColumnIndex.value = index
  editingColumn.value = {
    ...column,
    searchOptions: column.searchOptions ? [...column.searchOptions] : [],
    filters: column.filters ? [...column.filters] : [],
    editRender: column.editRender
      ? {
          ...column.editRender,
          options: column.editRender.options ? [...column.editRender.options] : []
        }
      : undefined,
    resizable: column.resizable !== false
  }
  // 如果开启了筛选但没有筛选选项，尝试自动生成
  if (editingColumn.value.filterable && (!editingColumn.value.filters || editingColumn.value.filters.length === 0)) {
    initEditingColumnFilters()
  }
  showColumnEditDialog.value = true
}

const handleDeleteColumn = (index: number) => {
  ElMessageBox.confirm('确定要删除这一列吗？', '提示', {
    type: 'warning'
  })
    .then(() => {
      customizedColumns.value.splice(index, 1)
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}

const handleAddSearchOption = () => {
  if (!editingColumn.value.searchOptions) {
    editingColumn.value.searchOptions = []
  }
  editingColumn.value.searchOptions.push({ label: '', value: '' })
}

const handleRemoveSearchOption = (index: number) => {
  editingColumn.value.searchOptions?.splice(index, 1)
}

const handleAddFilter = () => {
  if (!editingColumn.value.filters) {
    editingColumn.value.filters = []
  }
  editingColumn.value.filters.push({ label: '', value: '' })
}

// 初始化编辑列的筛选选项
const initEditingColumnFilters = () => {
  if (editingColumn.value.filterable && (!editingColumn.value.filters || editingColumn.value.filters.length === 0)) {
    // 如果开启了筛选但没有筛选选项，尝试从表格数据中自动生成
    const uniqueValues = getUniqueValuesFromColumn(editingColumn.value.field)
    if (uniqueValues.length > 0) {
      editingColumn.value.filters = uniqueValues.slice(0, 10).map((val) => ({
        label: String(val),
        value: val
      }))
    } else {
      // 如果没有数据，初始化为空数组（用户需要手动添加）
      editingColumn.value.filters = []
    }
  }
}

const handleRemoveFilter = (index: number) => {
  editingColumn.value.filters?.splice(index, 1)
}

const handleAddEditOption = () => {
  if (!editingColumn.value.editRender) {
    editingColumn.value.editRender = { name: 'select', options: [] }
  }
  if (!editingColumn.value.editRender.options) {
    editingColumn.value.editRender.options = []
  }
  editingColumn.value.editRender.options.push({ label: '', value: '' })
}

const handleRemoveEditOption = (index: number) => {
  editingColumn.value.editRender?.options?.splice(index, 1)
}

// 切换列的筛选功能
const handleToggleFilterable = (index: number, val: boolean) => {
  if (customizedColumns.value[index]) {
    customizedColumns.value[index].filterable = val
    if (!val) {
      // 如果关闭筛选，清空筛选选项
      customizedColumns.value[index].filters = undefined
    } else if (!customizedColumns.value[index].filters || customizedColumns.value[index].filters.length === 0) {
      // 如果开启筛选但没有筛选选项，尝试从表格数据中自动生成
      const column = customizedColumns.value[index]
      const uniqueValues = getUniqueValuesFromColumn(column.field)
      if (uniqueValues.length > 0) {
        customizedColumns.value[index].filters = uniqueValues.map((val) => ({
          label: String(val),
          value: val
        }))
      } else {
        // 如果没有数据，初始化为空数组（用户需要手动添加）
        customizedColumns.value[index].filters = []
      }
    }
  }
}

// 从表格数据中获取列的唯一值
const getUniqueValuesFromColumn = (field: string) => {
  const values = new Set()
  tableData.value.forEach((row) => {
    if (row[field] !== undefined && row[field] !== null) {
      values.add(row[field])
    }
  })
  return Array.from(values).slice(0, 20) // 最多返回20个唯一值
}

// 切换列的编辑功能
const handleToggleEditable = (index: number, val: boolean) => {
  if (customizedColumns.value[index]) {
    if (val) {
      // 如果开启编辑，默认设置为 input 类型
      customizedColumns.value[index].editRender = { name: 'input' }
    } else {
      // 如果关闭编辑，清空编辑配置
      customizedColumns.value[index].editRender = undefined
    }
  }
}

const handleSaveColumn = () => {
  if (!editingColumn.value.field || !editingColumn.value.title) {
    ElMessage.warning('请填写列名和字段名')
    return
  }

  // 如果开启了筛选但没有筛选选项，给出提示
  if (editingColumn.value.filterable && (!editingColumn.value.filters || editingColumn.value.filters.length === 0)) {
    ElMessage.warning('已开启筛选功能，但未添加筛选选项。筛选功能需要至少一个筛选选项才能生效。')
    return
  }

  // 验证字段名唯一性
  const exists = customizedColumns.value.find(
    (col, index) => col.field === editingColumn.value.field && index !== editingColumnIndex.value
  )
  if (exists) {
    ElMessage.warning('字段名已存在')
    return
  }

  if (editingColumnIndex.value === -1) {
    // 新增
    customizedColumns.value.push({ ...editingColumn.value })
  } else {
    // 编辑
    customizedColumns.value[editingColumnIndex.value] = { ...editingColumn.value }
  }

  showColumnEditDialog.value = false
  ElMessage.success(editingColumnIndex.value === -1 ? '新增成功' : '保存成功')
}

const handleSaveColumns = () => {
  saveColumns(customizedColumns.value)
  showColumnCustomizeDialog.value = false
  ElMessage.success('列配置已保存')
}

const handleResetColumns = () => {
  ElMessageBox.confirm('确定要重置为默认列配置吗？', '提示', {
    type: 'warning'
  })
    .then(() => {
      customizedColumns.value = props.columns.map((col) => ({ ...col, visible: true }))
      localStorage.removeItem(getStorageKey())
      ElMessage.success('已重置为默认配置')
    })
    .catch(() => {})
}

const handleColumnDialogClose = () => {
  // 关闭时恢复为保存的配置
  const saved = loadSavedColumns()
  if (saved) {
    customizedColumns.value = saved.map((col: TableColumn) => ({ ...col }))
  } else {
    customizedColumns.value = props.columns.map((col) => ({ ...col, visible: true }))
  }
}

// 初始化
onMounted(() => {
  initSearchForm()
  if (props.enableColumnCustomize) {
    customizedColumns.value = initCustomizedColumns()
  }
  loadData()
})

// 监听queryUrl变化
watch(
  () => props.queryUrl,
  () => {
    loadData()
  }
)
</script>

<style scoped lang="scss">
.basic-table {
  .search-form {
    margin-bottom: 16px;
    padding: 16px;
    background: #fff;
    border-radius: 4px;
  }

  .toolbar {
    margin-bottom: 24px;
    display: flex;
    gap: 8px;
  }

  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .column-customize {
    .column-customize-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
  }
}
</style>

