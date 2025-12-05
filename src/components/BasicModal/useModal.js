import { ref } from 'vue';
/**
 * Modal Hooks
 * 用于统一管理Modal的显示/隐藏状态
 */
export function useModal(initialVisible = false) {
    const visible = ref(initialVisible);
    const open = () => {
        visible.value = true;
    };
    const close = () => {
        visible.value = false;
    };
    const toggle = () => {
        visible.value = !visible.value;
    };
    return {
        visible,
        open,
        close,
        toggle
    };
}
