'use client'

/**
 * Client-Side Settings Management
 * React hook for settings management in client components
 */

import { useState, useEffect } from 'react'
import {
  AppSettings,
  UserSettings,
  ProjectSettings,
  SystemSettings,
  defaultUserSettings,
  defaultProjectSettings,
  defaultSystemSettings,
} from './settings-server'

// Settings validation schemas
const userSettingsSchema = {
  theme: (value: any): value is UserSettings['theme'] =>
    ['light', 'dark', 'system'].includes(value),
  language: (value: any): value is UserSettings['language'] => ['en', 'en-NZ'].includes(value),
  currency: (value: any): value is UserSettings['currency'] =>
    ['NZD', 'USD', 'AUD'].includes(value),
  dateFormat: (value: any): value is UserSettings['dateFormat'] =>
    ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(value),
}

// Settings Manager Class (Client-Side Only)
export class SettingsManager {
  private settings: AppSettings
  private readonly STORAGE_KEY = 'buildtrack_settings'

  constructor() {
    this.settings = this.loadSettings()
  }

  // Load settings from localStorage with fallback to defaults
  private loadSettings(): AppSettings {
    if (typeof window === 'undefined') {
      return {
        user: defaultUserSettings,
        project: defaultProjectSettings,
        system: defaultSystemSettings,
      }
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return this.mergeWithDefaults(parsed)
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error)
    }

    return {
      user: defaultUserSettings,
      project: defaultProjectSettings,
      system: defaultSystemSettings,
    }
  }

  // Merge stored settings with defaults to handle new settings
  private mergeWithDefaults(stored: Partial<AppSettings>): AppSettings {
    return {
      user: { ...defaultUserSettings, ...stored.user },
      project: { ...defaultProjectSettings, ...stored.project },
      system: { ...defaultSystemSettings, ...stored.system },
    }
  }

  // Save settings to localStorage
  private saveSettings(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings))
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error)
    }
  }

  // Get all settings
  getSettings(): AppSettings {
    return this.settings
  }

  // Get specific setting category
  getUserSettings(): UserSettings {
    return this.settings.user
  }

  getProjectSettings(): ProjectSettings {
    return this.settings.project
  }

  getSystemSettings(): SystemSettings {
    return this.settings.system
  }

  // Update user settings
  updateUserSettings(updates: Partial<UserSettings>): void {
    this.settings.user = { ...this.settings.user, ...updates }
    this.saveSettings()
  }

  // Update project settings
  updateProjectSettings(updates: Partial<ProjectSettings>): void {
    this.settings.project = { ...this.settings.project, ...updates }
    this.saveSettings()
  }

  // Update system settings
  updateSystemSettings(updates: Partial<SystemSettings>): void {
    this.settings.system = { ...this.settings.system, ...updates }
    this.saveSettings()
  }

  // Validate and update specific setting
  updateSetting<K extends keyof UserSettings>(
    category: 'user',
    key: K,
    value: UserSettings[K]
  ): boolean
  updateSetting<K extends keyof ProjectSettings>(
    category: 'project',
    key: K,
    value: ProjectSettings[K]
  ): boolean
  updateSetting<K extends keyof SystemSettings>(
    category: 'system',
    key: K,
    value: SystemSettings[K]
  ): boolean
  updateSetting(category: keyof AppSettings, key: string, value: any): boolean {
    try {
      // Validate the setting if validation exists
      if (category === 'user' && key in userSettingsSchema) {
        const validator = userSettingsSchema[key as keyof typeof userSettingsSchema]
        if (!validator(value)) {
          console.error(`Invalid value for ${category}.${key}:`, value)
          return false
        }
      }

      this.settings[category] = { ...this.settings[category], [key]: value }
      this.saveSettings()
      return true
    } catch (error) {
      console.error(`Failed to update ${category}.${key}:`, error)
      return false
    }
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.settings = {
      user: defaultUserSettings,
      project: defaultProjectSettings,
      system: defaultSystemSettings,
    }
    this.saveSettings()
  }

  // Export settings
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2)
  }

  // Import settings
  importSettings(settingsJson: string): boolean {
    try {
      const imported = JSON.parse(settingsJson)
      this.settings = this.mergeWithDefaults(imported)
      this.saveSettings()
      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }

  // Subscribe to settings changes
  private listeners: Array<(settings: AppSettings) => void> = []

  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Notify listeners of changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings))
  }
}

// Global settings instance
export const settingsManager = new SettingsManager()

// React hook for settings
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(settingsManager.getSettings())

  useEffect(() => {
    const unsubscribe = settingsManager.subscribe(setSettings)
    return unsubscribe
  }, [])

  return {
    settings,
    userSettings: settings.user,
    projectSettings: settings.project,
    systemSettings: settings.system,
    updateUserSettings: settingsManager.updateUserSettings.bind(settingsManager),
    updateProjectSettings: settingsManager.updateProjectSettings.bind(settingsManager),
    updateSystemSettings: settingsManager.updateSystemSettings.bind(settingsManager),
    resetToDefaults: settingsManager.resetToDefaults.bind(settingsManager),
  }
}