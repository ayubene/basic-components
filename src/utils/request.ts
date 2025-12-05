import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios'

export interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
  [key: string]: any
}

class Request {
  private instance: AxiosInstance

  constructor(config?: AxiosRequestConfig) {
    this.instance = axios.create({
      timeout: 10000,
      ...config
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        return config
      },
      (error: any) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response
        // 根据实际后端返回格式调整
        if (data && (data.code === 200 || data.code === 0)) {
          return data
        }
        // 如果是Blob类型（下载），直接返回
        if (data instanceof Blob) {
          return data as any
        }
        return Promise.reject(new Error((data as any)?.message || '请求失败'))
      },
      (error: any) => {
        return Promise.reject(error)
      }
    )
  }

  public get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.instance.get(url, { params })
  }

  public post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.instance.post(url, data)
  }

  public put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.instance.put(url, data)
  }

  public delete<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.instance.delete(url, { params })
  }

  public download(url: string, params?: any): Promise<Blob> {
    return this.instance.get(url, { params, responseType: 'blob' })
  }
}

// 导出默认实例
export const request = new Request()

// 允许用户自定义axios实例
export const createRequest = (config?: AxiosRequestConfig) => {
  return new Request(config)
}

