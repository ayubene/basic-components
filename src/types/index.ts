// Table相关类型
export interface TableColumn {
  field: string
  title: string
  width?: number | string
  minWidth?: number | string
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
  sortable?: boolean
  resizable?: boolean // 是否可调整列宽，默认true
  dragable?: boolean // 是否可拖拽排序，默认true
  filterable?: boolean // 是否可筛选
  filters?: Array<{ label: string; value: any }> // 筛选选项
  editRender?: {
    name: string // 编辑组件类型：input, select, date等
    options?: Array<{ label: string; value: any }> // 当name为select时的选项
    props?: Record<string, any> // 编辑组件的额外属性
  }
  formatter?: (params: { cellValue: any; row: any; column: any }) => any
  // 搜索相关
  searchable?: boolean // 是否可搜索
  searchType?: 'input' | 'select' | 'date' | 'daterange' | 'number' // 搜索类型
  searchOptions?: Array<{ label: string; value: any }> // 搜索选项（当searchType为select时）
  searchPlaceholder?: string // 搜索占位符
  // 自定义渲染
  slots?: {
    default?: string
    header?: string
    edit?: string // 自定义编辑组件
  }
  [key: string]: any
}

export interface TableProps {
  columns: TableColumn[]
  queryUrl: string // 查询URL
  deleteUrl?: string // 删除URL
  exportUrl?: string // 导出URL
  createUrl?: string // 创建URL
  updateUrl?: string // 更新URL
  rowId?: string // 行ID字段，默认'id'
  pageSize?: number // 每页条数
  height?: number | string // 表格高度
  stripe?: boolean // 斑马纹
  border?: boolean // 边框
  showPager?: boolean // 显示分页
  showToolbar?: boolean // 显示工具栏
  showExport?: boolean // 显示导出按钮
  showCreate?: boolean // 显示创建按钮
  showDelete?: boolean // 显示删除按钮
  searchFormCols?: number // 搜索表单每行显示几个字段，默认3个
  enableColumnCustomize?: boolean // 是否启用列自定义功能
  columnCustomizeKey?: string // 列配置存储的key，用于区分不同表格的配置
  enableVirtualScroll?: boolean // 是否启用虚拟滚动（大数据量时使用）
  enableResizable?: boolean // 是否启用列宽拖动，默认true
  enableColumnDrag?: boolean // 是否启用列拖拽排序，默认false
  // 响应数据字段映射，用于适配不同的后端接口格式
  // 默认格式: { total: number, rows: any[], code: number, msg: string }
  responseMap?: {
    rows?: string // 数据列表字段，默认 'rows'，也支持 'data', 'list', 'items'
    total?: string // 总数字段，默认 'total'，也支持 'totalCount'
    code?: string // 状态码字段，默认 'code'
    msg?: string // 消息字段，默认 'msg' 或 'message'
  }
  // 数据转换函数，如果提供则直接使用转换后的数据，忽略 responseMap
  transform?: (response: any) => { rows: any[]; total: number }
  [key: string]: any
}

export interface TableInstance {
  refresh: () => Promise<void>
  getTableData: () => any[]
  getSelectedRows: () => any[]
  clearSelection: () => void
  exportData: () => Promise<void>
}

// Select相关类型
export interface SelectProps {
  listUrl?: string // 列表URL（如果提供了options，则不需要listUrl）
  options?: Array<{ label: string; value: any; disabled?: boolean }> // 直接传入的选项数据
  valueKey?: string // 值字段，默认'value'
  labelKey?: string // 标签字段，默认'label'
  remote?: boolean // 是否远程搜索
  multiple?: boolean // 是否多选
  placeholder?: string
  clearable?: boolean
  filterable?: boolean
  disabled?: boolean
  size?: 'large' | 'default' | 'small'
  // 字段映射
  fieldMap?: {
    value?: string
    label?: string
    disabled?: string
  }
  // 自定义请求参数
  requestParams?: Record<string, any>
  // 数据转换函数
  transform?: (data: any[]) => Array<{ label: string; value: any }>
}

// Modal相关类型
export interface ModalProps {
  modelValue: boolean
  title?: string
  width?: string | number
  closeOnClickModal?: boolean
  closeOnPressEscape?: boolean
  showClose?: boolean
  appendToBody?: boolean
  destroyOnClose?: boolean
  [key: string]: any
}

export interface ModalInstance {
  open: () => void
  close: () => void
  toggle: () => void
}

// Button相关类型
export interface ButtonProps {
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  size?: 'large' | 'default' | 'small'
  loading?: boolean
  disabled?: boolean
  icon?: string
  circle?: boolean
  round?: boolean
  plain?: boolean
  autoloading?: boolean // 是否自动loading
  [key: string]: any
}

