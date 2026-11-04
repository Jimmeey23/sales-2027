import React, { useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';

export function SectionHead({
  icon: Icon,
  title,
  hint,
  editable = false,
  onTitleChange,
  onHintChange,
  actions,
  onDelete,
  editOn = false,
  canEdit = false,
  onToggleEdit,
}: {
  icon: any;
  title: React.ReactNode;
  hint?: React.ReactNode;
  editable?: boolean;
  onTitleChange?: (next: string) => void;
  onHintChange?: (next: string) => void;
  actions?: React.ReactNode;
  onDelete?: () => void;
  /** This section's own edit mode. */
  editOn?: boolean;
  canEdit?: boolean;
  onToggleEdit?: () => void;
}) {
  // A section reads as a heading until someone asks to rename it: the pencil is the door,
  // not a permanent pair of text boxes sitting in the header.
  const [renaming, setRenaming] = useState(false);
  const canRename = editable && Boolean(onTitleChange) && typeof title === 'string';
  const showActions =
    Boolean(actions) || (editable && Boolean(onDelete)) || canRename || (canEdit && Boolean(onToggleEdit));
  return (
    <header className={`mw-sh${showActions ? ' has-actions' : ''}${renaming ? ' is-renaming' : ''}`}>
      <span className="mw-sh-icon">
        <Icon size={16} />
      </span>
      <div className="mw-sh-copy">
        {canRename && renaming ? (
          <input
            className="mw-sh-title-in"
            aria-label="Section title"
            autoFocus
            value={title as string}
            onChange={e => onTitleChange!(e.target.value)}
            onBlur={() => setRenaming(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <h4>{title}</h4>
        )}
        {canRename && renaming && onHintChange && (typeof hint === 'string' || hint === undefined) ? (
          <input
            className="mw-sh-hint-in"
            aria-label="Section subtitle"
            placeholder="Section description…"
            value={hint || ''}
            onChange={e => onHintChange(e.target.value)}
          />
        ) : (
          hint && <p>{hint}</p>
        )}
      </div>
      {showActions && (
        <div className="mw-sh-actions">
          {canEdit && onToggleEdit && (
            <button
              type="button"
              className={`mw-sh-edit${editOn ? ' is-on' : ''}`}
              aria-pressed={editOn}
              title={
                editOn ? `Done editing ${typeof title === 'string' ? title : 'this section'}` : 'Edit this section'
              }
              aria-label={editOn ? 'Done editing this section' : 'Edit this section'}
              onClick={onToggleEdit}
            >
              {editOn ? <Check size={13} /> : <Pencil size={13} />}
              <span>{editOn ? 'Done' : 'Edit'}</span>
            </button>
          )}
          {actions}
          {canRename && (
            <button
              type="button"
              className={`mw-mini-icon mw-sh-rename${renaming ? ' is-on' : ''}`}
              title={renaming ? 'Done renaming' : 'Rename this section'}
              aria-label={renaming ? 'Done renaming section' : 'Rename this section'}
              aria-pressed={renaming}
              onClick={() => setRenaming(v => !v)}
            >
              <Pencil size={12.5} />
            </button>
          )}
          {editable && onDelete && (
            <button
              type="button"
              className="mw-mini-icon is-danger"
              title="Delete section from this month"
              aria-label={`Delete ${typeof title === 'string' ? title : 'section'}`}
              onClick={onDelete}
            >
              <Trash2 size={13.5} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
