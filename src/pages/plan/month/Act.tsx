import { Trash2 } from 'lucide-react';

export function Act({
  icon: Icon,
  label,
  title,
  text,
  tone,
  editable = false,
  labelEditable = false,
  onChange,
  onRemove,
}: any) {
  return (
    <div className={`mw-act mw-act-${tone}`}>
      <Icon size={15} />
      <div>
        {editable && labelEditable ? (
          <input
            className="mw-act-label"
            aria-label="Activation type"
            value={label}
            onChange={e => onChange({ label: e.target.value })}
          />
        ) : (
          <small>{label}</small>
        )}
        {editable ? (
          <div className="mw-act-edit">
            <input
              aria-label={`${label} title`}
              placeholder="Title"
              value={title}
              onChange={e => onChange({ title: e.target.value, text })}
            />
            <textarea
              aria-label={`${label} details`}
              placeholder="Mechanics, dates, owner"
              rows={3}
              value={text}
              onChange={e => onChange({ title, text: e.target.value })}
            />
          </div>
        ) : (
          <>
            <strong>{title}</strong>
            <p>{text}</p>
          </>
        )}
      </div>
      {editable && onRemove && (
        <button
          type="button"
          className="mw-act-remove"
          aria-label={`Remove ${label}`}
          title="Remove activation"
          onClick={onRemove}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
