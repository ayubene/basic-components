import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
// 使用相对路径，避免依赖外部项目的 @ 别名配置
import { request } from '../../utils/request';
import BasicButton from '../BasicButton/BasicButton.vue';
import BasicModal from '../BasicModal/BasicModal.vue';
import BasicSelect from '../BasicSelect/BasicSelect.vue';
defineOptions({
    name: 'BasicTable'
});
const props = withDefaults(defineProps(), {
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
});
const emit = defineEmits();
// Refs
const tableRef = ref();
const searchFormRef = ref();
const tableData = ref([]);
const selectedRows = ref([]);
const loading = ref(false);
// 搜索表单
const searchForm = ref({});
// 列自定义相关
const showColumnCustomizeDialog = ref(false);
const showColumnEditDialog = ref(false);
const editingColumnIndex = ref(-1);
const editingColumn = ref({
    field: '',
    title: '',
    visible: true,
    searchable: false,
    sortable: false
});
const customizedColumns = ref([]);
// 获取存储key
const getStorageKey = () => {
    return `basic-table-columns-${props.columnCustomizeKey}`;
};
// 加载保存的列配置
const loadSavedColumns = () => {
    if (!props.enableColumnCustomize)
        return null;
    try {
        const saved = localStorage.getItem(getStorageKey());
        if (saved) {
            return JSON.parse(saved);
        }
    }
    catch (error) {
        console.error('加载列配置失败:', error);
    }
    return null;
};
// 保存列配置
const saveColumns = (columns) => {
    if (!props.enableColumnCustomize)
        return;
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(columns));
    }
    catch (error) {
        console.error('保存列配置失败:', error);
    }
};
// 初始化自定义列
const initCustomizedColumns = () => {
    if (!props.enableColumnCustomize) {
        return props.columns;
    }
    const saved = loadSavedColumns();
    if (saved && Array.isArray(saved) && saved.length > 0) {
        // 合并保存的配置和原始配置
        const merged = props.columns.map((col) => {
            const savedCol = saved.find((s) => s.field === col.field);
            if (savedCol) {
                return {
                    ...col,
                    ...savedCol,
                    filterable: savedCol.filterable ?? col.filterable ?? false,
                    editRender: savedCol.editRender ?? col.editRender ?? undefined
                };
            }
            return {
                ...col,
                visible: true,
                filterable: col.filterable ?? false,
                editRender: col.editRender ?? undefined
            };
        });
        // 添加保存的新列（不在原始columns中的）
        const newColumns = saved
            .filter((s) => !props.columns.find((c) => c.field === s.field))
            .map((s) => ({
            ...s,
            filterable: s.filterable ?? false,
            editRender: s.editRender ?? undefined
        }));
        return [...merged, ...newColumns];
    }
    // 默认所有列都显示，确保有默认的 filterable 和 editRender 属性
    return props.columns.map((col) => ({
        ...col,
        visible: true,
        filterable: col.filterable ?? false,
        editRender: col.editRender ?? undefined
    }));
};
// 当前显示的列（根据用户配置过滤）
const displayColumns = computed(() => {
    if (!props.enableColumnCustomize) {
        return props.columns;
    }
    return customizedColumns.value.filter((col) => col.visible !== false);
});
// 分页
const pagination = ref({
    page: 1,
    pageSize: props.pageSize,
    total: 0
});
// 计算可搜索的列
const searchableColumns = computed(() => {
    const cols = props.enableColumnCustomize ? displayColumns.value : props.columns;
    return cols.filter((col) => col.searchable);
});
const hasSearchableColumns = computed(() => {
    return searchableColumns.value.length > 0;
});
// 列宽拖动配置
const enableResizable = computed(() => {
    return props.enableResizable !== false;
});
// 列拖拽排序配置
const enableColumnDrag = computed(() => {
    return props.enableColumnDrag === true;
});
// 检查是否有可编辑的列
const hasEditableColumns = computed(() => {
    const cols = props.enableColumnCustomize ? customizedColumns.value : props.columns;
    return cols.some((col) => !!col.editRender);
});
// 搜索表单展开/收起
const searchExpanded = ref(false);
const searchColumnsLimit = 6; // 默认显示的最大搜索项数量
const hasMoreSearchColumns = computed(() => {
    return searchableColumns.value.length > searchColumnsLimit;
});
const displayedSearchColumns = computed(() => {
    if (!hasMoreSearchColumns.value || searchExpanded.value) {
        return searchableColumns.value;
    }
    return searchableColumns.value.slice(0, searchColumnsLimit);
});
const toggleSearchExpand = () => {
    searchExpanded.value = !searchExpanded.value;
};
// 初始化搜索表单
const initSearchForm = () => {
    const form = {};
    searchableColumns.value.forEach((col) => {
        form[col.field] = col.searchType === 'daterange' ? [] : undefined;
    });
    searchForm.value = form;
};
// 加载数据
const loadData = async () => {
    try {
        loading.value = true;
        const params = {
            page: pagination.value.page,
            pageSize: pagination.value.pageSize,
            ...searchForm.value
        };
        // 处理日期范围
        const allColumns = props.enableColumnCustomize
            ? customizedColumns.value
            : props.columns;
        Object.keys(params).forEach((key) => {
            const column = allColumns.find((col) => col.field === key);
            if (column?.searchType === 'daterange' && Array.isArray(params[key])) {
                if (params[key].length === 2) {
                    params[`${key}Start`] = params[key][0];
                    params[`${key}End`] = params[key][1];
                }
                delete params[key];
            }
        });
        const response = await request.get(props.queryUrl, params);
        let data = response.data;
        // 处理不同的数据格式
        if (Array.isArray(data)) {
            tableData.value = data;
            pagination.value.total = data.length;
        }
        else if (data.list || data.data || data.items) {
            tableData.value = data.list || data.data || data.items;
            pagination.value.total = data.total || data.totalCount || tableData.value.length;
        }
        else {
            tableData.value = [];
            pagination.value.total = 0;
        }
    }
    catch (error) {
        console.error('Load table data error:', error);
        ElMessage.error('加载数据失败');
        tableData.value = [];
        pagination.value.total = 0;
    }
    finally {
        loading.value = false;
    }
};
// 搜索
const handleSearch = () => {
    pagination.value.page = 1;
    loadData();
};
// 重置
const handleReset = () => {
    initSearchForm();
    handleSearch();
};
// 分页变化
const handlePageChange = (page) => {
    pagination.value.page = page;
    loadData();
};
const handleSizeChange = (size) => {
    pagination.value.pageSize = size;
    pagination.value.page = 1;
    loadData();
};
// 选择变化
const handleCheckboxChange = () => {
    selectedRows.value = tableRef.value?.getCheckboxRecords() || [];
    emit('selectionChange', selectedRows.value);
};
const handleCheckboxAll = () => {
    selectedRows.value = tableRef.value?.getCheckboxRecords() || [];
    emit('selectionChange', selectedRows.value);
};
// 排序变化
const handleSortChange = (params) => {
    // 可以在这里处理排序逻辑，如果需要的话
    console.log('Sort changed:', params);
};
// 筛选变化
const handleFilterChange = (params) => {
    // 筛选变化时重新加载数据
    pagination.value.page = 1;
    loadData();
};
// 单元格编辑完成
const handleEditClosed = (params) => {
    // 可以在这里处理编辑后的数据保存
    console.log('Cell edit closed:', params);
    // 如果需要自动保存，可以在这里调用保存接口
};
// 新增
const handleCreate = () => {
    emit('create');
};
// 编辑
const handleEdit = (row) => {
    emit('edit', row);
};
// 删除
const handleDelete = async (row) => {
    if (!props.deleteUrl) {
        emit('delete', row);
        return;
    }
    try {
        await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
            type: 'warning'
        });
        await request.delete(props.deleteUrl, { id: row[props.rowId] });
        ElMessage.success('删除成功');
        loadData();
        emit('delete', row);
    }
    catch (error) {
        if (error !== 'cancel') {
            console.error('Delete error:', error);
            ElMessage.error('删除失败');
        }
    }
};
// 批量删除
const handleBatchDelete = async () => {
    if (selectedRows.value.length === 0) {
        ElMessage.warning('请选择要删除的记录');
        return;
    }
    if (!props.deleteUrl) {
        ElMessage.warning('未配置删除URL');
        return;
    }
    try {
        await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条记录吗？`, '提示', {
            type: 'warning'
        });
        const ids = selectedRows.value.map((row) => row[props.rowId]);
        await request.delete(props.deleteUrl, { ids: ids });
        ElMessage.success('删除成功');
        selectedRows.value = [];
        loadData();
    }
    catch (error) {
        if (error !== 'cancel') {
            console.error('Batch delete error:', error);
            ElMessage.error('删除失败');
        }
    }
};
// 导出
const handleExport = async () => {
    if (!props.exportUrl) {
        ElMessage.warning('未配置导出URL');
        return;
    }
    try {
        const params = {
            ...searchForm.value
        };
        // 处理日期范围
        const allColumns = props.enableColumnCustomize
            ? customizedColumns.value
            : props.columns;
        Object.keys(params).forEach((key) => {
            const column = allColumns.find((col) => col.field === key);
            if (column?.searchType === 'daterange' && Array.isArray(params[key])) {
                if (params[key].length === 2) {
                    params[`${key}Start`] = params[key][0];
                    params[`${key}End`] = params[key][1];
                }
                delete params[key];
            }
        });
        const blob = await request.download(props.exportUrl, params);
        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `导出数据_${new Date().getTime()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        ElMessage.success('导出成功');
    }
    catch (error) {
        console.error('Export error:', error);
        ElMessage.error('导出失败');
    }
};
// 暴露方法
const refresh = () => {
    return loadData();
};
const getTableData = () => {
    return tableData.value;
};
const getSelectedRows = () => {
    return selectedRows.value;
};
const clearSelection = () => {
    tableRef.value?.clearCheckboxRow();
    selectedRows.value = [];
};
const exportData = () => {
    return handleExport();
};
let __VLS_exposed;
defineExpose({
    refresh,
    getTableData,
    getSelectedRows,
    clearSelection,
    exportData
});
// 列自定义相关方法
const handleAddColumn = () => {
    editingColumnIndex.value = -1;
    editingColumn.value = {
        field: '',
        title: '',
        visible: true,
        searchable: false,
        sortable: false,
        searchType: 'input',
        searchOptions: []
    };
    showColumnEditDialog.value = true;
};
const handleEditColumn = (column, index) => {
    editingColumnIndex.value = index;
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
    };
    // 如果开启了筛选但没有筛选选项，尝试自动生成
    if (editingColumn.value.filterable && (!editingColumn.value.filters || editingColumn.value.filters.length === 0)) {
        initEditingColumnFilters();
    }
    showColumnEditDialog.value = true;
};
const handleDeleteColumn = (index) => {
    ElMessageBox.confirm('确定要删除这一列吗？', '提示', {
        type: 'warning'
    })
        .then(() => {
        customizedColumns.value.splice(index, 1);
        ElMessage.success('删除成功');
    })
        .catch(() => { });
};
const handleAddSearchOption = () => {
    if (!editingColumn.value.searchOptions) {
        editingColumn.value.searchOptions = [];
    }
    editingColumn.value.searchOptions.push({ label: '', value: '' });
};
const handleRemoveSearchOption = (index) => {
    editingColumn.value.searchOptions?.splice(index, 1);
};
const handleAddFilter = () => {
    if (!editingColumn.value.filters) {
        editingColumn.value.filters = [];
    }
    editingColumn.value.filters.push({ label: '', value: '' });
};
// 初始化编辑列的筛选选项
const initEditingColumnFilters = () => {
    if (editingColumn.value.filterable && (!editingColumn.value.filters || editingColumn.value.filters.length === 0)) {
        // 如果开启了筛选但没有筛选选项，尝试从表格数据中自动生成
        const uniqueValues = getUniqueValuesFromColumn(editingColumn.value.field);
        if (uniqueValues.length > 0) {
            editingColumn.value.filters = uniqueValues.slice(0, 10).map((val) => ({
                label: String(val),
                value: val
            }));
        }
        else {
            // 如果没有数据，初始化为空数组（用户需要手动添加）
            editingColumn.value.filters = [];
        }
    }
};
const handleRemoveFilter = (index) => {
    editingColumn.value.filters?.splice(index, 1);
};
const handleAddEditOption = () => {
    if (!editingColumn.value.editRender) {
        editingColumn.value.editRender = { name: 'select', options: [] };
    }
    if (!editingColumn.value.editRender.options) {
        editingColumn.value.editRender.options = [];
    }
    editingColumn.value.editRender.options.push({ label: '', value: '' });
};
const handleRemoveEditOption = (index) => {
    editingColumn.value.editRender?.options?.splice(index, 1);
};
// 切换列的筛选功能
const handleToggleFilterable = (index, val) => {
    if (customizedColumns.value[index]) {
        customizedColumns.value[index].filterable = val;
        if (!val) {
            // 如果关闭筛选，清空筛选选项
            customizedColumns.value[index].filters = undefined;
        }
        else if (!customizedColumns.value[index].filters || customizedColumns.value[index].filters.length === 0) {
            // 如果开启筛选但没有筛选选项，尝试从表格数据中自动生成
            const column = customizedColumns.value[index];
            const uniqueValues = getUniqueValuesFromColumn(column.field);
            if (uniqueValues.length > 0) {
                customizedColumns.value[index].filters = uniqueValues.map((val) => ({
                    label: String(val),
                    value: val
                }));
            }
            else {
                // 如果没有数据，初始化为空数组（用户需要手动添加）
                customizedColumns.value[index].filters = [];
            }
        }
    }
};
// 从表格数据中获取列的唯一值
const getUniqueValuesFromColumn = (field) => {
    const values = new Set();
    tableData.value.forEach((row) => {
        if (row[field] !== undefined && row[field] !== null) {
            values.add(row[field]);
        }
    });
    return Array.from(values).slice(0, 20); // 最多返回20个唯一值
};
// 切换列的编辑功能
const handleToggleEditable = (index, val) => {
    if (customizedColumns.value[index]) {
        if (val) {
            // 如果开启编辑，默认设置为 input 类型
            customizedColumns.value[index].editRender = { name: 'input' };
        }
        else {
            // 如果关闭编辑，清空编辑配置
            customizedColumns.value[index].editRender = undefined;
        }
    }
};
const handleSaveColumn = () => {
    if (!editingColumn.value.field || !editingColumn.value.title) {
        ElMessage.warning('请填写列名和字段名');
        return;
    }
    // 如果开启了筛选但没有筛选选项，给出提示
    if (editingColumn.value.filterable && (!editingColumn.value.filters || editingColumn.value.filters.length === 0)) {
        ElMessage.warning('已开启筛选功能，但未添加筛选选项。筛选功能需要至少一个筛选选项才能生效。');
        return;
    }
    // 验证字段名唯一性
    const exists = customizedColumns.value.find((col, index) => col.field === editingColumn.value.field && index !== editingColumnIndex.value);
    if (exists) {
        ElMessage.warning('字段名已存在');
        return;
    }
    if (editingColumnIndex.value === -1) {
        // 新增
        customizedColumns.value.push({ ...editingColumn.value });
    }
    else {
        // 编辑
        customizedColumns.value[editingColumnIndex.value] = { ...editingColumn.value };
    }
    showColumnEditDialog.value = false;
    ElMessage.success(editingColumnIndex.value === -1 ? '新增成功' : '保存成功');
};
const handleSaveColumns = () => {
    saveColumns(customizedColumns.value);
    showColumnCustomizeDialog.value = false;
    ElMessage.success('列配置已保存');
};
const handleResetColumns = () => {
    ElMessageBox.confirm('确定要重置为默认列配置吗？', '提示', {
        type: 'warning'
    })
        .then(() => {
        customizedColumns.value = props.columns.map((col) => ({ ...col, visible: true }));
        localStorage.removeItem(getStorageKey());
        ElMessage.success('已重置为默认配置');
    })
        .catch(() => { });
};
const handleColumnDialogClose = () => {
    // 关闭时恢复为保存的配置
    const saved = loadSavedColumns();
    if (saved) {
        customizedColumns.value = saved.map((col) => ({ ...col }));
    }
    else {
        customizedColumns.value = props.columns.map((col) => ({ ...col, visible: true }));
    }
};
// 初始化
onMounted(() => {
    initSearchForm();
    if (props.enableColumnCustomize) {
        customizedColumns.value = initCustomizedColumns();
    }
    loadData();
});
// 监听queryUrl变化
watch(() => props.queryUrl, () => {
    loadData();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
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
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "basic-table" },
});
if (__VLS_ctx.hasSearchableColumns) {
    const __VLS_0 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onSubmit': {} },
        ref: "searchFormRef",
        model: (__VLS_ctx.searchForm),
        ...{ class: "search-form" },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onSubmit': {} },
        ref: "searchFormRef",
        model: (__VLS_ctx.searchForm),
        ...{ class: "search-form" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onSubmit: () => { }
    };
    /** @type {typeof __VLS_ctx.searchFormRef} */ ;
    var __VLS_8 = {};
    __VLS_3.slots.default;
    const __VLS_10 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        gutter: (20),
    }));
    const __VLS_12 = __VLS_11({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_13.slots.default;
    for (const [column] of __VLS_getVForSourceType((__VLS_ctx.displayedSearchColumns))) {
        const __VLS_14 = {}.ElCol;
        /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
            key: (column.field),
            span: (24 / __VLS_ctx.searchFormCols),
        }));
        const __VLS_16 = __VLS_15({
            key: (column.field),
            span: (24 / __VLS_ctx.searchFormCols),
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
        __VLS_17.slots.default;
        const __VLS_18 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
            label: (column.title),
            prop: (column.field),
        }));
        const __VLS_20 = __VLS_19({
            label: (column.title),
            prop: (column.field),
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
        __VLS_21.slots.default;
        if (!column.searchType || column.searchType === 'input') {
            const __VLS_22 = {}.ElInput;
            /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
            // @ts-ignore
            const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
                ...{ 'onKeyup': {} },
                modelValue: (__VLS_ctx.searchForm[column.field]),
                placeholder: (column.searchPlaceholder || `请输入${column.title}`),
                clearable: true,
                ...{ style: {} },
            }));
            const __VLS_24 = __VLS_23({
                ...{ 'onKeyup': {} },
                modelValue: (__VLS_ctx.searchForm[column.field]),
                placeholder: (column.searchPlaceholder || `请输入${column.title}`),
                clearable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_23));
            let __VLS_26;
            let __VLS_27;
            let __VLS_28;
            const __VLS_29 = {
                onKeyup: (__VLS_ctx.handleSearch)
            };
            var __VLS_25;
        }
        else if (column.searchType === 'select') {
            /** @type {[typeof BasicSelect, ]} */ ;
            // @ts-ignore
            const __VLS_30 = __VLS_asFunctionalComponent(BasicSelect, new BasicSelect({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                placeholder: (column.searchPlaceholder || `请选择${column.title}`),
                options: (column.searchOptions),
                ...{ style: {} },
            }));
            const __VLS_31 = __VLS_30({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                placeholder: (column.searchPlaceholder || `请选择${column.title}`),
                options: (column.searchOptions),
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        }
        else if (column.searchType === 'date') {
            const __VLS_33 = {}.ElDatePicker;
            /** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
            // @ts-ignore
            const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                type: "date",
                placeholder: (column.searchPlaceholder || `请选择${column.title}`),
                clearable: true,
                ...{ style: {} },
            }));
            const __VLS_35 = __VLS_34({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                type: "date",
                placeholder: (column.searchPlaceholder || `请选择${column.title}`),
                clearable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_34));
        }
        else if (column.searchType === 'daterange') {
            const __VLS_37 = {}.ElDatePicker;
            /** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
            // @ts-ignore
            const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                type: "daterange",
                rangeSeparator: "至",
                startPlaceholder: "开始日期",
                endPlaceholder: "结束日期",
                clearable: true,
                ...{ style: {} },
            }));
            const __VLS_39 = __VLS_38({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                type: "daterange",
                rangeSeparator: "至",
                startPlaceholder: "开始日期",
                endPlaceholder: "结束日期",
                clearable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        }
        else if (column.searchType === 'number') {
            const __VLS_41 = {}.ElInputNumber;
            /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                placeholder: (column.searchPlaceholder || `请输入${column.title}`),
                clearable: true,
                ...{ style: {} },
            }));
            const __VLS_43 = __VLS_42({
                modelValue: (__VLS_ctx.searchForm[column.field]),
                placeholder: (column.searchPlaceholder || `请输入${column.title}`),
                clearable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_42));
        }
        var __VLS_21;
        var __VLS_17;
    }
    const __VLS_45 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
        span: (24 / __VLS_ctx.searchFormCols),
    }));
    const __VLS_47 = __VLS_46({
        span: (24 / __VLS_ctx.searchFormCols),
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    __VLS_48.slots.default;
    const __VLS_49 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({}));
    const __VLS_51 = __VLS_50({}, ...__VLS_functionalComponentArgsRest(__VLS_50));
    __VLS_52.slots.default;
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_54 = __VLS_53({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    let __VLS_56;
    let __VLS_57;
    let __VLS_58;
    const __VLS_59 = {
        onClick: (__VLS_ctx.handleSearch)
    };
    __VLS_55.slots.default;
    var __VLS_55;
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
    }));
    const __VLS_61 = __VLS_60({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    let __VLS_63;
    let __VLS_64;
    let __VLS_65;
    const __VLS_66 = {
        onClick: (__VLS_ctx.handleReset)
    };
    __VLS_62.slots.default;
    var __VLS_62;
    if (__VLS_ctx.hasMoreSearchColumns) {
        const __VLS_67 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_69 = __VLS_68({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        let __VLS_71;
        let __VLS_72;
        let __VLS_73;
        const __VLS_74 = {
            onClick: (__VLS_ctx.toggleSearchExpand)
        };
        __VLS_70.slots.default;
        (__VLS_ctx.searchExpanded ? '收起' : '展开');
        const __VLS_75 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
            ...{ style: {} },
        }));
        const __VLS_77 = __VLS_76({
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        __VLS_78.slots.default;
        if (__VLS_ctx.searchExpanded) {
            const __VLS_79 = {}.ArrowUp;
            /** @type {[typeof __VLS_components.ArrowUp, ]} */ ;
            // @ts-ignore
            const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({}));
            const __VLS_81 = __VLS_80({}, ...__VLS_functionalComponentArgsRest(__VLS_80));
        }
        else {
            const __VLS_83 = {}.ArrowDown;
            /** @type {[typeof __VLS_components.ArrowDown, ]} */ ;
            // @ts-ignore
            const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({}));
            const __VLS_85 = __VLS_84({}, ...__VLS_functionalComponentArgsRest(__VLS_84));
        }
        var __VLS_78;
        var __VLS_70;
    }
    var __VLS_52;
    var __VLS_48;
    var __VLS_13;
    var __VLS_3;
}
if (__VLS_ctx.showToolbar) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar" },
    });
    if (__VLS_ctx.showCreate) {
        /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
        // @ts-ignore
        const __VLS_87 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_88 = __VLS_87({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_87));
        let __VLS_90;
        let __VLS_91;
        let __VLS_92;
        const __VLS_93 = {
            onClick: (__VLS_ctx.handleCreate)
        };
        __VLS_89.slots.default;
        var __VLS_89;
    }
    if (__VLS_ctx.showDelete) {
        /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
        // @ts-ignore
        const __VLS_94 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
            ...{ 'onClick': {} },
            type: "danger",
            disabled: (__VLS_ctx.selectedRows.length === 0),
        }));
        const __VLS_95 = __VLS_94({
            ...{ 'onClick': {} },
            type: "danger",
            disabled: (__VLS_ctx.selectedRows.length === 0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_94));
        let __VLS_97;
        let __VLS_98;
        let __VLS_99;
        const __VLS_100 = {
            onClick: (__VLS_ctx.handleBatchDelete)
        };
        __VLS_96.slots.default;
        var __VLS_96;
    }
    if (__VLS_ctx.showExport) {
        /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
            type: "success",
            onClick: (__VLS_ctx.handleExport),
        }));
        const __VLS_102 = __VLS_101({
            type: "success",
            onClick: (__VLS_ctx.handleExport),
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        __VLS_103.slots.default;
        var __VLS_103;
    }
    if (__VLS_ctx.enableColumnCustomize) {
        /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
        // @ts-ignore
        const __VLS_104 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
            ...{ 'onClick': {} },
            type: "info",
        }));
        const __VLS_105 = __VLS_104({
            ...{ 'onClick': {} },
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_104));
        let __VLS_107;
        let __VLS_108;
        let __VLS_109;
        const __VLS_110 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showToolbar))
                    return;
                if (!(__VLS_ctx.enableColumnCustomize))
                    return;
                __VLS_ctx.showColumnCustomizeDialog = true;
            }
        };
        __VLS_106.slots.default;
        var __VLS_106;
    }
    var __VLS_111 = {};
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-wrapper" },
});
const __VLS_113 = {}.VxeTable;
/** @type {[typeof __VLS_components.VxeTable, typeof __VLS_components.vxeTable, typeof __VLS_components.VxeTable, typeof __VLS_components.vxeTable, ]} */ ;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
    ...{ 'onCheckboxChange': {} },
    ...{ 'onCheckboxAll': {} },
    ...{ 'onSortChange': {} },
    ...{ 'onFilterChange': {} },
    ...{ 'onEditClosed': {} },
    ref: "tableRef",
    data: (__VLS_ctx.tableData),
    stripe: (__VLS_ctx.stripe),
    border: (__VLS_ctx.border),
    loading: (__VLS_ctx.loading),
    scrollY: (props.enableVirtualScroll ? { enabled: true, gt: 100 } : { enabled: false }),
    height: (typeof __VLS_ctx.height === 'number' ? __VLS_ctx.height : undefined),
    resizable: (__VLS_ctx.enableResizable),
    columnConfig: ({ resizable: __VLS_ctx.enableResizable, drag: __VLS_ctx.enableColumnDrag }),
    sortConfig: ({ multiple: true, trigger: 'default' }),
    filterConfig: ({ remote: false }),
    editConfig: (__VLS_ctx.hasEditableColumns ? { enabled: true, trigger: 'click', mode: 'cell' } : undefined),
    autoResize: true,
}));
const __VLS_115 = __VLS_114({
    ...{ 'onCheckboxChange': {} },
    ...{ 'onCheckboxAll': {} },
    ...{ 'onSortChange': {} },
    ...{ 'onFilterChange': {} },
    ...{ 'onEditClosed': {} },
    ref: "tableRef",
    data: (__VLS_ctx.tableData),
    stripe: (__VLS_ctx.stripe),
    border: (__VLS_ctx.border),
    loading: (__VLS_ctx.loading),
    scrollY: (props.enableVirtualScroll ? { enabled: true, gt: 100 } : { enabled: false }),
    height: (typeof __VLS_ctx.height === 'number' ? __VLS_ctx.height : undefined),
    resizable: (__VLS_ctx.enableResizable),
    columnConfig: ({ resizable: __VLS_ctx.enableResizable, drag: __VLS_ctx.enableColumnDrag }),
    sortConfig: ({ multiple: true, trigger: 'default' }),
    filterConfig: ({ remote: false }),
    editConfig: (__VLS_ctx.hasEditableColumns ? { enabled: true, trigger: 'click', mode: 'cell' } : undefined),
    autoResize: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
let __VLS_117;
let __VLS_118;
let __VLS_119;
const __VLS_120 = {
    onCheckboxChange: (__VLS_ctx.handleCheckboxChange)
};
const __VLS_121 = {
    onCheckboxAll: (__VLS_ctx.handleCheckboxAll)
};
const __VLS_122 = {
    onSortChange: (__VLS_ctx.handleSortChange)
};
const __VLS_123 = {
    onFilterChange: (__VLS_ctx.handleFilterChange)
};
const __VLS_124 = {
    onEditClosed: (__VLS_ctx.handleEditClosed)
};
/** @type {typeof __VLS_ctx.tableRef} */ ;
var __VLS_125 = {};
__VLS_116.slots.default;
if (__VLS_ctx.showDelete) {
    const __VLS_127 = {}.VxeColumn;
    /** @type {[typeof __VLS_components.VxeColumn, typeof __VLS_components.vxeColumn, ]} */ ;
    // @ts-ignore
    const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
        type: "checkbox",
        width: "60",
    }));
    const __VLS_129 = __VLS_128({
        type: "checkbox",
        width: "60",
    }, ...__VLS_functionalComponentArgsRest(__VLS_128));
}
for (const [column] of __VLS_getVForSourceType((__VLS_ctx.displayColumns))) {
    const __VLS_131 = {}.VxeColumn;
    /** @type {[typeof __VLS_components.VxeColumn, typeof __VLS_components.vxeColumn, typeof __VLS_components.VxeColumn, typeof __VLS_components.vxeColumn, ]} */ ;
    // @ts-ignore
    const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
        key: (column.field),
        field: (column.field),
        title: (column.title),
        width: (column.width),
        minWidth: (column.minWidth),
        align: (column.align || 'center'),
        fixed: (column.fixed),
        sortable: (column.sortable),
        resizable: (column.resizable !== false && __VLS_ctx.enableResizable),
        filters: (column.filterable && column.filters && column.filters.length > 0 ? column.filters : undefined),
        filterMultiple: (column.filterable && column.filters && column.filters.length > 0),
        editRender: (column.editRender ? column.editRender : undefined),
        formatter: (column.formatter),
    }));
    const __VLS_133 = __VLS_132({
        key: (column.field),
        field: (column.field),
        title: (column.title),
        width: (column.width),
        minWidth: (column.minWidth),
        align: (column.align || 'center'),
        fixed: (column.fixed),
        sortable: (column.sortable),
        resizable: (column.resizable !== false && __VLS_ctx.enableResizable),
        filters: (column.filterable && column.filters && column.filters.length > 0 ? column.filters : undefined),
        filterMultiple: (column.filterable && column.filters && column.filters.length > 0),
        editRender: (column.editRender ? column.editRender : undefined),
        formatter: (column.formatter),
    }, ...__VLS_functionalComponentArgsRest(__VLS_132));
    __VLS_134.slots.default;
    if (column.slots?.default) {
        {
            const { default: __VLS_thisSlot } = __VLS_134.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            var __VLS_135 = {
                row: (row),
                column: (column),
            };
            var __VLS_136 = __VLS_tryAsConstant(column.slots.default);
        }
    }
    if (column.slots?.header) {
        {
            const { header: __VLS_thisSlot } = __VLS_134.slots;
            var __VLS_139 = {
                column: (column),
            };
            var __VLS_140 = __VLS_tryAsConstant(column.slots.header);
        }
    }
    var __VLS_134;
}
if (__VLS_ctx.showDelete || __VLS_ctx.showCreate) {
    const __VLS_143 = {}.VxeColumn;
    /** @type {[typeof __VLS_components.VxeColumn, typeof __VLS_components.vxeColumn, typeof __VLS_components.VxeColumn, typeof __VLS_components.vxeColumn, ]} */ ;
    // @ts-ignore
    const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
        title: "操作",
        width: "150",
        align: "center",
    }));
    const __VLS_145 = __VLS_144({
        title: "操作",
        width: "150",
        align: "center",
    }, ...__VLS_functionalComponentArgsRest(__VLS_144));
    __VLS_146.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_146.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.showCreate) {
            /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
            // @ts-ignore
            const __VLS_147 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
                ...{ 'onClick': {} },
                type: "primary",
                link: true,
                size: "small",
            }));
            const __VLS_148 = __VLS_147({
                ...{ 'onClick': {} },
                type: "primary",
                link: true,
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_147));
            let __VLS_150;
            let __VLS_151;
            let __VLS_152;
            const __VLS_153 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showDelete || __VLS_ctx.showCreate))
                        return;
                    if (!(__VLS_ctx.showCreate))
                        return;
                    __VLS_ctx.handleEdit(row);
                }
            };
            __VLS_149.slots.default;
            var __VLS_149;
        }
        if (__VLS_ctx.showDelete) {
            /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
            // @ts-ignore
            const __VLS_154 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
                ...{ 'onClick': {} },
                type: "danger",
                link: true,
                size: "small",
            }));
            const __VLS_155 = __VLS_154({
                ...{ 'onClick': {} },
                type: "danger",
                link: true,
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_154));
            let __VLS_157;
            let __VLS_158;
            let __VLS_159;
            const __VLS_160 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showDelete || __VLS_ctx.showCreate))
                        return;
                    if (!(__VLS_ctx.showDelete))
                        return;
                    __VLS_ctx.handleDelete(row);
                }
            };
            __VLS_156.slots.default;
            var __VLS_156;
        }
        var __VLS_161 = {
            row: (row),
        };
    }
    var __VLS_146;
}
var __VLS_116;
/** @type {[typeof BasicModal, typeof BasicModal, ]} */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(BasicModal, new BasicModal({
    ...{ 'onClosed': {} },
    modelValue: (__VLS_ctx.showColumnCustomizeDialog),
    title: "列设置",
    width: "800px",
}));
const __VLS_164 = __VLS_163({
    ...{ 'onClosed': {} },
    modelValue: (__VLS_ctx.showColumnCustomizeDialog),
    title: "列设置",
    width: "800px",
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
let __VLS_166;
let __VLS_167;
let __VLS_168;
const __VLS_169 = {
    onClosed: (__VLS_ctx.handleColumnDialogClose)
};
__VLS_165.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "column-customize" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "column-customize-header" },
});
/** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}));
const __VLS_171 = __VLS_170({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
let __VLS_173;
let __VLS_174;
let __VLS_175;
const __VLS_176 = {
    onClick: (__VLS_ctx.handleAddColumn)
};
__VLS_172.slots.default;
const __VLS_177 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({}));
const __VLS_179 = __VLS_178({}, ...__VLS_functionalComponentArgsRest(__VLS_178));
__VLS_180.slots.default;
const __VLS_181 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({}));
const __VLS_183 = __VLS_182({}, ...__VLS_functionalComponentArgsRest(__VLS_182));
var __VLS_180;
var __VLS_172;
/** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_186 = __VLS_185({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
let __VLS_188;
let __VLS_189;
let __VLS_190;
const __VLS_191 = {
    onClick: (__VLS_ctx.handleResetColumns)
};
__VLS_187.slots.default;
var __VLS_187;
const __VLS_192 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    data: (__VLS_ctx.customizedColumns),
    border: true,
    ...{ style: {} },
}));
const __VLS_194 = __VLS_193({
    data: (__VLS_ctx.customizedColumns),
    border: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
__VLS_195.slots.default;
const __VLS_196 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    type: "index",
    label: "序号",
    width: "60",
}));
const __VLS_198 = __VLS_197({
    type: "index",
    label: "序号",
    width: "60",
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
const __VLS_200 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    label: "显示",
    width: "80",
}));
const __VLS_202 = __VLS_201({
    label: "显示",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
__VLS_203.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_203.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_204 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        modelValue: (row.visible),
    }));
    const __VLS_206 = __VLS_205({
        modelValue: (row.visible),
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
}
var __VLS_203;
const __VLS_208 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
    label: "列名",
    prop: "title",
}));
const __VLS_210 = __VLS_209({
    label: "列名",
    prop: "title",
}, ...__VLS_functionalComponentArgsRest(__VLS_209));
const __VLS_212 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
    label: "字段",
    prop: "field",
}));
const __VLS_214 = __VLS_213({
    label: "字段",
    prop: "field",
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
const __VLS_216 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    label: "宽度",
    prop: "width",
    width: "100",
}));
const __VLS_218 = __VLS_217({
    label: "宽度",
    prop: "width",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
const __VLS_220 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    label: "可搜索",
    width: "100",
}));
const __VLS_222 = __VLS_221({
    label: "可搜索",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
__VLS_223.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_223.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_224 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        modelValue: (row.searchable),
    }));
    const __VLS_226 = __VLS_225({
        modelValue: (row.searchable),
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
}
var __VLS_223;
const __VLS_228 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    label: "可排序",
    width: "100",
}));
const __VLS_230 = __VLS_229({
    label: "可排序",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
__VLS_231.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_231.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_232 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        modelValue: (row.sortable),
    }));
    const __VLS_234 = __VLS_233({
        modelValue: (row.sortable),
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
}
var __VLS_231;
const __VLS_236 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
    label: "可筛选",
    width: "100",
}));
const __VLS_238 = __VLS_237({
    label: "可筛选",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_237));
__VLS_239.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_239.slots;
    const [{ row, $index }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_240 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        ...{ 'onChange': {} },
        modelValue: (!!row.filterable),
    }));
    const __VLS_242 = __VLS_241({
        ...{ 'onChange': {} },
        modelValue: (!!row.filterable),
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    let __VLS_244;
    let __VLS_245;
    let __VLS_246;
    const __VLS_247 = {
        onChange: ((val) => __VLS_ctx.handleToggleFilterable($index, val))
    };
    var __VLS_243;
}
var __VLS_239;
const __VLS_248 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    label: "可编辑",
    width: "100",
}));
const __VLS_250 = __VLS_249({
    label: "可编辑",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_251.slots;
    const [{ row, $index }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_252 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        ...{ 'onChange': {} },
        modelValue: (!!row.editRender),
    }));
    const __VLS_254 = __VLS_253({
        ...{ 'onChange': {} },
        modelValue: (!!row.editRender),
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    let __VLS_256;
    let __VLS_257;
    let __VLS_258;
    const __VLS_259 = {
        onChange: ((val) => __VLS_ctx.handleToggleEditable($index, val))
    };
    var __VLS_255;
}
var __VLS_251;
const __VLS_260 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    label: "操作",
    width: "150",
    fixed: "right",
}));
const __VLS_262 = __VLS_261({
    label: "操作",
    width: "150",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
__VLS_263.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_263.slots;
    const [{ row, $index }] = __VLS_getSlotParams(__VLS_thisSlot);
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_264 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
        size: "small",
    }));
    const __VLS_265 = __VLS_264({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_264));
    let __VLS_267;
    let __VLS_268;
    let __VLS_269;
    const __VLS_270 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleEditColumn(row, $index);
        }
    };
    __VLS_266.slots.default;
    var __VLS_266;
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_271 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
        type: "danger",
        link: true,
        size: "small",
    }));
    const __VLS_272 = __VLS_271({
        ...{ 'onClick': {} },
        type: "danger",
        link: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_271));
    let __VLS_274;
    let __VLS_275;
    let __VLS_276;
    const __VLS_277 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleDeleteColumn($index);
        }
    };
    __VLS_273.slots.default;
    var __VLS_273;
}
var __VLS_263;
var __VLS_195;
{
    const { footer: __VLS_thisSlot } = __VLS_165.slots;
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_278 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
    }));
    const __VLS_279 = __VLS_278({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_278));
    let __VLS_281;
    let __VLS_282;
    let __VLS_283;
    const __VLS_284 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showColumnCustomizeDialog = false;
        }
    };
    __VLS_280.slots.default;
    var __VLS_280;
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_286 = __VLS_285({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    let __VLS_288;
    let __VLS_289;
    let __VLS_290;
    const __VLS_291 = {
        onClick: (__VLS_ctx.handleSaveColumns)
    };
    __VLS_287.slots.default;
    var __VLS_287;
}
var __VLS_165;
/** @type {[typeof BasicModal, typeof BasicModal, ]} */ ;
// @ts-ignore
const __VLS_292 = __VLS_asFunctionalComponent(BasicModal, new BasicModal({
    modelValue: (__VLS_ctx.showColumnEditDialog),
    title: (__VLS_ctx.editingColumnIndex === -1 ? '新增列' : '编辑列'),
    width: "600px",
}));
const __VLS_293 = __VLS_292({
    modelValue: (__VLS_ctx.showColumnEditDialog),
    title: (__VLS_ctx.editingColumnIndex === -1 ? '新增列' : '编辑列'),
    width: "600px",
}, ...__VLS_functionalComponentArgsRest(__VLS_292));
__VLS_294.slots.default;
const __VLS_295 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
    model: (__VLS_ctx.editingColumn),
    labelWidth: "100px",
}));
const __VLS_297 = __VLS_296({
    model: (__VLS_ctx.editingColumn),
    labelWidth: "100px",
}, ...__VLS_functionalComponentArgsRest(__VLS_296));
__VLS_298.slots.default;
const __VLS_299 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_300 = __VLS_asFunctionalComponent(__VLS_299, new __VLS_299({
    label: "列名",
    required: true,
}));
const __VLS_301 = __VLS_300({
    label: "列名",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_300));
__VLS_302.slots.default;
const __VLS_303 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
    modelValue: (__VLS_ctx.editingColumn.title),
    placeholder: "请输入列名",
}));
const __VLS_305 = __VLS_304({
    modelValue: (__VLS_ctx.editingColumn.title),
    placeholder: "请输入列名",
}, ...__VLS_functionalComponentArgsRest(__VLS_304));
var __VLS_302;
const __VLS_307 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
    label: "字段名",
    required: true,
}));
const __VLS_309 = __VLS_308({
    label: "字段名",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_308));
__VLS_310.slots.default;
const __VLS_311 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
    modelValue: (__VLS_ctx.editingColumn.field),
    placeholder: "请输入字段名（英文）",
    disabled: (__VLS_ctx.editingColumnIndex !== -1),
}));
const __VLS_313 = __VLS_312({
    modelValue: (__VLS_ctx.editingColumn.field),
    placeholder: "请输入字段名（英文）",
    disabled: (__VLS_ctx.editingColumnIndex !== -1),
}, ...__VLS_functionalComponentArgsRest(__VLS_312));
var __VLS_310;
const __VLS_315 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
    label: "宽度",
}));
const __VLS_317 = __VLS_316({
    label: "宽度",
}, ...__VLS_functionalComponentArgsRest(__VLS_316));
__VLS_318.slots.default;
const __VLS_319 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_320 = __VLS_asFunctionalComponent(__VLS_319, new __VLS_319({
    modelValue: (__VLS_ctx.editingColumn.width),
    min: (0),
    placeholder: "留空自适应",
}));
const __VLS_321 = __VLS_320({
    modelValue: (__VLS_ctx.editingColumn.width),
    min: (0),
    placeholder: "留空自适应",
}, ...__VLS_functionalComponentArgsRest(__VLS_320));
var __VLS_318;
const __VLS_323 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
    label: "对齐方式",
}));
const __VLS_325 = __VLS_324({
    label: "对齐方式",
}, ...__VLS_functionalComponentArgsRest(__VLS_324));
__VLS_326.slots.default;
const __VLS_327 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_328 = __VLS_asFunctionalComponent(__VLS_327, new __VLS_327({
    modelValue: (__VLS_ctx.editingColumn.align),
    placeholder: "请选择",
}));
const __VLS_329 = __VLS_328({
    modelValue: (__VLS_ctx.editingColumn.align),
    placeholder: "请选择",
}, ...__VLS_functionalComponentArgsRest(__VLS_328));
__VLS_330.slots.default;
const __VLS_331 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
    label: "左对齐",
    value: "left",
}));
const __VLS_333 = __VLS_332({
    label: "左对齐",
    value: "left",
}, ...__VLS_functionalComponentArgsRest(__VLS_332));
const __VLS_335 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_336 = __VLS_asFunctionalComponent(__VLS_335, new __VLS_335({
    label: "居中",
    value: "center",
}));
const __VLS_337 = __VLS_336({
    label: "居中",
    value: "center",
}, ...__VLS_functionalComponentArgsRest(__VLS_336));
const __VLS_339 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
    label: "右对齐",
    value: "right",
}));
const __VLS_341 = __VLS_340({
    label: "右对齐",
    value: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_340));
var __VLS_330;
var __VLS_326;
const __VLS_343 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_344 = __VLS_asFunctionalComponent(__VLS_343, new __VLS_343({
    label: "可搜索",
}));
const __VLS_345 = __VLS_344({
    label: "可搜索",
}, ...__VLS_functionalComponentArgsRest(__VLS_344));
__VLS_346.slots.default;
const __VLS_347 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
    modelValue: (__VLS_ctx.editingColumn.searchable),
}));
const __VLS_349 = __VLS_348({
    modelValue: (__VLS_ctx.editingColumn.searchable),
}, ...__VLS_functionalComponentArgsRest(__VLS_348));
var __VLS_346;
const __VLS_351 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_352 = __VLS_asFunctionalComponent(__VLS_351, new __VLS_351({
    label: "可排序",
}));
const __VLS_353 = __VLS_352({
    label: "可排序",
}, ...__VLS_functionalComponentArgsRest(__VLS_352));
__VLS_354.slots.default;
const __VLS_355 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_356 = __VLS_asFunctionalComponent(__VLS_355, new __VLS_355({
    modelValue: (__VLS_ctx.editingColumn.sortable),
}));
const __VLS_357 = __VLS_356({
    modelValue: (__VLS_ctx.editingColumn.sortable),
}, ...__VLS_functionalComponentArgsRest(__VLS_356));
var __VLS_354;
const __VLS_359 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
    label: "可筛选",
}));
const __VLS_361 = __VLS_360({
    label: "可筛选",
}, ...__VLS_functionalComponentArgsRest(__VLS_360));
__VLS_362.slots.default;
const __VLS_363 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.editingColumn.filterable),
}));
const __VLS_365 = __VLS_364({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.editingColumn.filterable),
}, ...__VLS_functionalComponentArgsRest(__VLS_364));
let __VLS_367;
let __VLS_368;
let __VLS_369;
const __VLS_370 = {
    onChange: ((val) => {
        __VLS_ctx.editingColumn.filterable = val;
        if (val && (!__VLS_ctx.editingColumn.filters || __VLS_ctx.editingColumn.filters.length === 0)) {
            // 如果开启筛选但没有筛选选项，初始化一个空数组
            __VLS_ctx.editingColumn.filters = [];
        }
    })
};
var __VLS_366;
var __VLS_362;
if (__VLS_ctx.editingColumn.filterable) {
    const __VLS_371 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_372 = __VLS_asFunctionalComponent(__VLS_371, new __VLS_371({
        label: "筛选选项",
    }));
    const __VLS_373 = __VLS_372({
        label: "筛选选项",
    }, ...__VLS_functionalComponentArgsRest(__VLS_372));
    __VLS_374.slots.default;
    for (const [filter, index] of __VLS_getVForSourceType(((__VLS_ctx.editingColumn.filters || [])))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ style: {} },
        });
        const __VLS_375 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_376 = __VLS_asFunctionalComponent(__VLS_375, new __VLS_375({
            modelValue: (filter.label),
            placeholder: "标签",
            ...{ style: {} },
        }));
        const __VLS_377 = __VLS_376({
            modelValue: (filter.label),
            placeholder: "标签",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_376));
        const __VLS_379 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_380 = __VLS_asFunctionalComponent(__VLS_379, new __VLS_379({
            modelValue: (filter.value),
            placeholder: "值",
            ...{ style: {} },
        }));
        const __VLS_381 = __VLS_380({
            modelValue: (filter.value),
            placeholder: "值",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_380));
        const __VLS_383 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_384 = __VLS_asFunctionalComponent(__VLS_383, new __VLS_383({
            ...{ 'onClick': {} },
            type: "danger",
            link: true,
        }));
        const __VLS_385 = __VLS_384({
            ...{ 'onClick': {} },
            type: "danger",
            link: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_384));
        let __VLS_387;
        let __VLS_388;
        let __VLS_389;
        const __VLS_390 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.editingColumn.filterable))
                    return;
                __VLS_ctx.handleRemoveFilter(index);
            }
        };
        __VLS_386.slots.default;
        var __VLS_386;
    }
    const __VLS_391 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_392 = __VLS_asFunctionalComponent(__VLS_391, new __VLS_391({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }));
    const __VLS_393 = __VLS_392({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_392));
    let __VLS_395;
    let __VLS_396;
    let __VLS_397;
    const __VLS_398 = {
        onClick: (__VLS_ctx.handleAddFilter)
    };
    __VLS_394.slots.default;
    var __VLS_394;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    var __VLS_374;
}
const __VLS_399 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_400 = __VLS_asFunctionalComponent(__VLS_399, new __VLS_399({
    label: "可编辑",
}));
const __VLS_401 = __VLS_400({
    label: "可编辑",
}, ...__VLS_functionalComponentArgsRest(__VLS_400));
__VLS_402.slots.default;
const __VLS_403 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_404 = __VLS_asFunctionalComponent(__VLS_403, new __VLS_403({
    ...{ 'onChange': {} },
    modelValue: (!!__VLS_ctx.editingColumn.editRender),
}));
const __VLS_405 = __VLS_404({
    ...{ 'onChange': {} },
    modelValue: (!!__VLS_ctx.editingColumn.editRender),
}, ...__VLS_functionalComponentArgsRest(__VLS_404));
let __VLS_407;
let __VLS_408;
let __VLS_409;
const __VLS_410 = {
    onChange: ((val) => __VLS_ctx.editingColumn.editRender = val ? { name: 'input' } : undefined)
};
var __VLS_406;
var __VLS_402;
if (__VLS_ctx.editingColumn.editRender) {
    const __VLS_411 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_412 = __VLS_asFunctionalComponent(__VLS_411, new __VLS_411({
        label: "编辑类型",
    }));
    const __VLS_413 = __VLS_412({
        label: "编辑类型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_412));
    __VLS_414.slots.default;
    const __VLS_415 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_416 = __VLS_asFunctionalComponent(__VLS_415, new __VLS_415({
        modelValue: (__VLS_ctx.editingColumn.editRender.name),
        placeholder: "请选择",
    }));
    const __VLS_417 = __VLS_416({
        modelValue: (__VLS_ctx.editingColumn.editRender.name),
        placeholder: "请选择",
    }, ...__VLS_functionalComponentArgsRest(__VLS_416));
    __VLS_418.slots.default;
    const __VLS_419 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_420 = __VLS_asFunctionalComponent(__VLS_419, new __VLS_419({
        label: "输入框",
        value: "input",
    }));
    const __VLS_421 = __VLS_420({
        label: "输入框",
        value: "input",
    }, ...__VLS_functionalComponentArgsRest(__VLS_420));
    const __VLS_423 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_424 = __VLS_asFunctionalComponent(__VLS_423, new __VLS_423({
        label: "数字输入",
        value: "input-number",
    }));
    const __VLS_425 = __VLS_424({
        label: "数字输入",
        value: "input-number",
    }, ...__VLS_functionalComponentArgsRest(__VLS_424));
    const __VLS_427 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_428 = __VLS_asFunctionalComponent(__VLS_427, new __VLS_427({
        label: "下拉选择",
        value: "select",
    }));
    const __VLS_429 = __VLS_428({
        label: "下拉选择",
        value: "select",
    }, ...__VLS_functionalComponentArgsRest(__VLS_428));
    const __VLS_431 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_432 = __VLS_asFunctionalComponent(__VLS_431, new __VLS_431({
        label: "日期",
        value: "date",
    }));
    const __VLS_433 = __VLS_432({
        label: "日期",
        value: "date",
    }, ...__VLS_functionalComponentArgsRest(__VLS_432));
    var __VLS_418;
    var __VLS_414;
}
if (__VLS_ctx.editingColumn.editRender && __VLS_ctx.editingColumn.editRender.name === 'select') {
    const __VLS_435 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_436 = __VLS_asFunctionalComponent(__VLS_435, new __VLS_435({
        label: "编辑选项",
    }));
    const __VLS_437 = __VLS_436({
        label: "编辑选项",
    }, ...__VLS_functionalComponentArgsRest(__VLS_436));
    __VLS_438.slots.default;
    for (const [option, index] of __VLS_getVForSourceType((__VLS_ctx.editingColumn.editRender.options))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ style: {} },
        });
        const __VLS_439 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_440 = __VLS_asFunctionalComponent(__VLS_439, new __VLS_439({
            modelValue: (option.label),
            placeholder: "标签",
            ...{ style: {} },
        }));
        const __VLS_441 = __VLS_440({
            modelValue: (option.label),
            placeholder: "标签",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_440));
        const __VLS_443 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_444 = __VLS_asFunctionalComponent(__VLS_443, new __VLS_443({
            modelValue: (option.value),
            placeholder: "值",
            ...{ style: {} },
        }));
        const __VLS_445 = __VLS_444({
            modelValue: (option.value),
            placeholder: "值",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_444));
        const __VLS_447 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_448 = __VLS_asFunctionalComponent(__VLS_447, new __VLS_447({
            ...{ 'onClick': {} },
            type: "danger",
            link: true,
        }));
        const __VLS_449 = __VLS_448({
            ...{ 'onClick': {} },
            type: "danger",
            link: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_448));
        let __VLS_451;
        let __VLS_452;
        let __VLS_453;
        const __VLS_454 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.editingColumn.editRender && __VLS_ctx.editingColumn.editRender.name === 'select'))
                    return;
                __VLS_ctx.handleRemoveEditOption(index);
            }
        };
        __VLS_450.slots.default;
        var __VLS_450;
    }
    const __VLS_455 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_456 = __VLS_asFunctionalComponent(__VLS_455, new __VLS_455({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }));
    const __VLS_457 = __VLS_456({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_456));
    let __VLS_459;
    let __VLS_460;
    let __VLS_461;
    const __VLS_462 = {
        onClick: (__VLS_ctx.handleAddEditOption)
    };
    __VLS_458.slots.default;
    var __VLS_458;
    var __VLS_438;
}
if (__VLS_ctx.editingColumn.searchable) {
    const __VLS_463 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_464 = __VLS_asFunctionalComponent(__VLS_463, new __VLS_463({
        label: "搜索类型",
    }));
    const __VLS_465 = __VLS_464({
        label: "搜索类型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_464));
    __VLS_466.slots.default;
    const __VLS_467 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_468 = __VLS_asFunctionalComponent(__VLS_467, new __VLS_467({
        modelValue: (__VLS_ctx.editingColumn.searchType),
        placeholder: "请选择",
    }));
    const __VLS_469 = __VLS_468({
        modelValue: (__VLS_ctx.editingColumn.searchType),
        placeholder: "请选择",
    }, ...__VLS_functionalComponentArgsRest(__VLS_468));
    __VLS_470.slots.default;
    const __VLS_471 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_472 = __VLS_asFunctionalComponent(__VLS_471, new __VLS_471({
        label: "输入框",
        value: "input",
    }));
    const __VLS_473 = __VLS_472({
        label: "输入框",
        value: "input",
    }, ...__VLS_functionalComponentArgsRest(__VLS_472));
    const __VLS_475 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_476 = __VLS_asFunctionalComponent(__VLS_475, new __VLS_475({
        label: "下拉选择",
        value: "select",
    }));
    const __VLS_477 = __VLS_476({
        label: "下拉选择",
        value: "select",
    }, ...__VLS_functionalComponentArgsRest(__VLS_476));
    const __VLS_479 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_480 = __VLS_asFunctionalComponent(__VLS_479, new __VLS_479({
        label: "日期",
        value: "date",
    }));
    const __VLS_481 = __VLS_480({
        label: "日期",
        value: "date",
    }, ...__VLS_functionalComponentArgsRest(__VLS_480));
    const __VLS_483 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_484 = __VLS_asFunctionalComponent(__VLS_483, new __VLS_483({
        label: "日期范围",
        value: "daterange",
    }));
    const __VLS_485 = __VLS_484({
        label: "日期范围",
        value: "daterange",
    }, ...__VLS_functionalComponentArgsRest(__VLS_484));
    const __VLS_487 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_488 = __VLS_asFunctionalComponent(__VLS_487, new __VLS_487({
        label: "数字",
        value: "number",
    }));
    const __VLS_489 = __VLS_488({
        label: "数字",
        value: "number",
    }, ...__VLS_functionalComponentArgsRest(__VLS_488));
    var __VLS_470;
    var __VLS_466;
}
if (__VLS_ctx.editingColumn.searchable && __VLS_ctx.editingColumn.searchType === 'select') {
    const __VLS_491 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_492 = __VLS_asFunctionalComponent(__VLS_491, new __VLS_491({
        label: "搜索选项",
    }));
    const __VLS_493 = __VLS_492({
        label: "搜索选项",
    }, ...__VLS_functionalComponentArgsRest(__VLS_492));
    __VLS_494.slots.default;
    for (const [option, index] of __VLS_getVForSourceType((__VLS_ctx.editingColumn.searchOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ style: {} },
        });
        const __VLS_495 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_496 = __VLS_asFunctionalComponent(__VLS_495, new __VLS_495({
            modelValue: (option.label),
            placeholder: "标签",
            ...{ style: {} },
        }));
        const __VLS_497 = __VLS_496({
            modelValue: (option.label),
            placeholder: "标签",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_496));
        const __VLS_499 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_500 = __VLS_asFunctionalComponent(__VLS_499, new __VLS_499({
            modelValue: (option.value),
            placeholder: "值",
            ...{ style: {} },
        }));
        const __VLS_501 = __VLS_500({
            modelValue: (option.value),
            placeholder: "值",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_500));
        const __VLS_503 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_504 = __VLS_asFunctionalComponent(__VLS_503, new __VLS_503({
            ...{ 'onClick': {} },
            type: "danger",
            link: true,
        }));
        const __VLS_505 = __VLS_504({
            ...{ 'onClick': {} },
            type: "danger",
            link: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_504));
        let __VLS_507;
        let __VLS_508;
        let __VLS_509;
        const __VLS_510 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.editingColumn.searchable && __VLS_ctx.editingColumn.searchType === 'select'))
                    return;
                __VLS_ctx.handleRemoveSearchOption(index);
            }
        };
        __VLS_506.slots.default;
        var __VLS_506;
    }
    const __VLS_511 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_512 = __VLS_asFunctionalComponent(__VLS_511, new __VLS_511({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }));
    const __VLS_513 = __VLS_512({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_512));
    let __VLS_515;
    let __VLS_516;
    let __VLS_517;
    const __VLS_518 = {
        onClick: (__VLS_ctx.handleAddSearchOption)
    };
    __VLS_514.slots.default;
    var __VLS_514;
    var __VLS_494;
}
var __VLS_298;
{
    const { footer: __VLS_thisSlot } = __VLS_294.slots;
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_519 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
    }));
    const __VLS_520 = __VLS_519({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_519));
    let __VLS_522;
    let __VLS_523;
    let __VLS_524;
    const __VLS_525 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showColumnEditDialog = false;
        }
    };
    __VLS_521.slots.default;
    var __VLS_521;
    /** @type {[typeof BasicButton, typeof BasicButton, ]} */ ;
    // @ts-ignore
    const __VLS_526 = __VLS_asFunctionalComponent(BasicButton, new BasicButton({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_527 = __VLS_526({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_526));
    let __VLS_529;
    let __VLS_530;
    let __VLS_531;
    const __VLS_532 = {
        onClick: (__VLS_ctx.handleSaveColumn)
    };
    __VLS_528.slots.default;
    var __VLS_528;
}
var __VLS_294;
if (__VLS_ctx.showPager) {
    const __VLS_533 = {}.ElPagination;
    /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
    // @ts-ignore
    const __VLS_534 = __VLS_asFunctionalComponent(__VLS_533, new __VLS_533({
        ...{ 'onSizeChange': {} },
        ...{ 'onCurrentChange': {} },
        currentPage: (__VLS_ctx.pagination.page),
        pageSize: (__VLS_ctx.pagination.pageSize),
        total: (__VLS_ctx.pagination.total),
        pageSizes: ([10, 20, 50, 100]),
        layout: "total, sizes, prev, pager, next, jumper",
        ...{ class: "pagination" },
    }));
    const __VLS_535 = __VLS_534({
        ...{ 'onSizeChange': {} },
        ...{ 'onCurrentChange': {} },
        currentPage: (__VLS_ctx.pagination.page),
        pageSize: (__VLS_ctx.pagination.pageSize),
        total: (__VLS_ctx.pagination.total),
        pageSizes: ([10, 20, 50, 100]),
        layout: "total, sizes, prev, pager, next, jumper",
        ...{ class: "pagination" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_534));
    let __VLS_537;
    let __VLS_538;
    let __VLS_539;
    const __VLS_540 = {
        onSizeChange: (__VLS_ctx.handleSizeChange)
    };
    const __VLS_541 = {
        onCurrentChange: (__VLS_ctx.handlePageChange)
    };
    var __VLS_536;
}
/** @type {__VLS_StyleScopedClasses['basic-table']} */ ;
/** @type {__VLS_StyleScopedClasses['search-form']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['column-customize']} */ ;
/** @type {__VLS_StyleScopedClasses['column-customize-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination']} */ ;
// @ts-ignore
var __VLS_9 = __VLS_8, __VLS_112 = __VLS_111, __VLS_126 = __VLS_125, __VLS_137 = __VLS_136, __VLS_138 = __VLS_135, __VLS_141 = __VLS_140, __VLS_142 = __VLS_139, __VLS_162 = __VLS_161;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Plus: Plus,
            ArrowUp: ArrowUp,
            ArrowDown: ArrowDown,
            BasicButton: BasicButton,
            BasicModal: BasicModal,
            BasicSelect: BasicSelect,
            tableRef: tableRef,
            searchFormRef: searchFormRef,
            tableData: tableData,
            selectedRows: selectedRows,
            loading: loading,
            searchForm: searchForm,
            showColumnCustomizeDialog: showColumnCustomizeDialog,
            showColumnEditDialog: showColumnEditDialog,
            editingColumnIndex: editingColumnIndex,
            editingColumn: editingColumn,
            customizedColumns: customizedColumns,
            displayColumns: displayColumns,
            pagination: pagination,
            hasSearchableColumns: hasSearchableColumns,
            enableResizable: enableResizable,
            enableColumnDrag: enableColumnDrag,
            hasEditableColumns: hasEditableColumns,
            searchExpanded: searchExpanded,
            hasMoreSearchColumns: hasMoreSearchColumns,
            displayedSearchColumns: displayedSearchColumns,
            toggleSearchExpand: toggleSearchExpand,
            handleSearch: handleSearch,
            handleReset: handleReset,
            handlePageChange: handlePageChange,
            handleSizeChange: handleSizeChange,
            handleCheckboxChange: handleCheckboxChange,
            handleCheckboxAll: handleCheckboxAll,
            handleSortChange: handleSortChange,
            handleFilterChange: handleFilterChange,
            handleEditClosed: handleEditClosed,
            handleCreate: handleCreate,
            handleEdit: handleEdit,
            handleDelete: handleDelete,
            handleBatchDelete: handleBatchDelete,
            handleExport: handleExport,
            handleAddColumn: handleAddColumn,
            handleEditColumn: handleEditColumn,
            handleDeleteColumn: handleDeleteColumn,
            handleAddSearchOption: handleAddSearchOption,
            handleRemoveSearchOption: handleRemoveSearchOption,
            handleAddFilter: handleAddFilter,
            handleRemoveFilter: handleRemoveFilter,
            handleAddEditOption: handleAddEditOption,
            handleRemoveEditOption: handleRemoveEditOption,
            handleToggleFilterable: handleToggleFilterable,
            handleToggleEditable: handleToggleEditable,
            handleSaveColumn: handleSaveColumn,
            handleSaveColumns: handleSaveColumns,
            handleResetColumns: handleResetColumns,
            handleColumnDialogClose: handleColumnDialogClose,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
