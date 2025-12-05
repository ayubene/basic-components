# 使用示例

## BasicTable 示例

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
    @delete="handleDelete"
  >
    <!-- 自定义操作列 -->
    <template #action="{ row }">
      <el-button type="info" link size="small" @click="handleView(row)">
        查看
      </el-button>
    </template>
  </BasicTable>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BasicTable } from 'srit-basic-components'
import type { TableColumn } from 'srit-basic-components'

const tableRef = ref()

const columns: TableColumn[] = [
  { field: 'id', title: 'ID', width: 80 },
  {
    field: 'name',
    title: '姓名',
    searchable: true,
    searchType: 'input',
    searchPlaceholder: '请输入姓名'
  },
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
  },
  {
    field: 'avatar',
    title: '头像',
    slots: {
      default: 'avatar'
    }
  }
]

const handleCreate = () => {
  console.log('创建')
}

const handleEdit = (row: any) => {
  console.log('编辑', row)
}

const handleDelete = (row: any) => {
  console.log('删除', row)
}

const handleView = (row: any) => {
  console.log('查看', row)
}

// 刷新表格
const refreshTable = () => {
  tableRef.value?.refresh()
}
</script>
```

## BasicSelect 示例

```vue
<template>
  <div>
    <!-- 基础用法 -->
    <BasicSelect
      v-model="value1"
      list-url="/api/users"
      value-key="id"
      label-key="name"
      placeholder="请选择用户"
    />

    <!-- 远程搜索 -->
    <BasicSelect
      v-model="value2"
      list-url="/api/users"
      :remote="true"
      value-key="id"
      label-key="name"
      placeholder="请输入关键词搜索"
    />

    <!-- 多选 -->
    <BasicSelect
      v-model="value3"
      list-url="/api/users"
      :multiple="true"
      value-key="id"
      label-key="name"
      placeholder="请选择用户（可多选）"
    />

    <!-- 自定义数据转换 -->
    <BasicSelect
      v-model="value4"
      list-url="/api/users"
      :transform="transformData"
      placeholder="请选择用户"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BasicSelect } from 'srit-basic-components'

const value1 = ref()
const value2 = ref()
const value3 = ref([])
const value4 = ref()

const transformData = (data: any[]) => {
  return data.map((item) => ({
    label: `${item.name} (${item.email})`,
    value: item.id
  }))
}
</script>
```

## BasicButton 示例

```vue
<template>
  <div>
    <!-- 自动loading -->
    <BasicButton
      type="primary"
      :autoloading="true"
      :on-click="handleSubmit"
    >
      提交
    </BasicButton>

    <!-- 手动控制loading -->
    <BasicButton
      type="primary"
      :loading="loading"
      :autoloading="false"
      @click="handleClick"
    >
      手动控制
    </BasicButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BasicButton } from 'srit-basic-components'

const loading = ref(false)

const handleSubmit = async () => {
  // 自动显示loading，完成后自动隐藏
  await new Promise((resolve) => setTimeout(resolve, 2000))
  console.log('提交成功')
}

const handleClick = async () => {
  loading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log('操作成功')
  } finally {
    loading.value = false
  }
}
</script>
```

## BasicModal 示例

```vue
<template>
  <div>
    <el-button @click="open">打开弹窗</el-button>

    <BasicModal v-model="visible" title="示例弹窗" width="600px">
      <p>这是弹窗内容</p>
      <template #footer>
        <el-button @click="close">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </template>
    </BasicModal>
  </div>
</template>

<script setup lang="ts">
import { BasicModal, useModal } from 'srit-basic-components'

// 使用Hooks管理
const { visible, open, close } = useModal()

const handleConfirm = () => {
  console.log('确认')
  close()
}
</script>
```

## 组合使用示例

```vue
<template>
  <div>
    <BasicModal v-model="modalVisible" title="用户管理" width="800px">
      <BasicTable
        :columns="columns"
        query-url="/api/users"
        :show-toolbar="false"
        :show-pager="false"
      />
    </BasicModal>

    <BasicButton type="primary" @click="openModal">
      打开用户列表
    </BasicButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BasicModal, BasicTable, BasicButton, useModal } from 'srit-basic-components'
import type { TableColumn } from 'srit-basic-components'

const { visible: modalVisible, open: openModal } = useModal()

const columns: TableColumn[] = [
  { field: 'id', title: 'ID' },
  { field: 'name', title: '姓名' }
]
</script>
```

