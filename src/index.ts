import type { App } from 'vue'
import BasicButton from './components/BasicButton/BasicButton.vue'
import BasicSelect from './components/BasicSelect/BasicSelect.vue'
import BasicModal from './components/BasicModal/BasicModal.vue'
import BasicTable from './components/BasicTable/BasicTable.vue'

// 导出所有组件
export { BasicButton, BasicSelect, BasicModal, BasicTable }

// 导出Hooks
export { useModal } from './components/BasicModal/useModal'

// 导出类型
export * from './types'

// 导出工具
export { request, createRequest } from './utils/request'

// 组件列表
const components = [BasicButton, BasicSelect, BasicModal, BasicTable]

// 安装函数
const install = (app: App) => {
  components.forEach((component) => {
    const name = component.name || (component as any).__name
    if (name) {
      app.component(name, component)
    }
  })
}

// 支持按需引入
export default {
  install
}

