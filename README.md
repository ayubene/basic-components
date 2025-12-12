# Basic Components

基于 Vue 3 + TypeScript + Element Plus + VXE Table 的基础组件库

## 安装

```bash
npm install srit-basic-components
```

## 使用

### 全局引入

```typescript
import { createApp } from 'vue'
import BasicComponents from 'srit-basic-components'
import 'element-plus/dist/index.css'
import 'vxe-table/lib/style.css'

const app = createApp(App)
app.use(BasicComponents)
```

### 按需引入

```vue
<template>
  <BasicTable
    :columns="columns"
    query-url="/api/users"
    delete-url="/api/users"
    export-url="/api/users/export"
  />
</template>

<script setup lang="ts">
import { BasicTable } from 'srit-basic-components'
import type { TableColumn } from 'srit-basic-components'
</script>
```

## 组件

### BasicTable

功能强大的表格组件，支持自动生成增删改查功能。

#### Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| columns | 列配置 | TableColumn[] | 必填 |
| queryUrl | 查询URL | string | 必填 |
| deleteUrl | 删除URL | string | - |
| exportUrl | 导出URL | string | - |
| rowId | 行ID字段 | string | 'id' |
| pageSize | 每页条数 | number | 10 |
| height | 表格高度 | number \| string | 'auto' |
| showPager | 显示分页 | boolean | true |
| showToolbar | 显示工具栏 | boolean | true |
| showExport | 显示导出按钮 | boolean | true |
| showCreate | 显示创建按钮 | boolean | true |
| showDelete | 显示删除按钮 | boolean | true |

#### TableColumn

```typescript
interface TableColumn {
  field: string // 字段名
  title: string // 标题
  width?: number | string // 宽度
  align?: 'left' | 'center' | 'right' // 对齐方式
  sortable?: boolean // 是否可排序
  searchable?: boolean // 是否可搜索
  searchType?: 'input' | 'select' | 'date' | 'daterange' | 'number' // 搜索类型
  searchOptions?: Array<{ label: string; value: any }> // 搜索选项
  slots?: {
    default?: string // 自定义列内容
    header?: string // 自定义列头
  }
}
```

#### 示例

```vue
<template>
  <BasicTable
    ref="tableRef"
    :columns="columns"
    query-url="/api/users"
    delete-url="/api/users"
    export-url="/api/users/export"
    @create="handleCreate"
    @edit="handleEdit"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BasicTable } from 'srit-basic-components'
import type { TableColumn } from 'srit-basic-components'

const tableRef = ref()

const columns: TableColumn[] = [
  { field: 'id', title: 'ID', width: 80 },
  { field: 'name', title: '姓名', searchable: true, searchType: 'input' },
  {
    field: 'status',
    title: '状态',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 }
    ]
  },
  {
    field: 'createTime',
    title: '创建时间',
    searchable: true,
    searchType: 'daterange'
  }
]

const handleCreate = () => {
  // 处理创建
}

const handleEdit = (row: any) => {
  // 处理编辑
}
</script>
```

### BasicSelect

支持远程搜索的下拉选择组件。

#### Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| modelValue | 绑定值 | any | - |
| listUrl | 列表URL | string | 必填 |
| valueKey | 值字段 | string | 'value' |
| labelKey | 标签字段 | string | 'label' |
| remote | 是否远程搜索 | boolean | false |
| multiple | 是否多选 | boolean | false |
| clearable | 可清空 | boolean | true |
| filterable | 可筛选 | boolean | true |

#### 示例

```vue
<template>
  <BasicSelect
    v-model="value"
    list-url="/api/users"
    value-key="id"
    label-key="name"
    :remote="true"
    placeholder="请选择用户"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BasicSelect } from 'srit-basic-components'

const value = ref()
</script>
```

### BasicButton

支持自动loading效果的按钮组件。

#### Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| type | 按钮类型 | string | 'default' |
| size | 按钮尺寸 | string | 'default' |
| autoloading | 自动loading | boolean | true |
| loading | 手动控制loading | boolean | false |

#### 示例

```vue
<template>
  <BasicButton
    type="primary"
    :autoloading="true"
    @click="handleAsyncAction"
  >
    提交
  </BasicButton>
</template>

<script setup lang="ts">
import { BasicButton } from 'srit-basic-components'

const handleAsyncAction = async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  console.log('完成')
}
</script>
```

### BasicModal

支持Hooks操作的模态框组件。

#### Props

继承 Element Plus Dialog 的所有属性。

#### 示例

```vue
<template>
  <BasicModal v-model="visible" title="标题">
    <p>内容</p>
  </BasicModal>
</template>

<script setup lang="ts">
import { BasicModal, useModal } from 'srit-basic-components'

const { visible, open, close } = useModal()
</script>
```

## 开发

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build:lib

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 格式化
npm run format
```

## License

MIT

## TODO
BasicTable列设置筛选和修改顺序后不会自动更新，需手动
