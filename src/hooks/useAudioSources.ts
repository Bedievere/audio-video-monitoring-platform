import { useState, useEffect } from 'react'
import { AudioSource } from '../types'

interface UseAudioSourcesReturn {
  sources: AudioSource[]
  loading: boolean
  error?: string
  fetchSources: () => Promise<void>
  addSource: (source: Omit<AudioSource, 'id'>) => Promise<void>
  updateSource: (id: string, updates: Partial<AudioSource>) => Promise<void>
  deleteSource: (id: string) => Promise<void>
}

export function useAudioSources(): UseAudioSourcesReturn {
  const [sources, setSources] = useState<AudioSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const fetchSources = async (): Promise<void> => {
    setLoading(true)
    try {
      if (window.electronAPI?.sources) {
        const data = await window.electronAPI.sources.getAll()
        setSources(data)
        setError(undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取音视频源失败')
      setSources([])
    } finally {
      setLoading(false)
    }
  }

  const addSource = async (source: Omit<AudioSource, 'id'>): Promise<void> => {
    try {
      if (window.electronAPI?.sources) {
        const newSource = { ...source, id: Date.now().toString() }
        await window.electronAPI.sources.add(newSource)
        await fetchSources()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加音视频源失败')
      throw err
    }
  }

  const updateSource = async (id: string, updates: Partial<AudioSource>): Promise<void> => {
    try {
      if (window.electronAPI?.sources) {
        await window.electronAPI.sources.update(id, updates)
        await fetchSources()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新音视频源失败')
      throw err
    }
  }

  const deleteSource = async (id: string): Promise<void> => {
    try {
      if (window.electronAPI?.sources) {
        await window.electronAPI.sources.delete(id)
        await fetchSources()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除音视频源失败')
      throw err
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  return {
    sources,
    loading,
    error,
    fetchSources,
    addSource,
    updateSource,
    deleteSource
  }
}
