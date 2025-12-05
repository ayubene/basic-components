# 安装和构建说明

## 安装依赖

```bash
npm install
```

## 开发

```bash
npm run dev
```

## 构建库

```bash
npm run build:lib
```

构建完成后，文件将输出到 `dist` 目录：
- `dist/index.js` - CommonJS 格式
- `dist/index.esm.js` - ES Module 格式
- `dist/index.d.ts` - TypeScript 类型定义

## 发布到 npm

1. 更新 `package.json` 中的版本号
2. 登录 npm：`npm login`
3. 发布：`npm publish`

## 在其他项目中使用

### 安装

```bash
npm install srit-basic-components
```

### 使用

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
<script setup lang="ts">
import { BasicTable, BasicSelect } from 'srit-basic-components'
</script>
```

