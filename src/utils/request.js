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
        // 响应拦截器
        this.instance.interceptors.response.use((response) => {
            const { data } = response;
            // 根据实际后端返回格式调整
            if (data && (data.code === 200 || data.code === 0)) {
                return data;
            }
            // 如果是Blob类型（下载），直接返回
            if (data instanceof Blob) {
                return data;
            }
            return Promise.reject(new Error(data?.message || '请求失败'));
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
