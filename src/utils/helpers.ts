export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function validateUrl(url: string, protocol?: string): { valid: boolean; message: string } {
  if (!url || url.trim() === '') {
    return { valid: false, message: 'URL不能为空' }
  }

  try {
    const urlObj = new URL(url)

    if (protocol) {
      const normalizedProtocol = protocol.toLowerCase()
      let urlProtocol = urlObj.protocol.toLowerCase()

      // 移除冒号
      if (urlProtocol.endsWith(':')) {
        urlProtocol = urlProtocol.slice(0, -1)
      }

      if (urlProtocol !== normalizedProtocol.toLowerCase()) {
        return { valid: false, message: `URL协议必须是${protocol}` }
      }
    }

    // 检查主机名
    if (!urlObj.hostname) {
      return { valid: false, message: 'URL格式无效' }
    }

    return { valid: true, message: '' }
  } catch {
    return { valid: false, message: 'URL格式无效' }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
