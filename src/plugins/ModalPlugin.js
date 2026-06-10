import { createApp, ref } from 'vue';
import CustomModal from '@/components/CustomModal.vue';

export default {
    install() {
        const modal = ref(null);

        const mountModal = () => {
            if (!modal.value) {
                const ModalComponent = createApp(CustomModal);
                const div = document.createElement('div');
                document.body.appendChild(div);
                modal.value = ModalComponent.mount(div);
            }
        };

        const customAlert = (message, options) => {
            mountModal();
            return modal.value.customAlert(message, options);
        };

        const customConfirm = (message, options) => {
            mountModal();
            return modal.value.customConfirm(message, options);
        };

        const customPrompt = (message, defaultValue = '', options) => {
            mountModal();
            return modal.value.customPrompt(message, defaultValue, options);
        };

        const showLoading = () => {
            mountModal();
            modal.value.showCustomLoading();
        };

        const hideLoading = () => {
            mountModal();
            modal.value.hideCustomLoading();
        };
        window.$modal = {
            alert: customAlert,
            confirm: customConfirm,
            prompt: customPrompt,
            showLoading,
            hideLoading,
        };
    },
};
