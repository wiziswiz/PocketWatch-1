"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DirEntry { name: string }

interface BrowseResult {
  current: string
  parent: string | null
  dirs: DirEntry[]
  notFound?: boolean
}

interface BackupDirectoryPickerProps {
  initialPath: string
  onSelect: (path: string) => void
  onClose: () => void
}

export function BackupDirectoryPicker({ initialPath, onSelect, onClose }: BackupDirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [dirs, setDirs] = useState<DirEntry[]>([])
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [showNewFolder, setShowNewFolder] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const fetchDirs = useCallback(async (path: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/backup/browse-dirs?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error("Failed to browse")
      const data: BrowseResult = await res.json()
      setCurrentPath(data.current)
      setParentPath(data.parent)
      setDirs(data.dirs)
      setNotFound(!!data.notFound)
    } catch {
      setDirs([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchDirs(initialPath) }, [initialPath, fetchDirs])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  const navigateTo = (path: string) => {
    setShowNewFolder(false)
    setNewFolderName("")
    fetchDirs(path)
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    const newPath = currentPath === "~" ? `~/${name}` : `${currentPath}/${name}`
    try {
      const res = await fetch(`/api/backup/browse-dirs?path=${encodeURIComponent(newPath)}&create=true`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Failed to create folder" }))
        toast.error(data.message ?? "Failed to create folder")
        return
      }
      setShowNewFolder(false)
      setNewFolderName("")
      fetchDirs(currentPath)
    } catch {
      toast.error("Failed to create folder")
    }
  }

  const breadcrumbs = currentPath.split("/").filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-card-border flex-shrink-0">
          <p className="text-xs text-foreground-muted mb-1">Select backup folder</p>
          <div className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-hide">
            {breadcrumbs.map((seg, i) => {
              const path = breadcrumbs.slice(0, i + 1).join("/")
              return (
                <span key={i} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && <span className="text-foreground-muted">/</span>}
                  <button
                    onClick={() => navigateTo(path)}
                    className="text-primary hover:underline whitespace-nowrap"
                  >
                    {seg}
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-foreground-muted">Loading...</div>
          ) : (
            <div className="py-1">
              {parentPath && (
                <button
                  onClick={() => navigateTo(parentPath)}
                  className="w-full px-4 py-2 flex items-center gap-2 text-sm text-foreground-muted hover:bg-background-secondary transition-colors"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_upward</span>
                  ..
                </button>
              )}
              {dirs.map((dir) => (
                <button
                  key={dir.name}
                  onClick={() => navigateTo(currentPath === "~" ? `~/${dir.name}` : `${currentPath}/${dir.name}`)}
                  className="w-full px-4 py-2 flex items-center gap-2 text-sm text-foreground hover:bg-background-secondary transition-colors"
                >
                  <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 18 }}>folder</span>
                  {dir.name}
                </button>
              ))}
              {!dirs.length && !parentPath && (
                <p className="px-4 py-6 text-center text-sm text-foreground-muted">No subdirectories</p>
              )}
              {notFound && (
                <p className="px-4 py-2 text-xs text-warning">This directory doesn&apos;t exist yet — it will be created automatically.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-card-border flex-shrink-0 space-y-2">
          {showNewFolder ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder="Folder name"
                autoFocus
                className="flex-1 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg outline-none focus:border-primary"
              />
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="px-2 py-1.5 text-xs font-medium bg-primary text-white rounded-lg disabled:opacity-50">
                Create
              </button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName("") }} className="px-2 py-1.5 text-xs text-foreground-muted">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>create_new_folder</span>
                New Folder
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground">
                  Cancel
                </button>
                <button
                  onClick={() => onSelect(currentPath)}
                  className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", "bg-primary text-white hover:bg-primary-hover")}
                >
                  Select This Folder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
