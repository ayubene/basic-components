import { ref, onMounted, watch } from 'vue';
// 使用相对路径，避免依赖外部项目的 @ 别名配置
import { request } from '../../utils/request';
defineOptions({
    name: 'BasicSelect'
});
const props = withDefaults(defineProps(), {
    valueKey: 'value',
    labelKey: 'label',
    remote: false,
    multiple: false,
    clearable: true,
    filterable: true,
    disabled: false,
    size: 'default',
    placeholder: '请选择'
});
const emit = defineEmits();
const options = ref([]);
const loading = ref(false);
const searchKeyword = ref('');
// 获取字段映射
const getFieldMap = () => {
    return {
        value: props.fieldMap?.value || props.valueKey,
        label: props.fieldMap?.label || props.labelKey,
        disabled: props.fieldMap?.disabled || 'disabled'
    };
};
// 加载数据
const loadData = async (keyword) => {
    // 如果直接提供了options，不需要从URL加载
    if (props.options && Array.isArray(props.options)) {
        options.value = props.options;
        return;
    }
    if (!props.listUrl) {
        return;
    }
    try {
        loading.value = true;
        const params = {
            ...props.requestParams
        };
        if (props.remote && keyword !== undefined) {
            params.keyword = keyword;
            params.search = keyword;
        }
        const response = await request.get(props.listUrl, params);
        let data = response.data;
        // 如果是数组，直接使用；如果是对象，尝试获取列表字段
        if (!Array.isArray(data)) {
            data = data.list || data.data || data.items || [];
        }
        // 数据转换
        if (props.transform) {
            options.value = props.transform(data);
        }
        else {
            const fieldMap = getFieldMap();
            options.value = data.map((item) => ({
                label: item[fieldMap.label],
                value: item[fieldMap.value],
                disabled: item[fieldMap.disabled] || false
            }));
        }
    }
    catch (error) {
        console.error('Load select data error:', error);
        options.value = [];
    }
    finally {
        loading.value = false;
    }
};
// 远程搜索
const handleRemoteSearch = (query) => {
    searchKeyword.value = query;
    loadData(query);
};
// 值变化处理
const handleChange = (value) => {
    emit('update:modelValue', value);
    emit('change', value);
};
// 初始化加载
onMounted(() => {
    // 如果直接提供了options，直接使用
    if (props.options && Array.isArray(props.options)) {
        options.value = props.options;
        return;
    }
    // 如果有listUrl，从URL加载
    if (props.listUrl && !props.remote) {
        loadData();
    }
});
// 监听modelValue变化，用于回显
watch(() => props.modelValue, (newVal) => {
    // 如果直接提供了options，不需要加载
    if (props.options && Array.isArray(props.options)) {
        return;
    }
    if (newVal && options.value.length === 0 && !props.remote && props.listUrl) {
        loadData();
    }
}, { immediate: true });
// 监听options prop变化
watch(() => props.options, (newOptions) => {
    if (newOptions && Array.isArray(newOptions)) {
        options.value = newOptions;
    }
}, { immediate: true, deep: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    valueKey: 'value',
    labelKey: 'label',
    remote: false,
    multiple: false,
    clearable: true,
    filterable: true,
    disabled: false,
    size: 'default',
    placeholder: '请选择'
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.modelValue),
    placeholder: (__VLS_ctx.placeholder),
    multiple: (__VLS_ctx.multiple),
    clearable: (__VLS_ctx.clearable),
    filterable: (__VLS_ctx.filterable),
    disabled: (__VLS_ctx.disabled),
    size: (__VLS_ctx.size),
    loading: (__VLS_ctx.loading),
    remote: (__VLS_ctx.remote),
    remoteMethod: (__VLS_ctx.remote ? __VLS_ctx.handleRemoteSearch : undefined),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.modelValue),
    placeholder: (__VLS_ctx.placeholder),
    multiple: (__VLS_ctx.multiple),
    clearable: (__VLS_ctx.clearable),
    filterable: (__VLS_ctx.filterable),
    disabled: (__VLS_ctx.disabled),
    size: (__VLS_ctx.size),
    loading: (__VLS_ctx.loading),
    remote: (__VLS_ctx.remote),
    remoteMethod: (__VLS_ctx.remote ? __VLS_ctx.handleRemoteSearch : undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    'onUpdate:modelValue': (__VLS_ctx.handleChange)
};
var __VLS_8 = {};
__VLS_3.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.options))) {
    const __VLS_9 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
        key: (item[__VLS_ctx.valueKey]),
        label: (item[__VLS_ctx.labelKey]),
        value: (item[__VLS_ctx.valueKey]),
        disabled: (item.disabled),
    }));
    const __VLS_11 = __VLS_10({
        key: (item[__VLS_ctx.valueKey]),
        label: (item[__VLS_ctx.labelKey]),
        value: (item[__VLS_ctx.valueKey]),
        disabled: (item.disabled),
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
}
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            options: options,
            loading: loading,
            handleRemoteSearch: handleRemoteSearch,
            handleChange: handleChange,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
