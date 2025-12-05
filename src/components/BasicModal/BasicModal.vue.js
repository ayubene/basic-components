defineOptions({
    name: 'BasicModal'
});
const props = withDefaults(defineProps(), {
    title: '',
    width: '50%',
    closeOnClickModal: true,
    closeOnPressEscape: true,
    showClose: true,
    appendToBody: false,
    destroyOnClose: false
});
const emit = defineEmits();
const handleUpdate = (value) => {
    emit('update:modelValue', value);
    if (value) {
        emit('opened');
    }
    else {
        emit('closed');
    }
};
const handleClose = () => {
    emit('close');
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    title: '',
    width: '50%',
    closeOnClickModal: true,
    closeOnPressEscape: true,
    showClose: true,
    appendToBody: false,
    destroyOnClose: false
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onUpdate:modelValue': {} },
    ...{ 'onClose': {} },
    modelValue: (__VLS_ctx.modelValue),
    title: (__VLS_ctx.title),
    width: (__VLS_ctx.width),
    closeOnClickModal: (__VLS_ctx.closeOnClickModal),
    closeOnPressEscape: (__VLS_ctx.closeOnPressEscape),
    showClose: (__VLS_ctx.showClose),
    appendToBody: (__VLS_ctx.appendToBody),
    destroyOnClose: (__VLS_ctx.destroyOnClose),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onUpdate:modelValue': {} },
    ...{ 'onClose': {} },
    modelValue: (__VLS_ctx.modelValue),
    title: (__VLS_ctx.title),
    width: (__VLS_ctx.width),
    closeOnClickModal: (__VLS_ctx.closeOnClickModal),
    closeOnPressEscape: (__VLS_ctx.closeOnPressEscape),
    showClose: (__VLS_ctx.showClose),
    appendToBody: (__VLS_ctx.appendToBody),
    destroyOnClose: (__VLS_ctx.destroyOnClose),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    'onUpdate:modelValue': (__VLS_ctx.handleUpdate)
};
const __VLS_8 = {
    onClose: (__VLS_ctx.handleClose)
};
var __VLS_9 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-content" },
});
var __VLS_10 = {};
if (__VLS_ctx.$slots.footer) {
    {
        const { footer: __VLS_thisSlot } = __VLS_3.slots;
        var __VLS_12 = {};
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
// @ts-ignore
var __VLS_11 = __VLS_10, __VLS_13 = __VLS_12;
[__VLS_dollars.$attrs,];
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            handleUpdate: handleUpdate,
            handleClose: handleClose,
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
