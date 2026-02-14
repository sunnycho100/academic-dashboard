'use client'

import { Category, Task } from './types'

// Sample data for preview
const initialCategories: Category[] = [
  { id: '1', name: 'COMPSCI400', color: 'hsl(210, 100%, 50%)', order: 0 },
  { id: '2', name: 'COMPSCI354', color: 'hsl(160, 70%, 45%)', order: 1 },
  { id: '3', name: 'MATH340', color: 'hsl(30, 90%, 55%)', order: 2 },
]

const now = new Date()
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
const elevenDaysAgo = new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000) // Feb 3, 2026 (Tuesday)
const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

const initialTasks: Task[] = [
  {
    id: '1',
    categoryId: '1',
    title: 'Watch Lecture 12: Binary Search Trees',
    type: 'Lecture',
    dueAt: twoDaysAgo.toISOString(),
    status: 'todo',
    priorityOrder: 0,
    notes: 'Review the balanced tree operations',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    categoryId: '1',
    title: 'Complete Programming Assignment 3',
    type: 'Assignment',
    dueAt: fiveDaysAgo.toISOString(),
    status: 'todo',
    priorityOrder: 1,
    notes: 'Implement AVL tree rotations',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    categoryId: '2',
    title: 'Discussion 8: Operating System Concepts',
    type: 'Discussion',
    dueAt: twoDaysAgo.toISOString(),
    status: 'todo',
    priorityOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    categoryId: '1',
    title: 'Lab 6: Hash Tables',
    type: 'Lab',
    dueAt: tomorrow.toISOString(),
    status: 'todo',
    priorityOrder: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    categoryId: '2',
    title: 'Review for Midterm 2',
    type: 'Exam Prep',
    dueAt: threeDaysFromNow.toISOString(),
    status: 'todo',
    priorityOrder: 4,
    notes: 'Focus on memory management and scheduling',
    createdAt: new Date().toISOString(),
  },
  {
    id: '6',
    categoryId: '3',
    title: 'Problem Set 5',
    type: 'Assignment',
    dueAt: threeDaysFromNow.toISOString(),
    status: 'todo',
    priorityOrder: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: '7',
    categoryId: '2',
    title: 'Lab 4: Process Synchronization',
    type: 'Lab',
    dueAt: fiveDaysAgo.toISOString(),
    status: 'done',
    priorityOrder: 6,
    createdAt: new Date().toISOString(),
  },
  {
    id: '8',
    categoryId: '3',
    title: 'Watch Lecture 14: Linear Algebra Applications',
    type: 'Lecture',
    dueAt: tomorrow.toISOString(),
    status: 'todo',
    priorityOrder: 7,
    createdAt: new Date().toISOString(),
  },
  {
    id: '9',
    categoryId: '2',
    title: '2/3 TUE Lecture: Memory Management',
    type: 'Lecture',
    dueAt: elevenDaysAgo.toISOString(),
    status: 'done',
    priorityOrder: 8,
    actualTimeSpent: 88, // 1H 28M
    estimatedDuration: 90,
    notes: 'Completed with deep work timer - covered virtual memory and paging',
    createdAt: elevenDaysAgo.toISOString(),
  },
]

const STORAGE_KEY = 'class-catchup-data'

export interface AppState {
  categories: Category[]
  tasks: Task[]
}

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return { categories: initialCategories, tasks: initialTasks }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load state:', error)
  }
  
  return { categories: initialCategories, tasks: initialTasks }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save state:', error)
  }
}
