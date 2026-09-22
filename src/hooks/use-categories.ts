'use client'

import { useCallback } from 'react'
import { Category, Task } from '@/lib/types'

interface UseCategoriesOptions {
  categories: Category[]
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  setTodayTaskIds: React.Dispatch<React.SetStateAction<string[]>>
  selectedCategoryId: string | null
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useCategories({
  categories,
  setCategories,
  setTasks,
  setTodayTaskIds,
  selectedCategoryId,
  setSelectedCategoryId,
}: UseCategoriesOptions) {
  const handleAddCategory = useCallback(async (name: string) => {
    const color = `hsl(${Math.random() * 360}, 70%, 50%)`
    const order = categories.length
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, order }),
      })
      const newCategory = await res.json()
      setCategories((prev) => [...prev, newCategory])
    } catch (err) {
      console.error('Failed to create category:', err)
    }
  }, [categories.length, setCategories])

  const handleRemoveCategory = useCallback((categoryId: string) => {
    // Optimistic update
    setTasks((prev) => {
      const removedTaskIds = prev.filter((t) => t.categoryId === categoryId).map((t) => t.id)
      setTodayTaskIds((prevIds) => prevIds.filter((id) => !removedTaskIds.includes(id)))
      return prev.filter((t) => t.categoryId !== categoryId)
    })
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null)
    }
    // Persist (cascade deletes tasks in DB)
    fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })
      .catch((err) => console.error('Failed to delete category:', err))
  }, [setCategories, setTasks, setTodayTaskIds, selectedCategoryId, setSelectedCategoryId])

  const handleRenameCategory = useCallback((categoryId: string, newName: string) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, name: newName } : c))
    )
    // Persist
    fetch(`/api/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }).catch((err) => console.error('Failed to rename category:', err))
  }, [setCategories])

  const handleReorderCategories = useCallback((reorderedCategories: Category[]) => {
    // Optimistic update with new order values
    const updated = reorderedCategories.map((c, i) => ({ ...c, order: i }))
    setCategories(updated)
    // Persist each category's new order
    Promise.all(
      updated.map((c) =>
        fetch(`/api/categories/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: c.order }),
        })
      )
    ).catch((err) => console.error('Failed to reorder categories:', err))
  }, [setCategories])

  const handleCategoryColorChange = useCallback(async (id: string, color: string) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, color } : c))
    )
    // Persist to DB
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
    } catch (err) {
      console.error('Failed to update category color:', err)
    }
  }, [setCategories])

  return {
    handleAddCategory,
    handleRemoveCategory,
    handleRenameCategory,
    handleReorderCategories,
    handleCategoryColorChange,
  }
}
