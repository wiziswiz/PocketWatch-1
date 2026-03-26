"use client"

import { PasswordChangeSection } from "@/components/settings/password-change-section"
import { PasskeySection } from "@/components/settings/passkey-section"
import { NotificationSettings } from "@/components/finance/settings/notification-settings"
import { AutoLockSetting } from "@/components/finance/settings/auto-lock-setting"
import { BackupSection } from "@/components/finance/settings/backup-section"
import { CollapsibleSection } from "@/components/settings/collapsible-section"

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Security, notifications, and app preferences
        </p>
      </div>

      {/* Security */}
      <PasswordChangeSection />
      <PasskeySection />

      {/* App Preferences */}
      <CollapsibleSection
        title="Auto-Lock"
        subtitle="Lock the app after inactivity"
        defaultOpen
      >
        <AutoLockSetting />
      </CollapsibleSection>

      {/* Notifications */}
      <CollapsibleSection
        title="Notifications"
        subtitle="Push notifications, Telegram, and alert channels"
        defaultOpen
      >
        <NotificationSettings />
      </CollapsibleSection>

      {/* Backup & Restore */}
      <CollapsibleSection
        title="Backup & Restore"
        subtitle="Export or import your encrypted vault"
        defaultOpen
      >
        <BackupSection />
      </CollapsibleSection>
    </div>
  )
}
