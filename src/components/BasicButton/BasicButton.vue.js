import { ref, computed } from 'vue';
defineOptions({
    name: 'BasicButton'
});
const props = withDefaults(defineProps(), {
    type: 'default',
    size: 'default',
    loading: false,
    disabled: false,
    autoloading: true,
    circle: false,
    round: false,
    plain: false
});
const emit = defineEmits();
const internalLoading = ref(false);
const computedLoading = computed(() => {
    return props.loading || internalLoading.value;
});
const handleClick = async (event) => {
    emit('click', event);
    if (!props.autoloading || !props.onClick) {
        return;
    }
    try {
        internalLoading.value = true;
        const result = props.onClick(event);
        // 如果是Promise，等待完成
        if (result && typeof result.then === 'function') {
            await result;
        }
    }
    catch (error) {
        console.error('Button click error:', error);
    }
    finally {
        internalLoading.value = false;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    type: 'default',
    size: 'default',
    loading: false,
    disabled: false,
    autoloading: true,
    circle: false,
    round: false,
    plain: false
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.type),
    size: (__VLS_ctx.size),
    loading: (__VLS_ctx.computedLoading),
    disabled: (__VLS_ctx.disabled || __VLS_ctx.computedLoading),
    icon: (__VLS_ctx.icon),
    circle: (__VLS_ctx.circle),
    round: (__VLS_ctx.round),
    plain: (__VLS_ctx.plain),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.type),
    size: (__VLS_ctx.size),
    loading: (__VLS_ctx.computedLoading),
    disabled: (__VLS_ctx.disabled || __VLS_ctx.computedLoading),
    icon: (__VLS_ctx.icon),
    circle: (__VLS_ctx.circle),
    round: (__VLS_ctx.round),
    plain: (__VLS_ctx.plain),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.handleClick)
};
var __VLS_8 = {};
__VLS_3.slots.default;
var __VLS_9 = {};
var __VLS_3;
// @ts-ignore
var __VLS_10 = __VLS_9;
[__VLS_dollars.$attrs,];
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            computedLoading: computedLoading,
            handleClick: handleClick,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
