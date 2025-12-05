import axios from 'axios';
class Request {
    constructor(config) {
        Object.defineProperty(this, "instance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.instance = axios.create({
            timeout: 10000,
            ...config
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        // 请求拦截器
        this.instance.interceptors.request.use((config) => {
            return config;
        }, (error) => {
            return Promise.reject(error);
        });
        // 响应拦截器：透传原始响应，交由上层处理（避免 code 限制）
        this.instance.interceptors.response.use((response) => {
            if (response.data instanceof Blob) {
                return response.data;
            }
            return response;
        }, (error) => {
            return Promise.reject(error);
        });
    }
    get(url, params) {
        return this.instance.get(url, { params });
    }
    post(url, data) {
        return this.instance.post(url, data);
    }
    put(url, data) {
        return this.instance.put(url, data);
    }
    delete(url, params) {
        return this.instance.delete(url, { params });
    }
    download(url, params) {
        return this.instance.get(url, { params, responseType: 'blob' });
    }
}
// 导出默认实例
export const request = new Request();
// 允许用户自定义axios实例
export const createRequest = (config) => {
    return new Request(config);
};
